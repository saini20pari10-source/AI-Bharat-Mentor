"""library.py: Study Library (videos aur support material) jo sirf founder (admin) jodta hai aur sab students dekhte hain.
server.py me 2 line se judta hai:   import library ; library.apply(app, globals())
Admin ke liye .env me  ADMIN_KEY=koi-lamba-secret  likho. Student ko kabhi mat batao.

Kya jod sakte ho:   video (YouTube/Vimeo link ya mp4/webm file) | document (pdf, docx, pptx, xlsx, txt, md) | image | link
"""
import hmac
import os
import re
import time
import uuid
from pathlib import Path

from flask import jsonify, request, send_from_directory

KINDS = {
    "video": {"mp4": "video/mp4", "webm": "video/webm"},
    "document": {"pdf": "application/pdf", "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                 "doc": "application/msword", "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                 "ppt": "application/vnd.ms-powerpoint", "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                 "xls": "application/vnd.ms-excel", "txt": "text/plain; charset=utf-8", "md": "text/plain; charset=utf-8"},
    "image": {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "webp": "image/webp"},
    "link": {},
}
INLINE = {"pdf", "png", "jpg", "jpeg", "webp", "mp4", "webm", "txt", "md"}      # browser me seedha khulte hain, baaki download


def sniff_ok(ext, head):
    """File ke andar ke pehle bytes check: naam badalkar kuch aur chhupaya to pakad leta hai."""
    if ext == "pdf": return head.startswith(b"%PDF")
    if ext == "png": return head.startswith(b"\x89PNG")
    if ext in ("jpg", "jpeg"): return head.startswith(b"\xff\xd8")
    if ext == "webp": return head[:4] == b"RIFF" and head[8:12] == b"WEBP"
    if ext == "mp4": return head[4:8] == b"ftyp"
    if ext == "webm": return head.startswith(b"\x1a\x45\xdf\xa3")
    if ext in ("docx", "pptx", "xlsx"): return head.startswith(b"PK")
    if ext in ("doc", "ppt", "xls"): return head.startswith(b"\xd0\xcf\x11\xe0")
    if ext in ("txt", "md"): return b"\x00" not in head
    return False


def apply(app, G):
    UP = Path(G["BASE"]) / "uploads" / "library"
    VIDEO_MB = int(os.getenv("LIB_MAX_MB", "200"))
    DOC_MB = min(VIDEO_MB, 30)
    app.config["MAX_CONTENT_LENGTH"] = (VIDEO_MB + 5) * 1024 * 1024
    state = {"table": False}

    def err(msg, status=400):
        return G["ApiError"](msg, status)

    def ensure_table():
        if state["table"]:
            return
        UP.mkdir(parents=True, exist_ok=True)
        with G["dbc"]() as c, c.cursor() as cur:
            cur.execute("""CREATE TABLE IF NOT EXISTS library_items (
                id CHAR(36) PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                description VARCHAR(500) NOT NULL DEFAULT '',
                skill VARCHAR(80) NOT NULL DEFAULT '',
                kind VARCHAR(20) NOT NULL,
                url VARCHAR(500) NULL,
                file_name VARCHAR(255) NULL,
                file_path VARCHAR(255) NULL,
                mime VARCHAR(100) NULL,
                size BIGINT NOT NULL DEFAULT 0,
                hours DECIMAL(5,1) NOT NULL DEFAULT 1,
                created_at BIGINT NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""")
        state["table"] = True

    def need_admin():
        key = os.getenv("ADMIN_KEY", "")
        if len(key) < 8:
            raise err("Admin band hai. .env me ADMIN_KEY (kam se kam 8 akshar) likho aur server dobara chalao.", 403)
        G["limit"]("admin", 30, 900, "Bahut zyada koshish, thodi der baad try karo")
        sent = request.headers.get("X-Admin-Key", "")
        if not hmac.compare_digest(sent.encode(), key.encode()):
            raise err("Admin key galat hai", 403)

    def item(r):
        return {"id": r["id"], "title": r["title"], "description": r["description"], "skill": r["skill"], "kind": r["kind"],
                "url": r["url"], "fileName": r["file_name"], "fileUrl": f"/api/library/{r['id']}/file" if r["file_path"] else None,
                "size": int(r["size"] or 0), "hours": float(r["hours"] or 0), "createdAt": r["created_at"]}

    def list_items():
        ensure_table()
        sql, args = "SELECT * FROM library_items WHERE 1=1", []
        skill, kind, q = request.args.get("skill", "").strip(), request.args.get("kind", "").strip(), request.args.get("q", "").strip()
        if skill:
            sql += " AND skill=%s"; args.append(skill[:80])
        if kind in KINDS:
            sql += " AND kind=%s"; args.append(kind)
        if q:
            sql += " AND (title LIKE %s OR description LIKE %s OR skill LIKE %s)"; args += [f"%{q[:60]}%"] * 3
        sql += " ORDER BY created_at DESC LIMIT 300"
        with G["dbc"]() as c, c.cursor() as cur:
            cur.execute(sql, args)
            return jsonify([item(r) for r in cur.fetchall()])

    def add_item():
        ensure_table()
        need_admin()
        f = request.form
        title = f.get("title", "").strip()[:200]
        kind = f.get("kind", "").strip()
        skill = f.get("skill", "").strip()[:80]
        desc = f.get("description", "").strip()[:500]
        url = f.get("url", "").strip()[:500]
        try:
            hours = max(0.1, min(500.0, float(f.get("hours") or 1)))
        except ValueError:
            hours = 1.0
        if len(title) < 2:
            raise err("Title likho (kam se kam 2 akshar)")
        if kind not in KINDS:
            raise err("Type galat hai (video, document, image ya link)")
        if url and not re.match(r"^https?://", url, re.I):
            raise err("Link http:// ya https:// se shuru hona chahiye")
        up = request.files.get("file")
        file_name = file_path = mime = None
        size = 0
        if up and up.filename:
            ext = up.filename.rsplit(".", 1)[-1].lower() if "." in up.filename else ""
            allowed = KINDS[kind] if kind != "link" else {}
            if ext not in allowed:
                raise err(f"{kind} ke liye ye file type allowed hai: " + (", ".join(allowed) or "koi nahi (link ke liye link likho)"))
            up.stream.seek(0, 2); size = up.stream.tell(); up.stream.seek(0)
            if size == 0:
                raise err("File khali hai")
            if size > (VIDEO_MB if kind == "video" else DOC_MB) * 1024 * 1024:
                raise err(f"File bahut badi hai (max {VIDEO_MB if kind == 'video' else DOC_MB} MB)", 413)
            if not sniff_ok(ext, up.stream.read(32)):
                raise err("File ka andar ka format uske naam se match nahi karta")
            up.stream.seek(0)
            UP.mkdir(parents=True, exist_ok=True)
            file_path = f"{uuid.uuid4().hex}.{ext}"
            up.save(UP / file_path)
            file_name = re.sub(r"[^\w.\- ()]", "_", Path(up.filename).name)[:200]
            mime = allowed[ext]
        elif kind in ("document", "image") or (kind == "video" and not url):
            raise err("File chuno" + (" ya video ka link likho" if kind == "video" else ""))
        if kind == "link" and not url:
            raise err("Link likho")
        iid = str(uuid.uuid4())
        with G["dbc"]() as c, c.cursor() as cur:
            cur.execute("INSERT INTO library_items (id,title,description,skill,kind,url,file_name,file_path,mime,size,hours,created_at) "
                        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                        (iid, title, desc, skill, kind, url or None, file_name, file_path, mime, size, hours, int(time.time() * 1000)))
            cur.execute("SELECT * FROM library_items WHERE id=%s", (iid,))
            return jsonify(item(cur.fetchone())), 201

    def delete_item(iid):
        ensure_table()
        need_admin()
        with G["dbc"]() as c, c.cursor() as cur:
            cur.execute("SELECT file_path FROM library_items WHERE id=%s", (iid,))
            r = cur.fetchone()
            if not r:
                raise err("Item nahi mila", 404)
            cur.execute("DELETE FROM library_items WHERE id=%s", (iid,))
        if r["file_path"]:
            try:
                (UP / r["file_path"]).unlink()
            except OSError:
                pass
        return jsonify({"ok": True})

    def serve_file(iid):
        ensure_table()
        with G["dbc"]() as c, c.cursor() as cur:
            cur.execute("SELECT file_path, file_name, mime FROM library_items WHERE id=%s", (iid,))
            r = cur.fetchone()
        if not r or not r["file_path"]:
            raise err("File nahi mili", 404)
        ext = r["file_path"].rsplit(".", 1)[-1]
        return send_from_directory(UP, r["file_path"], mimetype=r["mime"], conditional=True,
                                   as_attachment=ext not in INLINE, download_name=r["file_name"] or r["file_path"])

    def admin_check():
        need_admin()
        return jsonify({"ok": True})

    app.add_url_rule("/api/library", "lib_list", list_items, methods=["GET"])
    app.add_url_rule("/api/library", "lib_add", add_item, methods=["POST"])
    app.add_url_rule("/api/library/admin-check", "lib_admin", admin_check, methods=["GET"])
    app.add_url_rule("/api/library/<iid>", "lib_del", delete_item, methods=["DELETE"])
    app.add_url_rule("/api/library/<iid>/file", "lib_file", serve_file, methods=["GET"])