
from pathlib import Path

import joblib
from flask import Blueprint, jsonify, request

career_bp = Blueprint("career_ai", __name__)

MODEL_PATH = Path(__file__).parent / "career_model.pkl"

# Load only the model file you trained yourself.
data = joblib.load(MODEL_PATH)
model = data["model"]
SKILLS = data["skills"]
CAREER_SKILLS = data["career_skills"]


@career_bp.get("/api/career/skills")
def available_skills():
    return jsonify({
        "skills": SKILLS,
        "careers": list(CAREER_SKILLS)
    })


@career_bp.post("/api/career/recommend")
def recommend_career():
    body = request.get_json(silent=True)

    if not isinstance(body, dict):
        return jsonify({"error": "Send a JSON object"}), 400

    selected = body.get("skills", [])

    if not isinstance(selected, list):
        return jsonify({"error": "skills must be a list"}), 400

    if not all(isinstance(s, str) for s in selected):
        return jsonify({"error": "All skills must be text"}), 400

    known_skills = {s.lower(): s for s in SKILLS}

    invalid = [
        s for s in selected
        if s.strip().lower() not in known_skills
    ]

    if invalid:
        return jsonify({
            "error": "Unknown skills",
            "invalid_skills": invalid
        }), 400

    selected_set = {
        s.strip().lower()
        for s in selected
    }

    if not selected_set:
        return jsonify({
            "error": "Select at least one skill"
        }), 400

    scores = [
        9 if skill.lower() in selected_set else 0
        for skill in SKILLS
    ]

    career = str(model.predict([scores])[0])
    required = CAREER_SKILLS[career]

    matched = [
        s for s in required
        if s.lower() in selected_set
    ]

    missing = [
        s for s in required
        if s.lower() not in selected_set
    ]

    return jsonify({
        "recommended_career": career,
        "matched_skills": matched,
        "missing_skills": missing,
        "skill_match_percentage": round(
            len(matched) / len(required) * 100, 1
        )
    })
