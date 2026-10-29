"""AI Bharat Mentor - Backend (Python + Flask)

Features: signup/login, OTP login, Google login, forgot/reset password,

per-user data sync, AI chat (Ollama), account delete.  Database: MySQL.

Chalane ke liye:  pip install -r requirements.txt   phir   python server.py

"""

import hashlib

import json

import os

import re

import secrets

import threading

import time

import uuid

from contextlib import contextmanager

from functools import wraps

from pathlib import Path



import bcrypt

import jwt

import pymysql

import requests

from dotenv import load_dotenv

from flask import Flask, g, jsonify, request, send_from_directory

from werkzeug.exceptions import HTTPException



try:

    import brain            # optional: pehle se likhe jawab (tez). Na ho to bhi chalega.

except ImportError:

    brain = None



BASE = Path(__file__).parent

load_dotenv(BASE / ".env")

PORT = int(os.getenv("PORT", "5000"))

PROD = os.getenv("APP_ENV", "development").lower() == "production"

SECRET = os.getenv("JWT_SECRET") or "dev-secret-change-me"

GUEST_CHAT = os.getenv("GUEST_CHAT", "1") == "1"   # 1 = bina login ke bhi chat chalega. Live karte waqt 0 karo

CORS_ORIGIN = os.getenv("CORS_ORIGIN", "")     # frontend alag port/site par ho tabhi bharo

if not os.getenv("JWT_SECRET"):

    print("⚠️  .env mein JWT_SECRET set karo (live karne se pehle zaroor)")

if PROD and len(SECRET) < 24:

    raise SystemExit("JWT_SECRET kam se kam 24 characters ka rakho")



app = Flask(__name__, static_folder=None)



# Optional extras: file na ho to server phir bhi chalta hai

for _name, _what in (("prod", "live safety layer"), ("library", "Study Library")):

    try:

        __import__(_name).apply(app, globals())

    except ModuleNotFoundError as _e:

        if _e.name != _name:

            raise

        print(f"ℹ️  {_name}.py nahi mili ({_what} band hai)")





class ApiError(Exception):

    def __init__(self, msg, status=400):

        super().__init__(msg)

        self.msg, self.status = msg, status





# ---------- MySQL database ----------

_lock = threading.RLock()

MYSQL_DB = os.getenv("MYSQL_DB", "ai_bharat")

if not re.fullmatch(r"[A-Za-z0-9_]+", MYSQL_DB):

    raise SystemExit("MYSQL_DB me sirf akshar, number aur _ hona chahiye")

MYSQL = dict(host=os.getenv("MYSQL_HOST", "127.0.0.1"), port=int(os.getenv("MYSQL_PORT", "3306")),

             user=os.getenv("MYSQL_USER", "root"), password=os.getenv("MYSQL_PASSWORD", ""),

             charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor, connect_timeout=5)





@contextmanager

def dbc():

    """MySQL connection: kaam poora hone par commit, galti par rollback, aakhir me band."""

    conn = pymysql.connect(database=MYSQL_DB, **MYSQL)

    try:

        yield conn

        conn.commit()

    except Exception:

        conn.rollback()

        raise

    finally:

        conn.close()





def init_db():

    """Database aur users table khud bana deta hai (pehli baar)."""

    try:

        c = pymysql.connect(**MYSQL)

        with c.cursor() as cur:

            cur.execute(f"CREATE DATABASE IF NOT EXISTS `{MYSQL_DB}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")

        c.commit()

        c.close()

        with dbc() as conn, conn.cursor() as cur:

            cur.execute("""CREATE TABLE IF NOT EXISTS users (

                id CHAR(36) PRIMARY KEY,

                email VARCHAR(255) NULL UNIQUE,

                phone VARCHAR(20) NULL UNIQUE,

                name VARCHAR(100) NOT NULL DEFAULT '',

                pass_hash VARCHAR(100) NULL,

                state LONGTEXT NULL,

                chat LONGTEXT NULL,

                created_at BIGINT NOT NULL

            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""")

        print(f"🗄️  MySQL connected: {MYSQL['host']}:{MYSQL['port']}  database={MYSQL_DB}")

    except pymysql.err.MySQLError as e:

        raise SystemExit(f"❌ MySQL se connect nahi ho paya: {e}\n"

                         "   -> MySQL chalu hai? .env me MYSQL_HOST / MYSQL_USER / MYSQL_PASSWORD sahi hain?")





