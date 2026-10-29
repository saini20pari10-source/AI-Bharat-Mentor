"""AI module: Fugu (Ollama par chalne wala apna AI model).
app.py isse import karta hai:  import ai_module   ->   ai_module.ask(...)
Ollama chalu hona chahiye aur model pull hona chahiye:  ollama pull qwen2.5:3b
"""
import os
import re

import requests
from dotenv import load_dotenv

try:
    import brain            # optional: pehle se likhe jawab (tez). Na ho to bhi chalega.
except ImportError:
    brain = None

load_dotenv()

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


def status():
    """/health ke liye: Ollama chal raha hai? model installed hai?"""
    try:
        r = requests.get(f"{OLLAMA_URL}/api/tags", timeout=2)
        r.raise_for_status()
        names = [m.get("name", "") for m in r.json().get("models", [])]
        return {"ollama": True, "model": OLLAMA_MODEL,
                "model_installed": any(n == OLLAMA_MODEL or n.startswith(OLLAMA_MODEL + ":") for n in names)}
    except Exception:
        return {"ollama": False, "model": OLLAMA_MODEL, "model_installed": False}