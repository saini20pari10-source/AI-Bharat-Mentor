"""prod.py: live (production) ke liye safety layer.
server.py me sirf 2 line se judta hai:   import prod ; prod.apply(app, globals())
Ye karta kya hai:
  1. Live mode me kamzor/default JWT_SECRET hone par server chalne hi nahi deta
  2. Jo cheezein abhi asli nahi hain (OTP SMS, password-reset email) unhe live par honestly band rakhta hai
  3. Landing page ke namoone wale aankde aur jhoothe reviews ki jagah sach likhta hai
  4. Security headers, HTTPS (proxy ke peeche) ki sahi pehchan, /health se andar ki jaankari hatata hai
  5. Agar AI model (Ollama) na ho (hosting par) to Fugu Brain + saaf message se kaam chalata hai
"""
import os
import re

from flask import Response, jsonify, request
from werkzeug.middleware.proxy_fix import ProxyFix

FALLBACK = ("Is sawal ka jawab abhi mere paas nahi hai. Aap skills, roadmap, resume, interview, "
            "jobs, projects ya DSA ke baare me pooch sakte ho.")
BAD_SECRETS = ("dev-secret-change-me",)


def honest(html):
    """Namoone wale aankde aur reviews hatakar sach likhta hai."""
    html = html.replace("4.8/5 student rating</b>Join 12,000+ ambitious learners",
                        "Free for students</b>Built for India, in 11 Indian languages")
    html = html.replace('<b style="font-size:22px;color:#22d3ee">12,000+</b><br>learners · 11 languages',
                        '<b style="font-size:22px;color:#22d3ee">11</b><br>Indian languages')
    html = re.sub(r"\[\['“The roadmap told me.*?'Sneha, 12th Pass'\]\]",
                  "[['We are just getting started. Use AI Bharat Mentor and be one of our first success stories!','Your name could be here']]",
                  html, flags=re.S)
    return html


def apply(app, g):
    PROD = g["PROD"]
    SECRET = g["SECRET"]
    SMS = bool(os.getenv("SMS_PROVIDER"))        # jab asli SMS service jodo tab .env me SMS_PROVIDER=... likho
    MAIL = bool(os.getenv("SMTP_HOST"))          # jab asli email jodo tab .env me SMTP_HOST=... likho
    state = {"wrapped": False}

    if PROD:
        if SECRET in BAD_SECRETS or "likho" in SECRET.lower() or len(SECRET) < 32:
            raise SystemExit("❌ Live mode me JWT_SECRET kam se kam 32 akshar ka asli random secret hona chahiye.\n"
                             "   Banane ke liye: python -c \"import secrets; print(secrets.token_hex(32))\"")
        if g["GUEST_CHAT"]:
            print("⚠️  GUEST_CHAT=1: bina login ke bhi koi bhi AI use kar sakta hai. Live par .env me GUEST_CHAT=0 karo.")
        if not SMS:
            print("ℹ️  OTP login band hai (SMS service nahi judi).")
        if not MAIL:
            print("ℹ️  Forgot-password band hai (email service nahi judi).")

    if os.getenv("BEHIND_PROXY") == "1":          # Render / Railway / Nginx / Cloudflare ke peeche
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

    def wrap_ask():
        orig = g["ask"]

        def safe_ask(*a, **k):
            try:
                return orig(*a, **k)
            except g["AIUnavailable"]:
                if g["USE_BRAIN"]:                 # Ollama nahi hai, par Fugu Brain chalu hai
                    return {"reply": FALLBACK, "provider": "brain"}
                raise
        g["ask"] = safe_ask
        state["wrapped"] = True

    @app.before_request
    def prod_guard():
        if not state["wrapped"]:
            wrap_ask()
        p = request.path
        if PROD and p in ("/api/auth/otp/send", "/api/auth/otp/verify") and not SMS:
            return jsonify({"error": "OTP login abhi available nahi hai. Email se login karo."}), 501
        if PROD and p in ("/api/auth/forgot", "/api/auth/reset") and not MAIL:
            return jsonify({"error": "Password reset abhi available nahi hai."}), 501
        if PROD and p in ("/health", "/api/health"):
            return jsonify({"status": "ok"})
        if p in ("/", "/index.html") and request.method == "GET":
            f = g["FRONT"] / "index.html"
            if f.exists():
                return Response(honest(f.read_text(encoding="utf-8", errors="ignore")),
                                mimetype="text/html", headers={"Cache-Control": "no-store"})

    @app.after_request
    def security_headers(resp):
        resp.headers.setdefault("X-Content-Type-Options", "nosniff")
        resp.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
        resp.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        resp.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        if PROD and request.is_secure:
            resp.headers.setdefault("Strict-Transport-Security", "max-age=31536000")
        return resp