def _json(x, default):

    try:

        v = json.loads(x) if x else default

        return v if isinstance(v, type(default)) else default

    except ValueError:

        return default





def row_to_user(r):

    if not r:

        return None

    return {"id": r["id"], "email": r["email"], "phone": r["phone"], "name": r["name"] or "",

            "passHash": r["pass_hash"], "state": _json(r["state"], {}), "chat": _json(r["chat"], []),

            "createdAt": r["created_at"]}





def find_by(key, value):

    if not value or key not in ("id", "email", "phone"):

        return None

    with dbc() as c, c.cursor() as cur:

        cur.execute(f"SELECT * FROM users WHERE {key}=%s LIMIT 1", (value,))

        return row_to_user(cur.fetchone())





def new_user(email=None, phone=None, name="", pass_hash=None):

    u = {"id": str(uuid.uuid4()), "email": email, "phone": phone, "name": name,

         "passHash": pass_hash, "state": {}, "chat": [], "createdAt": int(time.time() * 1000)}

    try:

        with dbc() as c, c.cursor() as cur:

            cur.execute("INSERT INTO users (id, email, phone, name, pass_hash, state, chat, created_at) "

                        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",

                        (u["id"], email, phone, name, pass_hash, "{}", "[]", u["createdAt"]))

    except pymysql.err.IntegrityError:

        raise ApiError("Account already exists, please log in", 409)

    return u





_COLS = {"state": lambda u: json.dumps(u.get("state") or {}, ensure_ascii=False),

         "chat": lambda u: json.dumps(u.get("chat") or [], ensure_ascii=False),

         "pass_hash": lambda u: u.get("passHash"), "name": lambda u: u.get("name")}





def save_user(u, *cols):

    """Sirf wahi columns update hote hain jo bataye (taaki ek request dusri ka data na mitaye)."""

    cols = cols or ("state", "chat")

    with dbc() as c, c.cursor() as cur:

        cur.execute("UPDATE users SET " + ", ".join(f"{k}=%s" for k in cols) + " WHERE id=%s",

                    [_COLS[k](u) for k in cols] + [u["id"]])





def mysql_status():

    try:

        with dbc() as c, c.cursor() as cur:

            cur.execute("SELECT COUNT(*) AS n FROM users")

            return {"mysql": True, "users": cur.fetchone()["n"]}

    except Exception:

        return {"mysql": False}





init_db()





def pub(u):

    return {k: u.get(k) for k in ("id", "email", "phone", "name", "createdAt")}





def sign(u):

    return jwt.encode({"id": u["id"], "exp": int(time.time()) + 30 * 86400}, SECRET, algorithm="HS256")





def auth_res(u, is_new=False):

    return {"token": sign(u), "user": pub(u), "state": u.get("state") or {}, "isNew": is_new}





def sha(s):

    return hashlib.sha256(s.encode()).hexdigest()





def hash_pw(pw):

    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt(10)).decode()





def check_pw(pw, hashed):

    try:

        return bool(hashed) and len(pw.encode()) <= 72 and bcrypt.checkpw(pw.encode(), hashed.encode())

    except ValueError:

        return False





EMAIL = re.compile(r"^\S+@\S+\.\S+$")





def body():

    d = request.get_json(silent=True)

    return d if isinstance(d, dict) else {}





_hits = {}





def limit(name, max_=30, window=900, msg="Bahut zyada koshish, thodi der baad try karo"):

    ip, now = request.remote_addr or "x", time.time()

    with _lock:

        q = [t for t in _hits.get((name, ip), []) if now - t < window]

        if len(q) >= max_:

            _hits[(name, ip)] = q

            raise ApiError(msg, 429)

        q.append(now)

        _hits[(name, ip)] = q





def login_required(fn):

    @wraps(fn)

    def wrapper(*a, **k):

        h = request.headers.get("Authorization", "")

        try:

            p = jwt.decode(h[7:] if h.startswith("Bearer ") else "", SECRET, algorithms=["HS256"])

            u = find_by("id", p["id"])

            if not u:

                raise ValueError("no user")

        except Exception:

            raise ApiError("Please log in again", 401)

        g.user = u

        return fn(*a, **k)

    return wrapper





