
import joblib

data = joblib.load("career_model.pkl")

model = data["model"]
skills = data["skills"]
career_skills = data["career_skills"]

print("\nWelcome to AI Bharat Mentor!")
print("Career Recommendation AI\n")

print("Available Skills:")
print(", ".join(skills))

print("\nEnter skills you know, separated by commas.")
print("Example: Python, SQL, Machine Learning")

entered = input("\nYour Skills: ")

selected = {
    skill.strip().lower()
    for skill in entered.split(",")
}

scores = [
    9 if skill.lower() in selected else 0
    for skill in skills
]

career = model.predict([scores])[0]

print("\n-------------------------------")
print("Recommended Career:", career)
print("-------------------------------")

required = career_skills[career]

known = [
    skill for skill in required
    if skill.lower() in selected
]

missing = [
    skill for skill in required
    if skill.lower() not in selected
]

print("Matched Skills:", ", ".join(known) or "None")
print("Skills to Learn:", ", ".join(missing) or "None")

