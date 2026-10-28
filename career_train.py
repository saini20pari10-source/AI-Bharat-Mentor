import random
import joblib
from sklearn.tree import DecisionTreeClassifier

random.seed(42)

SKILLS = [
    "Python", "Java", "C", "C++", "C#",
    "JavaScript", "TypeScript", "HTML", "CSS",
    "SQL", "MySQL", "PostgreSQL", "MongoDB",
    "PHP", "Ruby", "Go", "Rust", "Kotlin",
    "Swift", "Dart", "R", "Julia", "MATLAB",
    "Bash", "PowerShell", "Assembly", "Scala",
    "Perl", "Lua", "Solidity", "COBOL",
    "React", "Node.js", "Flask", "Django",
    "Machine Learning", "Deep Learning",
    "Networking", "Linux", "Cybersecurity",
    "Power BI", "Excel", "Unity"
]

CAREER_SKILLS = {
    "AI Developer": ["Python", "Machine Learning", "Deep Learning", "SQL"],
    "Web Developer": ["HTML", "CSS", "JavaScript", "React"],
    "Data Analyst": ["Python", "SQL", "Excel", "Power BI"],
    "Cybersecurity Analyst": ["Linux", "Networking", "Cybersecurity"],
    "Java Developer": ["Java", "SQL", "MySQL"],
    "C++ Developer": ["C", "C++", "Rust"],
    "C# Developer": ["C#", "SQL", "Unity"],
    "Mobile App Developer": ["Kotlin", "Swift", "Dart"],
    "Database Developer": ["SQL", "MySQL", "PostgreSQL"],
    "Blockchain Developer": ["Solidity", "JavaScript", "Rust"],
    "Backend Developer": ["Python", "Java", "Go", "Flask", "Django"]
}

print("Career AI Training Started!")

X = []
y = []

for career, required in CAREER_SKILLS.items():
    for _ in range(150):
        scores = {skill: random.randint(0, 3) for skill in SKILLS}
        for skill in required:
            scores[skill] = random.randint(7, 10)
        X.append([scores[skill] for skill in SKILLS])
        y.append(career)

model = DecisionTreeClassifier(max_depth=15, random_state=42)
model.fit(X, y)

joblib.dump({
    "model": model,
    "skills": SKILLS,
    "career_skills": CAREER_SKILLS
}, "career_model.pkl")

print("Career Model Trained Successfully!")
print("Career Model Saved Successfully!")
print("Total Skills:", len(SKILLS))
print("Total Careers:", len(CAREER_SKILLS))