# ---------- errors + CORS ----------

@app.errorhandler(ApiError)

def on_api_error(e):

    return jsonify({"error": e.msg}), e.status





@app.errorhandler(pymysql.err.MySQLError)

def on_db_error(e):

    app.logger.exception("MySQL error")

    return jsonify({"error": "Database (MySQL) se connect nahi ho paya. MySQL chalu hai?"}), 503





@app.errorhandler(HTTPException)

def on_http_error(e):

    if request.path.startswith("/api/"):

        return jsonify({"error": "Not found" if e.code == 404 else e.description}), e.code

    return e





@app.errorhandler(Exception)

def on_error(e):

    app.logger.exception("Server error")

    if request.path.startswith("/api/"):

        return jsonify({"error": "Something went wrong"}), 500

    return "Something went wrong", 500





@app.after_request

def cors(resp):

    if request.path == "/" or request.path.endswith(".html"):

        resp.headers["Cache-Control"] = "no-store"

    if CORS_ORIGIN:

        resp.headers["Access-Control-Allow-Origin"] = CORS_ORIGIN

        resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"

        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"

    return resp





@app.before_request

def preflight():

    if request.method == "OPTIONS" and request.path.startswith("/api/"):

        return ("", 204)





# ================= AI MODULE (Fugu -> Ollama) =================

# Ollama chalu hona chahiye aur model pull hona chahiye:  ollama pull qwen2.5:3b

OLLAMA_URL = os.getenv(

    "OLLAMA_URL", "http://localhost:11434"

).rstrip("/")



OLLAMA_MODEL = os.getenv(

    "OLLAMA_MODEL", "qwen2.5:3b"

)



USE_BRAIN = os.getenv("USE_BRAIN", "0") == "1" and brain is not None



SYSTEM_PROMPT = """

You are Fugu, the AI career mentor for AI Bharat Mentor.

Help students with career roadmaps, coding, resumes,

skills, and interview preparation. Give clear,

beginner-friendly and honest answers.

"""



LANGN = {"en": "English", "zh": "Chinese", "hi": "Hindi", "bn": "Bengali", "ta": "Tamil", "te": "Telugu",

         "mr": "Marathi", "gu": "Gujarati", "kn": "Kannada", "ml": "Malayalam", "pa": "Punjabi"}



MAX_MSG = 1000

OLLAMA_DOWN_MSG = "Ollama connect nahi ho raha. Check karo ki Ollama chal raha hai."





class AIUnavailable(Exception):

    """Ollama band hai / model nahi mila / jawab kharab aaya."""





def clean(s, n=80):

    return re.sub(r"[\r\n]+", " ", str(s or ""))[:n]





def build_prompt(profile, lang):

    profile = profile if isinstance(profile, dict) else {}

    skills = profile.get("skills") if isinstance(profile.get("skills"), list) else []

    return (

        SYSTEM_PROMPT.strip()

        + " Keep answers under 150 words. "

        + f"Reply in {LANGN.get(lang, 'English')}. "

        + f"Student: name {clean(profile.get('name')) or 'unknown'}; "

        + f"education {clean(profile.get('edu')) or 'not set'}; "

        + f"goal {clean(profile.get('goal')) or 'not set'}; "

        + f"skills {clean(', '.join(map(str, skills))) or 'not set'}."

    )





def clean_history(history):

    out = []

    if isinstance(history, list):

        for m in history[-8:]:

            if isinstance(m, dict) and m.get("role") in ("user", "assistant") and isinstance(m.get("content"), str):

                out.append({"role": m["role"], "content": m["content"][:MAX_MSG]})

    while out and out[0]["role"] != "user":

        out.pop(0)

    return out





