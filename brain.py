"""Fugu Brain: apna khud ka AI (koi bahari API nahi).
Kaise kaam karta hai:
 1. Sawal ko shabdon mein todta hai (English, Hindi, Hinglish sab chalta hai)
 2. KB (knowledge base) ke har topic se TF-IDF + cosine similarity se match karta hai
 3. Sabse achha topic chunkar jawab deta hai: user ke naam/goal ke saath, unki language mein
 4. Jo sawal samajh na aaye wo unanswered.log mein likh leta hai -> use KB mein jodkar AI ko "sikhao"
"""
import json
import math
import re
import time
from collections import Counter
from pathlib import Path

STOP = set("a an the is are am to of in on for and or with my me i you your do does can how what which should would could please tell about it this that be by at from as hai ho hain kya ki ke ka ko se me mein par aur mujhe muje mera meri hum kaise kese start shuru karu karna kahan chahiye".split())
SPLIT = re.compile(r"[\s.,;:!?\"'()\[\]{}<>/\\|@%^&*=~`\-—–।]+")


def stem(w):
    return re.sub(r"(ing|ed|es|s)$", "", w) if len(w) > 4 else w


def tok(s):
    return [stem(w) for w in SPLIT.split(str(s).lower()) if w and w not in STOP]


# ---------- KNOWLEDGE BASE: yahan naye topic jodte jao, AI smart hota jayega ----------
# q = us topic ke sawalon mein aane wale shabd (English + Hinglish + Hindi)
# a = jawab har language mein (en zaroori, baaki optional)
KB = [
 {"id": "skills", "q": "best skills software developer programmer coding languages learn needed required skill kaun si skills seekhni coding sikhna सॉफ्टवेयर डेवलपर स्किल्स",
  "a": {"en": "To become {goal}, focus on: 1) one language (Python or Java), 2) Data Structures & Algorithms, 3) HTML, CSS, JavaScript, 4) SQL, 5) Git & GitHub. Start with one skill and build a small project with it.",
        "hi": "{goal} बनने के लिए ये सीखो: 1) एक भाषा (Python या Java), 2) Data Structures & Algorithms, 3) HTML, CSS, JavaScript, 4) SQL, 5) Git और GitHub। एक-एक करके सीखो और हर skill पर छोटा प्रोजेक्ट बनाओ।"}},
 {"id": "interview", "q": "interview prepare preparation questions crack tips hr technical interview kaise de taiyari इंटरव्यू तैयारी",
  "a": {"en": "Interview prep: 1) Revise basics of your skills, 2) Practice 20 common questions aloud, 3) Prepare a 1-minute 'tell me about yourself', 4) Be ready to explain every project, 5) Take 3 mock interviews in the Mock Interview screen.",
        "hi": "इंटरव्यू की तैयारी: 1) अपनी skills के basics दोहराओ, 2) 20 आम सवालों का ज़ोर से अभ्यास करो, 3) 1 मिनट का 'अपने बारे में बताइए' तैयार रखो, 4) हर प्रोजेक्ट समझाना आना चाहिए, 5) Mock Interview में 3 बार अभ्यास करो।"}},
 {"id": "resume", "q": "resume cv build make create write format ats biodata रिज़्यूमे बनाना",
  "a": {"en": "A good resume: one page, short summary, 2-3 projects with results, skills, education, and links (GitHub/LinkedIn). Use simple fonts and no photo. Try the Resume Builder screen.",
        "hi": "अच्छा resume: एक पेज, छोटा summary, 2-3 प्रोजेक्ट (नतीजों के साथ), skills, education और GitHub/LinkedIn लिंक। सादा font रखो। Resume Builder screen आज़माओ।"}},
 {"id": "plan", "q": "study plan roadmap schedule months timeline strategy 6 month plan kaise shuru padhai योजना",
  "a": {"en": "Here is a 6-month plan for {goal}: Months 1-2: basics (language + web). Months 3-4: DSA, database and one framework. Month 5: build 2 real projects. Month 6: resume, mock interviews and apply daily. Check your Roadmap screen to tick tasks.",
        "hi": "{goal} के लिए 6 महीने की योजना: महीना 1-2: basics (भाषा + web)। महीना 3-4: DSA, database और एक framework। महीना 5: 2 असली प्रोजेक्ट। महीना 6: resume, mock interview और रोज़ apply। Roadmap screen में tasks टिक करते रहो।"}},
 {"id": "jobs", "q": "job jobs internship opportunities openings apply fresher hiring naukri placement नौकरी इंटर्नशिप",
  "a": {"en": "For jobs and internships: apply on LinkedIn, Internshala, Naukri and company career pages. Look for fresher and trainee roles, keep your GitHub updated, message alumni for referrals, and apply to 5 places every day.",
        "hi": "नौकरी/इंटर्नशिप के लिए LinkedIn, Internshala, Naukri और कंपनियों के career page पर apply करो। fresher और trainee roles देखो, GitHub अपडेट रखो, senior लोगों से referral माँगो और रोज़ 5 जगह apply करो।"}},
 {"id": "dsa", "q": "dsa data structures algorithms array linked list tree graph sorting leetcode practice problems",
  "a": {"en": "DSA path: arrays and strings -> hashing -> linked lists -> stacks and queues -> recursion -> trees -> sorting and searching -> graphs -> basic dynamic programming. Solve 1-2 problems daily on LeetCode or GeeksforGeeks.",
        "hi": "DSA का रास्ता: arrays और strings -> hashing -> linked list -> stack/queue -> recursion -> trees -> sorting/searching -> graphs -> basic DP। रोज़ LeetCode या GeeksforGeeks पर 1-2 सवाल हल करो।"}},
 {"id": "web", "q": "web development website html css javascript react frontend backend full stack node वेबसाइट बनाना",
  "a": {"en": "Web development path: HTML -> CSS -> JavaScript -> Git -> React (frontend) -> Node.js or Python and a database (backend). Build a portfolio site first, then a full-stack project like a to-do or blog app.",
        "hi": "Web development का रास्ता: HTML -> CSS -> JavaScript -> Git -> React (frontend) -> Node.js या Python और database (backend)। पहले अपनी portfolio website बनाओ, फिर to-do या blog जैसा full-stack प्रोजेक्ट।"}},
 {"id": "python", "q": "python learn start beginner basics programming पायथन सीखना",
  "a": {"en": "Learn Python in this order: variables and loops -> functions -> lists, dicts -> files -> OOP -> libraries (requests, pandas). Practice daily with small programs. 'Python for Beginners' on Coursera is a good start.",
        "hi": "Python इस क्रम में सीखो: variables और loops -> functions -> list, dict -> files -> OOP -> libraries (requests, pandas)। रोज़ छोटे programs बनाओ। Coursera का 'Python for Beginners' अच्छी शुरुआत है।"}},
 {"id": "projects", "q": "project projects ideas build mini final year portfolio प्रोजेक्ट आइडिया",
  "a": {"en": "Good project ideas: to-do app, weather app, quiz app, expense tracker, student management system, and a chatbot. Add a login, a database and deploy it online, so recruiters can open your link.",
        "hi": "प्रोजेक्ट आइडिया: to-do app, weather app, quiz app, expense tracker, student management system और chatbot। उसमें login और database जोड़ो और online deploy करो ताकि recruiter लिंक खोल सकें।"}},
 {"id": "github", "q": "github git portfolio linkedin profile online presence repository",
  "a": {"en": "Create a GitHub account, push every project with a clear README, and pin your best 3. On LinkedIn, add a clear headline, your projects and skills. A good online profile gets you noticed.",
        "hi": "GitHub account बनाओ, हर प्रोजेक्ट README के साथ push करो और 3 सबसे अच्छे pin करो। LinkedIn पर headline, projects और skills लिखो। अच्छी online profile से आप नज़र में आते हो।"}},
 {"id": "comm", "q": "communication english speaking fluency confidence soft skills presentation bolna angrezi",
  "a": {"en": "To improve communication: speak 10 minutes aloud daily, record yourself, read English articles, join a discussion group, and explain what you learn to a friend. Confidence comes from practice.",
        "hi": "Communication सुधारने के लिए: रोज़ 10 मिनट ज़ोर से बोलो, खुद को record करो, English लेख पढ़ो, discussion group जॉइन करो और जो सीखो दोस्त को समझाओ। आत्मविश्वास अभ्यास से आता है।"}},
 {"id": "data", "q": "data analyst data science analytics excel sql power bi machine learning ai डेटा",
  "a": {"en": "Data analyst path: Excel -> SQL -> Python (pandas) -> a visualization tool (Power BI or Tableau) -> statistics basics -> 3 projects with real datasets (Kaggle). Then learn machine learning if you like.",
        "hi": "Data analyst का रास्ता: Excel -> SQL -> Python (pandas) -> Power BI/Tableau -> statistics basics -> Kaggle के असली data पर 3 प्रोजेक्ट। फिर चाहो तो machine learning सीखो।"}},
 {"id": "motivation", "q": "motivation stress tension demotivated scared confused lost nervous anxiety fail failure give up dar ghabrahat pareshan निराश तनाव परेशान घबराहट उदास डर",
  "a": {"en": "It is normal to feel stuck, {name}. Break your goal into tiny daily steps, celebrate small wins, and compare yourself only with your past self. If the stress feels heavy, talk to a friend, a teacher or a family member. You are doing better than you think.",
        "hi": "अटका हुआ महसूस करना सामान्य है, {name}। लक्ष्य को छोटे रोज़ के कदमों में बाँटो, छोटी जीत मनाओ और खुद की तुलना बस अपने कल से करो। तनाव ज़्यादा लगे तो दोस्त, टीचर या घरवालों से बात करो। आप सोच से बेहतर कर रहे हो।"}},
 {"id": "time", "q": "time management routine daily schedule focus procrastination study habit consistency padhai routine",
  "a": {"en": "Daily routine: study in 45-minute blocks with 10-minute breaks, keep phone away, plan tomorrow's 3 tasks tonight, and track your streak on the Dashboard. Consistency beats long study hours.",
        "hi": "रोज़ का routine: 45 मिनट पढ़ो, 10 मिनट break लो, फोन दूर रखो, रात को कल के 3 काम तय करो और Dashboard पर streak देखो। ज़्यादा घंटों से ज़्यादा ज़रूरी है रोज़ पढ़ना।"}},
 {"id": "free", "q": "free resources courses youtube online learn platforms certification certificate मुफ्त कोर्स",
  "a": {"en": "Free resources: FreeCodeCamp, CS50 (Harvard), The Odin Project, YouTube channels, NPTEL, SWAYAM and GeeksforGeeks. See the Learning Resources screen for courses picked for you.",
        "hi": "मुफ़्त resources: FreeCodeCamp, CS50 (Harvard), The Odin Project, YouTube, NPTEL, SWAYAM और GeeksforGeeks। आपके लिए चुने कोर्स Learning Resources screen में देखो।"}},
 {"id": "salary", "q": "salary package high paying lpa earn money pay highest paid skills demand तनख्वाह",
  "a": {"en": "Salary depends on skills, projects and interview performance, not just the degree. High-demand skills now: DSA + a strong language, cloud basics, SQL, system design and AI/ML. Build proof with projects.",
        "hi": "तनख्वाह degree से ज़्यादा skills, projects और interview पर निर्भर करती है। अभी माँग वाली skills: DSA + मज़बूत भाषा, cloud basics, SQL, system design और AI/ML। प्रोजेक्ट से सबूत बनाओ।"}},
 {"id": "after", "q": "career options after bca bsc btech graduation 12th degree courses next what to do future भविष्य",
  "a": {"en": "After {edu}: you can go for software or web development, data analysis, testing/QA, cloud, or higher studies (MCA, MBA, M.Tech). Pick one direction for 6 months and go deep. Take the Skill Gap test to see your gaps.",
        "hi": "{edu} के बाद: software/web development, data analysis, testing/QA, cloud या आगे की पढ़ाई (MCA, MBA, M.Tech) के रास्ते हैं। 6 महीने के लिए एक दिशा चुनो और गहराई में जाओ। अपनी कमियाँ जानने के लिए Skill Gap देखो।"}},
]

