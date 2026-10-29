
import os
import json
import joblib
import requests

from flask import Blueprint, request, jsonify

abm = Blueprint("abm_modules", __name__)

CAREERS = {
    "AI Developer": {
        "skills": ["Python", "Machine Learning", "SQL", "Deep Learning"],
        "roadmap": ["Python", "NumPy and Pandas", "Machine Learning", "AI Projects"]
    },
    "Web Developer": {
        "skills": ["HTML", "CSS", "JavaScript", "React"],
        "roadmap": ["HTML/CSS", "JavaScript", "React", "Backend APIs"]
    },
    "Data Analyst": {
        "skills": ["Python", "SQL", "Excel", "Power BI"],
        "roadmap": ["Excel", "SQL", "Pandas", "Dashboards"]
    },
    "Cybersecurity Analyst": {
        "skills": ["Networking", "Linux", "Python", "Security"],
        "roadmap": ["Networking", "Linux", "Security Basics", "Security Labs"]
    }
}

MODEL_PATH = os.path.join(
    os.path.dirname(__file__),
    "career_model.pkl"
)


def ask_fugu(prompt):
    response = requests.post(
        "http://127.0.0.1:11434/api/generate",
        json={
            "model": "qwen2.5:3b",
            "prompt": prompt,
            "stream": False
        },
        timeout=180
    )
    response.raise_for_status()
    return response.json()["response"]


@abm.route("/api/career", methods=["POST"])
def career_recommendation():
    data = request.get_json(silent=True) or {}

    try:
        scores = [
            int(data.get("python", 0)),
            int(data.get("web", 0)),
            int(data.get("data", 0)),
            int(data.get("security", 0))
        ]

        if any(score < 0 or score > 10 for score in scores):
            return jsonify({
                "error": "Scores must be between 0 and 10"
            }), 400

        model = joblib.load(MODEL_PATH)
        career = str(model.predict([scores])[0])

        return jsonify({
            "career": career,
            "roadmap": CAREERS[career]["roadmap"]
        })

    except (ValueError, TypeError):
        return jsonify({"error": "Invalid scores"}), 400
    except FileNotFoundError:
        return jsonify({"error": "Train career model first"}), 503


@abm.route("/api/skill-gap", methods=["POST"])
def skill_gap():
    data = request.get_json(silent=True) or {}
    career = data.get("career")
    skills = data.get("skills", [])

    if career not in CAREERS or not isinstance(skills, list):
        return jsonify({"error": "Invalid career or skills"}), 400

    required = CAREERS[career]["skills"]
    owned = {str(s).strip().lower() for s in skills}

    matched = [s for s in required if s.lower() in owned]
    missing = [s for s in required if s.lower() not in owned]

    return jsonify({
        "career": career,
        "matched_skills": matched,
        "missing_skills": missing,
        "match_percentage": round(
            len(matched) / len(required) * 100
        )
    })


@abm.route("/api/resume", methods=["POST"])
def resume_builder():
    data = request.get_json(silent=True) or {}

    name = str(data.get("name", "")).strip()
    skills = data.get("skills", [])
    education = str(data.get("education", "")).strip()
    projects = str(data.get("projects", "")).strip()

    if not name or not isinstance(skills, list):
        return jsonify({"error": "Name and skills required"}), 400

    prompt = f"""
    You are Fugu, a professional resume assistant.
    Create an ATS-friendly resume draft.

    Name: {name}
    Education: {education}
    Skills: {json.dumps(skills)}
    Projects: {projects}

    Do not invent qualifications or experience.
    Return plain text with clear headings.
    """

    try:
        result = ask_fugu(prompt)
        return jsonify({"resume": result})
    except requests.RequestException:
        return jsonify({"error": "Local AI unavailable"}), 503


@abm.route("/api/mock-interview", methods=["POST"])
def mock_interview():
    data = request.get_json(silent=True) or {}

    role = str(data.get("role", "Python Developer"))[:100]
    level = str(data.get("level", "Beginner"))[:50]

    prompt = f"""
    You are Fugu, an AI interviewer.
    Conduct a {level} interview for {role}.
    Ask one question only.
    Wait for the student's answer.
    Do not provide the answer yet.
    """

    try:
        question = ask_fugu(prompt)
        return jsonify({"question": question})
    except requests.RequestException:
        return jsonify({"error": "Local AI unavailable"}), 503