def ask(message, history=None, profile=None, lang="en"):

    """Jawab deta hai: {"reply": "...", "provider": "brain" | "ollama"}.

    Ollama na chale to AIUnavailable uthata hai."""

    message = str(message).strip()[:MAX_MSG]

    history = clean_history(history)

    profile = profile if isinstance(profile, dict) else {}

    lang = lang if lang in LANGN else "en"



    if USE_BRAIN:                                    # pehle apna Fugu Brain (tez), na mile to Ollama

        prev = next((m["content"] for m in reversed(history) if m["role"] == "user"), None)

        ctx = {"name": clean(profile.get("name")), "goal": clean(profile.get("goal")),

               "edu": clean(profile.get("edu")), "lang": lang, "prev": prev}

        o = brain.answer(message, ctx)

        if o:

            return {"reply": o["text"], "provider": "brain"}



    try:

        response = requests.post(

            f"{OLLAMA_URL}/api/chat",

            json={

                "model": OLLAMA_MODEL,

                "messages": [

                    {"role": "system", "content": build_prompt(profile, lang)},

                    *history,

                    {"role": "user", "content": message},

                ],

                "stream": False,

            },

            timeout=(5, 180),

        )

        response.raise_for_status()

        result = response.json()

        reply = (result["message"]["content"] or "").strip()

        if not reply:

            raise ValueError("empty reply")

        return {"reply": reply, "provider": "ollama"}

    except (requests.exceptions.RequestException, KeyError, ValueError, TypeError) as e:

        raise AIUnavailable(OLLAMA_DOWN_MSG) from e





def ollama_status():

    """/health ke liye: Ollama chal raha hai? model installed hai?"""

    try:

        r = requests.get(f"{OLLAMA_URL}/api/tags", timeout=2)

        r.raise_for_status()

        names = [m.get("name", "") for m in r.json().get("models", [])]

        return {"ollama": True, "model": OLLAMA_MODEL,

                "model_installed": any(n == OLLAMA_MODEL or n.startswith(OLLAMA_MODEL + ":") for n in names)}

    except Exception:

        return {"ollama": False, "model": OLLAMA_MODEL, "model_installed": False}





# ---------- Health ----------

@app.get("/health")

@app.get("/api/health")

def health():

    return jsonify({"status": "ok", "service": "AI Bharat Mentor", "brain": USE_BRAIN, "frontend": str(FRONT), "frontend_new": frontend_is_new(), **mysql_status(), **ollama_status()})





# ---------- Auth: email + password ----------

@app.post("/api/auth/signup")

def signup():

    limit("auth")

    d = body()

    email = str(d.get("email", "")).strip().lower()

    pw = str(d.get("password", ""))

    name = str(d.get("name", "")).strip()[:60]

    if not EMAIL.match(email):

        raise ApiError("Enter a valid email")

    if len(pw) < 6 or len(pw.encode()) > 72:

        raise ApiError("Password must be 6-72 characters")

    with _lock:

        if find_by("email", email):

            raise ApiError("Account already exists, please log in", 409)

        u = new_user(email=email, name=name, pass_hash=hash_pw(pw))

    return jsonify(auth_res(u, True)), 201





@app.post("/api/auth/login")

def login():

    limit("auth")

    d = body()

    u = find_by("email", str(d.get("email", "")).strip().lower())

    if not u or not check_pw(str(d.get("password", "")), u.get("passHash")):

        raise ApiError("Incorrect email or password", 401)

    return jsonify(auth_res(u))





# ---------- Auth: OTP (phone) ----------

_otps = {}





@app.post("/api/auth/otp/send")

def otp_send():

    limit("auth")

    phone = str(body().get("phone", "")).strip()

    if not re.fullmatch(r"\d{10}", phone):

        raise ApiError("Enter a valid 10-digit number")

    old = _otps.get(phone)

    if old and time.time() - old["sent"] < 30:

        raise ApiError("Wait 30 seconds before asking for a new OTP", 429)

    otp = str(secrets.randbelow(9000) + 1000)

    _otps[phone] = {"otp": otp, "exp": time.time() + 300, "tries": 0, "sent": time.time()}

    print(f"[OTP] {phone} -> {otp}")                       # yahan SMS service (MSG91 / Twilio) jodo

    return jsonify({"ok": True, **({} if PROD else {"devOtp": otp})})   # live par OTP kabhi wapas mat bhejo





@app.post("/api/auth/otp/verify")