# ---------- TF-IDF index ----------
_docs = [tok(e["q"]) for e in KB]
_N = len(_docs)
_df = Counter()
for _d in _docs:
    _df.update(set(_d))


def _idf(w):
    return math.log(1 + _N / (1 + _df.get(w, 0)))


def _vec(tokens):
    tf = Counter(tokens)
    v = {w: c * _idf(w) for w, c in tf.items()}
    n = math.sqrt(sum(x * x for x in v.values())) or 1
    return {w: x / n for w, x in v.items()}


_dvecs = [_vec(d) for d in _docs]
_dsets = [set(d) for d in _docs]


def search(text):
    qt = [w for w in tok(text) if w in _df]          # sirf wo shabd jo AI jaanta hai
    if not qt:
        return -1, 0.0
    qs = set(qt)
    qv = _vec(qt)
    tot = sum(_idf(w) for w in qs)
    best, bs = -1, 0.0
    for i, dv in enumerate(_dvecs):
        m = sum(_idf(w) for w in qs if w in _dsets[i])
        cos = sum(x * dv[w] for w, x in qv.items() if w in dv)
        frac = m / tot
        sc = frac + cos * 0.3                         # kitne shabd mile + cosine
        if frac >= 0.45 and cos >= 0.1 and sc > bs:
            bs, best = sc, i
    return best, bs