def otp_verify():

    limit("auth")

    d = body()

    phone = str(d.get("phone", ""))

    rec = _otps.get(phone)

    if not rec or rec["exp"] < time.time():

        raise ApiError("OTP expired, ask for a new one")

    rec["tries"] += 1

    if rec["tries"] > 5:

        _otps.pop(phone, None)

        raise ApiError("Too many wrong attempts", 429)

    if not secrets.compare_digest(str(d.get("otp", "")), rec["otp"]):

        raise ApiError("Incorrect OTP")

    _otps.pop(phone, None)

    with _lock:

        u = find_by("phone", phone)

        is_new = u is None

        if is_new:

            u = new_user(phone=phone)

    return jsonify(auth_res(u, is_new))





# ---------- Auth: Google ----------

@app.post("/api/auth/google")

def google():

    limit("auth")

    cid = os.getenv("GOOGLE_CLIENT_ID")

    if not cid:

        raise ApiError("Google login is not configured", 501)

    r = requests.get("https://oauth2.googleapis.com/tokeninfo",

                     params={"id_token": str(body().get("idToken", ""))}, timeout=15)

    gd = r.json()

    if r.status_code != 200 or gd.get("aud") != cid or gd.get("email_verified") != "true":

        raise ApiError("Google sign-in failed", 401)

    email = str(gd["email"]).lower()

    with _lock:

        u = find_by("email", email)

        is_new = u is None

        if is_new:

            u = new_user(email=email, name=gd.get("name", ""))

    return jsonify(auth_res(u, is_new))





# ---------- Auth: forgot / reset password ----------

_resets = {}





@app.post("/api/auth/forgot")

def forgot():

    limit("auth")

    u = find_by("email", str(body().get("email", "")).strip().lower())

    if u:

        t = secrets.token_hex(24)

        _resets[sha(t)] = {"id": u["id"], "exp": time.time() + 1800}

        print(f"[RESET] {u['email']} -> {os.getenv('BASE_URL', '')}/#reset?token={t}")   # yahan email bhejo

    return jsonify({"ok": True})      # hamesha same jawab, taaki koi email check na kar sake





@app.post("/api/auth/reset")

def reset():

    limit("auth")

    d = body()

    token, pw = str(d.get("token", "")), str(d.get("password", ""))

    rec = _resets.get(sha(token))

    if not rec or rec["exp"] < time.time():

        raise ApiError("Reset link expired")

    if len(pw) < 6 or len(pw.encode()) > 72:

        raise ApiError("Password must be 6-72 characters")

    u = find_by("id", rec["id"])

    if not u:

        raise ApiError("Reset link expired")

    u["passHash"] = hash_pw(pw)

    save_user(u, "pass_hash")

    _resets.pop(sha(token), None)

    return jsonify({"ok": True})





# ---------- Me / account ----------

@app.get("/api/me")

@login_required

def me():

    return jsonify(pub(g.user))





@app.delete("/api/me")

@login_required

def delete_me():

    with dbc() as c, c.cursor() as cur:

        cur.execute("DELETE FROM users WHERE id=%s", (g.user["id"],))

    return jsonify({"ok": True})





# ---------- User data sync (profile, roadmap tasks, resume, mock scores, bookmarks...) ----------

KEYS = ["u", "dn", "ch", "act", "rs", "ms", "mh", "bm", "st", "lp"]





@app.get("/api/state")

@login_required

def get_state():

    return jsonify(g.user.get("state") or {})





@app.put("/api/state")

@login_required

def put_state():

    d, upd = body(), {}

    for k in KEYS:

        if k in d:

            if len(json.dumps(d[k])) > 60000:

                raise ApiError(f"{k} is too large", 413)

            upd[k] = d[k]

    with dbc() as c, c.cursor() as cur:

        cur.execute("SELECT state FROM users WHERE id=%s FOR UPDATE", (g.user["id"],))

        row = cur.fetchone()

        st = _json(row["state"] if row else None, {})

        st.update(upd)

        cur.execute("UPDATE users SET state=%s WHERE id=%s", (json.dumps(st, ensure_ascii=False), g.user["id"]))

    return jsonify({"ok": True, "saved": len(upd)})





# ---------- AI chat (Ollama) ----------

def optional_user():

    """Login hai to user deta hai, nahi to None (token galat ho tab bhi None)."""

    h = request.headers.get("Authorization", "")

    try:

        p = jwt.decode(h[7:] if h.startswith("Bearer ") else "", SECRET, algorithms=["HS256"])

        return find_by("id", p["id"])

    except Exception:

        return None





@app.post("/api/chat")

def chat():

    limit("chat", 20, 60, "Thoda ruk kar message bhejo")

    d, u = body(), optional_user()

    if u is None and not GUEST_CHAT:

        raise ApiError("Please log in again", 401)

    message = d.get("message", "")

    if not isinstance(message, str) or not message.strip():

        raise ApiError("Please enter a message")

    message = message.strip()[:MAX_MSG]



    if u:                                           # login hai: profile aur history server se

        profile = (u.get("state") or {}).get("u")

        profile = profile if isinstance(profile, dict) else {}

        profile = {**profile, "name": profile.get("name") or u.get("name")}

        history = u["chat"][-10:]

    else:                                           # guest: profile aur history browser se aati hai

        profile = d.get("profile") if isinstance(d.get("profile"), dict) else {}

        history = d.get("history") if isinstance(d.get("history"), list) else []



    try:

        out = ask(message, history=history, profile=profile, lang=d.get("lang"))

    except AIUnavailable as e:

        app.logger.exception("Ollama connection failed")

        raise ApiError(str(e), 503)



    if u:

        u["chat"] += [{"role": "user", "content": message}, {"role": "assistant", "content": out["reply"]}]

        u["chat"] = u["chat"][-60:]

        save_user(u, "chat")

    return jsonify(out)





@app.get("/api/chat/history")

@login_required

def chat_history():

    return jsonify(g.user["chat"][-40:])





@app.delete("/api/chat")

@login_required

def chat_clear():

    g.user["chat"] = []

    save_user(g.user, "chat")

    return jsonify({"ok": True})





# ---------- frontend folder isi server se khulega ----------

def find_frontend():

    """Frontend folder khud dhundhta hai: .env ka FRONTEND_DIR, phir frontend/, ../frontend/, public/"""

    cands = []

    if os.getenv("FRONTEND_DIR"):

        cands.append(Path(os.getenv("FRONTEND_DIR")).expanduser())

    cands += [BASE / "frontend", BASE.parent / "frontend", BASE / "public"]

    for c in cands:

        c = c if c.is_absolute() else BASE / c

        if (c / "index.html").exists():

            return c.resolve()

    return (BASE / "frontend").resolve()





FRONT = find_frontend()





def frontend_is_new():

    """Kya frontend ki index.html wo nayi file hai jisme server se judne ka code hai?"""

    try:

        t = (FRONT / "index.html").read_text(encoding="utf-8", errors="ignore")

        return "sbadge" in t or "/api/ask" in t or "/api/chat" in t

    except OSError:

        return False





@app.get("/")

def home():

    if not (FRONT / "index.html").exists():

        return f"index.html nahi mila. Frontend folder yahan hona chahiye: {FRONT}", 404

    return send_from_directory(FRONT, "index.html")





@app.get("/<path:name>")

def assets(name):

    return send_from_directory(FRONT, name)      # path traversal se Flask khud bachata hai





@app.post("/api/ask")

def ask_route():

    limit("chat", 20, 60, "Thoda ruk kar message bhejo")

    d = body()

    message = d.get("message", "")

    if not isinstance(message, str) or not message.strip():

        raise ApiError("Please enter a message")

    profile = d.get("profile") if isinstance(d.get("profile"), dict) else {}

    history = d.get("history") if isinstance(d.get("history"), list) else []

    try:

        out = ask(message.strip()[:MAX_MSG], history=history, profile=profile, lang=d.get("lang"))

    except AIUnavailable as e:

        raise ApiError(str(e), 503)

    return jsonify(out)





if __name__ == "__main__":

    print(f"📁 Frontend folder: {FRONT}")

    if (FRONT / "index.html").exists():

        print("📄 index.html NAYI hai ✅" if frontend_is_new() else

              "📄 index.html PURANI hai ❌  -> nayi index.html isi folder me rakho: " + str(FRONT))

    else:

        print("❌ index.html nahi mili. Ise yahan rakho: " + str(FRONT))

    print(f"✅ AI Bharat Mentor chal raha hai: http://127.0.0.1:{PORT}")

    app.run(host="127.0.0.1", port=PORT, debug=False)