_DEFAULTS = {"name": "friend", "goal": "a software developer", "edu": "your studies"}


def _fill(t, ctx):
    return re.sub(r"\{(name|goal|edu)\}", lambda m: ctx.get(m.group(1)) or _DEFAULTS[m.group(1)], t)


HELLO = {"en": "Hi {name}! I'm Fugu, your AI career mentor. Ask me about skills, roadmap, resume, interviews or jobs.",
         "hi": "नमस्ते {name}! मैं Fugu हूँ, आपका AI करियर मेंटर। skills, roadmap, resume, interview या नौकरी के बारे में पूछो।"}
THANKS = {"en": "You're welcome, {name}! Keep going, one small step every day.",
          "hi": "आपका स्वागत है, {name}! रोज़ एक छोटा कदम चलते रहो।"}
_HELLO_RE = re.compile(r"^(hi+|hello+|hey+|hii+|namaste|namaskar|नमस्ते)(\W|$)", re.I)
_THANKS_RE = re.compile(r"(thanks?|thank you|shukriya|dhanyavad|धन्यवाद|शुक्रिया)", re.I)


def answer(message, ctx=None):
    """ctx = {name, goal, edu, lang, prev}  ->  {text, score, id} ya None"""
    ctx = ctx or {}
    lang = "hi" if ctx.get("lang") == "hi" else "en"
    m = str(message).strip()
    if _HELLO_RE.match(m) and len(tok(m)) <= 2:
        return {"text": _fill(HELLO[lang], ctx), "score": 1, "id": "hello"}
    if _THANKS_RE.search(m):
        return {"text": _fill(THANKS[lang], ctx), "score": 1, "id": "thanks"}
    i, score = search(m)
    if i < 0 and ctx.get("prev") and len(tok(m)) <= 3:   # chhota follow-up sawal
        i, score = search(ctx["prev"] + " " + m)
    if i < 0:
        try:
            with open(Path(__file__).parent / "unanswered.log", "a", encoding="utf-8") as f:
                f.write(json.dumps({"t": int(time.time() * 1000), "q": m[:200]}, ensure_ascii=False) + "\n")
        except OSError:
            pass
        return None
    e = KB[i]
    return {"text": _fill(e["a"].get(lang) or e["a"]["en"], ctx), "score": round(score, 2), "id": e["id"]}
    
