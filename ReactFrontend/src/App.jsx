import React, { useEffect, useRef, useState } from "react";
import founderPhoto from "./founder.jpg";
import fuguMascot from "./assets/fugu-mascot.svg";

// AI Bharat Mentor (ABM)
const API_BASE = ['localhost', '127.0.0.1'].includes(window.location.hostname) 
  ? '' 
  : 'https://ai-bharat-mentor-1.onrender.com';

const KEY = 'abm_react_v2';

/* ---------------- Helpers & Storage ---------------- */
const readLS = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
};

async function api(path, { token = '', headers = {}, ...options } = {}) {
  const isForm = options.body instanceof FormData;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(isForm ? {} : options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    }
  });
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : null;
  if (!res.ok) throw new Error(data?.error || `Request failed (HTTP ${res.status})`);
  if (data == null) throw new Error('Unexpected server response.');
  return data;
}

function youtubeEmbed(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    let id = '';
    if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
    else if (host === 'youtube.com' || host === 'm.youtube.com') {
      id = u.searchParams.get('v') || '';
      if (!id && /^\/(shorts|embed)\//.test(u.pathname)) id = u.pathname.split('/')[2];
    }
    return /^[\w-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : '';
  } catch { return ''; }
}

/* ---------------- Fugu Pufferfish SVG Component ---------------- */
function Fish({ size = 180, float = true }) {
  const spikes = [...Array(16)].map((_, i) => {
    const a = (i / 16) * 2 * Math.PI;
    const p = (r, d) => [100 + r * 62 * Math.cos(a + d), 90 + r * 55 * Math.sin(a + d)].join(",");
    return [p(1, -0.1), p(1.24, 0), p(1, 0.1)].join(" ");
  });
  return (
    <svg className={float ? "fish-float" : ""} width={size} viewBox="0 0 210 180" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="fb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7ea6f5" /><stop offset="1" stopColor="#3b6fe0" /></linearGradient>
        <linearGradient id="fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f4f8ff" /><stop offset="1" stopColor="#c9dcff" /></linearGradient>
      </defs>
      <polygon points="42,90 6,52 14,90 6,128" fill="#5b8cff" />
      {spikes.map((pts, i) => <polygon key={i} points={pts} fill="#22d3ee" opacity=".85" />)}
      <ellipse cx="100" cy="90" rx="62" ry="55" fill="url(#fb)" />
      <ellipse cx="104" cy="112" rx="44" ry="30" fill="url(#fl)" />
      <path d="M92 52 Q100 30 116 50 Q104 54 92 52Z" fill="#5b8cff" />
      <path d="M96 138 Q104 160 120 138Z" fill="#5b8cff" />
      <ellipse cx="96" cy="100" rx="14" ry="9" fill="#5b8cff" transform="rotate(25 96 100)" />
      <circle cx="132" cy="78" r="13" fill="#fff" /><circle cx="135" cy="78" r="7" fill="#0a1538" /><circle cx="137" cy="75" r="2.4" fill="#fff" />
      <circle cx="160" cy="98" r="7" fill="#0a1538" />
      <path d="M152 112 Q162 120 170 110" stroke="#0a1538" strokeWidth="3" fill="none" strokeLinecap="round" />
      <text x="106" y="122" textAnchor="middle" fontFamily="Inter" fontWeight="700" fontSize="20" fill="#3b6fe0">F</text>
    </svg>
  );
}

const Avatar = ({ z = 42 }) => (
  <div className="avatar-fugu" style={{ width: z, height: z }}>
    <Fish size={z * 1.1} float={false} />
  </div>
);

/* ---------------- Static Config ---------------- */
const MENU = [
  ['\u25a6', 'dashboard', 'Dashboard'],
  ['\u25c8', 'roadmap', 'Career Roadmap'],
  ['\u25a4', 'library', 'Study Library'],
  ['', 'chat', 'Fugu AI Mentor'],
  ['\u25c8', 'skills', 'Skill Analysis'],
  ['\u2197', 'progress', 'Progress'],
  ['\u25a3', 'resume', 'Resume Builder'],
  ['\u25c9', 'mock', 'Mock Interview'],
  ['\u2699', 'profile', 'Profile & Settings'],
  ['\u2726', 'founder', 'About Founder']
];

const QUESTIONS = {
  Technical: ['What is a REST API?', 'Explain Python lists vs tuples.', 'What is a primary key in SQL?', 'What is React state?'],
  HR: ['Tell me about yourself.', 'Why do you want this internship?', 'What motivates you?', 'Where do you see yourself in 5 years?'],
  Behavioral: ['Describe a problem you solved.', 'How do you handle deadlines?', 'Tell me about a challenge you overcame.', 'How do you accept criticism?']
};

const LANGUAGE_CODES = ['aa', 'ab', 'ae', 'af', 'ak', 'am', 'an', 'ar', 'as', 'av', 'ay', 'az', 'ba', 'be', 'bg', 'bh', 'bi', 'bm', 'bn', 'bo', 'br', 'bs', 'ca', 'ce', 'ch', 'co', 'cr', 'cs', 'cu', 'cv', 'cy', 'da', 'de', 'dv', 'dz', 'ee', 'el', 'en', 'eo', 'es', 'et', 'eu', 'fa', 'ff', 'fi', 'fj', 'fo', 'fr', 'fy', 'ga', 'gd', 'gl', 'gn', 'gu', 'gv', 'ha', 'he', 'hi', 'ho', 'hr', 'ht', 'hu', 'hy', 'hz', 'ia', 'id', 'ie', 'ig', 'ii', 'ik', 'io', 'is', 'it', 'iu', 'ja', 'jv', 'ka', 'kg', 'ki', 'kj', 'kk', 'kl', 'km', 'kn', 'ko', 'kr', 'ks', 'ku', 'kv', 'kw', 'ky', 'la', 'lb', 'lg', 'li', 'ln', 'lo', 'lt', 'lu', 'lv', 'mg', 'mh', 'mi', 'mk', 'ml', 'mn', 'mr', 'ms', 'mt', 'my', 'na', 'nb', 'nd', 'ne', 'ng', 'nl', 'nn', 'no', 'nr', 'nv', 'ny', 'oc', 'oj', 'om', 'or', 'os', 'pa', 'pi', 'pl', 'ps', 'pt', 'qu', 'rm', 'rn', 'ro', 'ru', 'rw', 'sa', 'sc', 'sd', 'se', 'sg', 'si', 'sk', 'sl', 'sm', 'sn', 'so', 'sq', 'sr', 'ss', 'st', 'su', 'sv', 'sw', 'ta', 'te', 'tg', 'th', 'ti', 'tk', 'tl', 'tn', 'to', 'tr', 'ts', 'tt', 'tw', 'ty', 'ug', 'uk', 'ur', 'uz', 've', 'vi', 'vo', 'wa', 'wo', 'xh', 'yi', 'yo', 'za', 'zh', 'zu', 'en-US', 'en-GB', 'en-IN', 'en-AU', 'en-CA', 'en-NZ', 'zh-CN', 'zh-TW', 'zh-HK', 'pt-BR', 'pt-PT', 'es-ES', 'es-MX', 'es-AR', 'fr-FR', 'fr-CA', 'ar-SA', 'ar-EG', 'ar-AE', 'de-DE', 'de-AT', 'de-CH', 'pa-IN', 'pa-PK', 'sr-Latn', 'sr-Cyrl', 'uz-Latn', 'uz-Cyrl', 'mn-MN', 'mn-CN', 'sw-KE', 'sw-TZ'].map(code => code);
const LANGUAGE_NAMES = new Intl.DisplayNames(["en"], { type: "language" });
const LANG_MAP = Object.fromEntries(LANGUAGE_CODES.map(code => {
  try { return [code, LANGUAGE_NAMES.of(code) || code]; }
  catch { return [code, code]; }
}));
LANG_MAP.auto = "Auto Detect";
LANG_MAP.hinglish = "Hinglish";

const DEFAULT_PROFILE = { name: 'Student', full: 'Student', email: '', edu: 'BCA Student', goal: 'Software Developer', city: 'Delhi', skills: ['Python', 'HTML', 'CSS'] };
const DEFAULT_RESUME = { name: '', title: 'BCA Student', education: 'Bachelor of Computer Applications', skills: 'Python, Flask, SQL, React', projects: 'AI Bharat Mentor Ã¢â‚¬â€ AI-powered career guidance platform', summary: 'Motivated student developer building accessible AI learning products.' };
const FALLBACK_SKILLS = [
  'Python', 'Java', 'C', 'C++', 'JavaScript',
  'HTML', 'CSS', 'React', 'Flask', 'Django',
  'SQL', 'MySQL', 'Excel', 'Power BI',
  'Machine Learning', 'Deep Learning',
  'Data Analysis', 'Statistics',
  'Communication', 'Problem Solving',
  'Git', 'GitHub', 'Data Structures',
  'Cloud Computing', 'Cybersecurity'
];
/* ---------------- Sub-Components ---------------- */
function ResourceCard({ item, canDelete, onDelete }) {
  const [playing, setPlaying] = useState(false);
  const fileUrl = item.fileUrl || item.file_url || (item.kind !== 'link' && item.id && !item.url ? `/api/library/${encodeURIComponent(item.id)}/file` : '');
  const url = item.url || fileUrl;
  const embed = youtubeEmbed(item.url || '');
  const isVideoFile = item.kind === 'video' && Boolean(fileUrl) && !item.url;
  const kindIcon = { video: '??', document: '??', image: '???', link: '??' }[item.kind] || '??';
  
  return (
    <div className="panel card">
      <div className="sp" style={{ marginBottom: 8 }}>
        <span className="chip">{kindIcon} {item.kind || 'Resource'}</span>
        <span className="muted small">{item.skill || 'General'}</span>
      </div>
      <h3 style={{ fontSize: 16, margin: '6px 0' }}>{item.title}</h3>
      <p className="muted small">{item.description || 'Explore this learning material.'}</p>
      <div className="row" style={{ marginTop: 12, gap: 8 }}>
        {embed && <button className="btn out small" onClick={() => setPlaying(!playing)}>{playing ? 'Hide' : '? Play'}</button>}
        {url && <a className="btn small" href={url} target="_blank" rel="noopener noreferrer">Open ?</a>}
        {canDelete && <button className="btn danger small" onClick={() => onDelete(item)}>Delete</button>}
      </div>
      {playing && embed && <div className="video-wrap" style={{ marginTop: 10 }}><iframe title={item.title} src={embed} allowFullScreen /></div>}
      {playing && !embed && isVideoFile && <video controls className="local-video" src={fileUrl} style={{ width: '100%', marginTop: 10 }}>Video unavailable.</video>}
    </div>
  );
}

function FounderSection({ navigate }) {
  return (
    <div className="founder-wrap">
      <div className="founder-img-col">
        <img src={founderPhoto} alt="Pari Saini" style={{ width: "100%", maxWidth: 420, height: "auto", objectFit: "contain", objectPosition: "center", borderRadius: 14, border: "2px solid var(--p)", background: "#070b1e", display: "block" }} />
      </div>
      <div>
        <span className="founder-kicker">Founder &amp; Developer Ã‚Â· AI Bharat Mentor</span>
        <h2 className="founder-name">Pari Saini</h2>
        <p className="founder-copy">Hi! I'm Pari, a second-year BCA student from Delhi and the solo founder of <strong>AI Bharat Mentor</strong>. I am building a career-guidance and learning platform to help students explore careers, develop skills, and prepare for their future.</p>
        <p className="founder-copy">I work on Python, Flask backend, MySQL, and FuguÃ¢â‚¬â€a local AI mentor powered by Ollama. My goal is to make career guidance practical, beginner-friendly, and accessible for everyone.</p>
        <div className="founder-chips">
          <span>?? BCA Student</span>
          <span>?? Python &amp; Flask</span>
          <span>??? MySQL</span>
          <span>?? Local AI</span>
          <span>?? Solo Founder</span>
        </div>
        {navigate && <button className="btn" style={{ marginTop: 14 }} onClick={() => navigate('dashboard')}>Explore Workspace ?</button>}
      </div>
    </div>
  );
}

/* ---------------- Main App Component ---------------- */
export default function App() {
  const saved = readLS(KEY, {});
  const [page, setPage] = useState('home');
  const [token, setToken] = useState(() => localStorage.getItem('abm_react_token') || '');
  const [account, setAccount] = useState(null);
  const [profile, setProfile] = useState(saved.u || DEFAULT_PROFILE);
  const [done, setDone] = useState(saved.dn || []);
  const [resume, setResume] = useState(saved.rs || DEFAULT_RESUME);
  const [mockHistory, setMockHistory] = useState(saved.mh || []);
  const [learningState, setLearningState] = useState(saved.lp || {});
  
  const [language, setLanguage] = useState('en');
  const [toast, setToast] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', edu: '', goal: '', city: '' });
  const [authBusy, setAuthBusy] = useState(false);

  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([{ role: 'assistant', content: "Hi! I'm Fugu ??, your AI career mentor. Ask me anything about your career or skills!" }]);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatLanguage, setChatLanguage] = useState('auto');
  const [translating, setTranslating] = useState({});

  // Library State
  const [library, setLibrary] = useState([]);
  const [libBusy, setLibBusy] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [adminOK, setAdminOK] = useState(false);

  // Roadmap State
  const [roadmapGoal, setRoadmapGoal] = useState(profile.goal);
  const [roadmapBusy, setRoadmapBusy] = useState(false);

  // Career Analysis State
  const [careerSkills, setCareerSkills] = useState([]);
  const [careerSelected, setCareerSelected] = useState([]);
  const [careerLoading, setCareerLoading] = useState(false);
  const [careerBusy, setCareerBusy] = useState(false);
  const [careerError, setCareerError] = useState('');
  const [careerResult, setCareerResult] = useState(null);
  const [careerAdvice, setCareerAdvice] = useState('');
  const [careerAdviceBusy, setCareerAdviceBusy] = useState(false);
  const [careerAdviceError, setCareerAdviceError] = useState('');
  const careerAdviceRequest = useRef(0);

  // Mock State
  const [mockKind, setMockKind] = useState('Technical');
  const [mockIndex, setMockIndex] = useState(0);
  const [mockAnswer, setMockAnswer] = useState('');
  const [mockAnswers, setMockAnswers] = useState([]);
  const [mockRunning, setMockRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(90);

  const cloudReady = useRef(false);

  const notify = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };
  const navigate = (p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  // Init & Sync
  useEffect(() => {
    async function init() {
      if (!token) { cloudReady.current = true; return; }
      try {
        const [me, state] = await Promise.all([api('/api/me', { token }), api('/api/state', { token })]);
        setAccount(me);
        if (state.u) setProfile(state.u);
        if (Array.isArray(state.dn)) setDone(state.dn);
        if (state.rs) setResume(state.rs);
        if (Array.isArray(state.mh)) setMockHistory(state.mh);
        if (state.lp) setLearningState(state.lp);
      } catch (err) {
        localStorage.removeItem('abm_react_token');
        setToken('');
      } finally { cloudReady.current = true; }
    }
    init();
  }, [token]);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify({ u: profile, dn: done, rs: resume, mh: mockHistory, lp: learningState }));
    if (!token || !cloudReady.current) return;
    const t = setTimeout(() => {
      api('/api/state', { token, method: 'PUT', body: JSON.stringify({ u: profile, dn: done, rs: resume, mh: mockHistory, lp: learningState }) }).catch(() => {});
    }, 1000);
    return () => clearTimeout(t);
  }, [profile, done, resume, mockHistory, learningState, token]);

  useEffect(() => {
    if (page === 'library') refreshLibrary();
  }, [page]);

  useEffect(() => {
    if (!mockRunning) return;
    const interval = setInterval(() => setTimeLeft(n => Math.max(0, n - 1)), 1000);
    return () => clearInterval(interval);
  }, [mockRunning, mockIndex]);

  useEffect(() => {
    let active = true;
    setCareerLoading(true);

    api('/api/career/skills')
      .then(data => {
        if (active) {
          setCareerSkills(Array.isArray(data.skills) ? data.skills : []);
        }
      })
      .catch(err => {
        if (active) setCareerError('Could not load career skills: ' + err.message);
      })
      .finally(() => {
        if (active) setCareerLoading(false);
      });

    return () => { active = false; };
  }, []);

  // Auth Handler
  async function handleAuth(e) {
    e.preventDefault();
    setAuthBusy(true);
    try {
      const isSignup = authMode === 'signup';
      const res = await api(`/api/auth/${isSignup ? 'signup' : 'login'}`, { method: 'POST', body: authForm });
      localStorage.setItem('abm_react_token', res.token);
      setToken(res.token);
      setAccount(res.user);
      if (res.state?.u) setProfile(res.state.u);
      else setProfile(prev => ({ ...prev, name: res.user.name || authForm.name, email: res.user.email }));
      notify(isSignup ? 'Account created successfully!' : 'Welcome back!');
      navigate('dashboard');
    } catch (err) { notify(err.message); }
    finally { setAuthBusy(false); }
  }

  function logout() {
    localStorage.removeItem('abm_react_token');
    setToken(''); setAccount(null);
    navigate('home'); notify('Logged out.');
  }

  // Fugu AI Chat Handler
  async function sendMessage(e) {
    e?.preventDefault();
    const message = chatInput.trim();
    if (!message || chatBusy) return;
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    setChatInput(''); setChatBusy(true);
    try {
      const res = await api('/api/chat', {
        token, method: 'POST',
        body: JSON.stringify({ message, lang: chatLanguage === "auto" ? "auto" : (LANG_MAP[chatLanguage] || chatLanguage), history: messages.slice(-6), profile })
      });
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply || res.answer || 'No response.' }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `?? ${err.message}. Please check server/Ollama connection.` }]);
    } finally { setChatBusy(false); }
  }

  async function translateMessage(index) {
    const item = messages[index];
    if (!item || translating[index]) return;
    setTranslating(prev => ({ ...prev, [index]: true }));
    try {
      const res = await api('/api/translate', {
        token,
        method: 'POST',
        body: JSON.stringify({
          text: item.content,
          target_lang: chatLanguage === 'auto' ? 'English' : (LANG_MAP[chatLanguage] || chatLanguage)
        })
      });
      setMessages(prev => prev.map((m, i) =>
        i === index ? { ...m, translated: res.translation || 'Translation unavailable.' } : m
      ));
    } catch (err) {
      notify('Translation failed: ' + err.message);
    } finally {
      setTranslating(prev => ({ ...prev, [index]: false }));
    }
  }

  // Library Handlers
  async function refreshLibrary() {
    setLibBusy(true);
    try {
      const data = await api('/api/library');
      if (Array.isArray(data)) setLibrary(data);
    } catch (err) { notify('Failed to fetch library.'); }
    finally { setLibBusy(false); }
  }

  async function uploadMaterial(e) {
    e.preventDefault();
    if (!adminOK) return;
    const data = new FormData(e.currentTarget);
    try {
      await api('/api/library', { method: 'POST', headers: { 'X-Admin-Key': adminKey }, body: data });
      notify('Material published!');
      e.currentTarget.reset();
      refreshLibrary();
    } catch (err) { notify(err.message); }
  }

  // Roadmap Generator
  async function generateFuguRoadmap() {
    if (!roadmapGoal.trim()) return notify('Enter a career goal first.');
    setRoadmapBusy(true);
    try {
      const prompt = `Create a 4-week structured study roadmap for a student aspiring to be a ${roadmapGoal}. Give specific weekly tasks and project goals.`;
      const res = await api('/api/chat', { token, method: 'POST', body: JSON.stringify({ message: prompt, lang: language, profile }) });
      setLearningState(prev => ({
        ...prev,
        fuguRoadmap: { goal: roadmapGoal, advice: res.reply || res.answer, generatedAt: new Date().toLocaleDateString() }
      }));
      notify('Roadmap generated by Fugu AI!');
    } catch (err) { notify(err.message); }
    finally { setRoadmapBusy(false); }
  }

  // Mock Interview Handlers
  function advanceMock() {
    const all = [...mockAnswers, mockAnswer.trim()];
    if (mockIndex + 1 < QUESTIONS[mockKind].length) {
      setMockAnswers(all); setMockAnswer(''); setMockIndex(mockIndex + 1); setTimeLeft(90);
    } else {
      const session = { id: Date.now(), kind: mockKind, date: new Date().toLocaleDateString(), count: all.filter(Boolean).length };
      setMockHistory(prev => [session, ...prev]);
      setMockRunning(false);
      notify('Interview completed!');
    }
  }

  function resultSkillList(value) {
    if (Array.isArray(value)) return value.map(String);
    if (value && typeof value === 'object') return Object.keys(value);
    return [];
  }

  async function analyzeCareerSkills() {
    if (!careerSelected.length) {
      setCareerError('Select at least one skill before analyzing.');
      return;
    }

    setCareerBusy(true);
    setCareerError('');
    setCareerResult(null);
    setCareerAdvice('');
    setCareerAdviceError('');
    careerAdviceRequest.current += 1;

    try {
      const result = await api('/api/career/recommend', {
        method: 'POST',
        body: JSON.stringify({ skills: careerSelected })
      });

      if (!result.recommended_career) {
        throw new Error('Career ML returned no recommendation.');
      }

      setCareerResult(result);
      setRoadmapGoal(result.recommended_career);
      void requestCareerAdvice(result, careerSelected);
    } catch (err) {
      setCareerError(err.message);
    } finally {
      setCareerBusy(false);
    }
  }

  async function requestCareerAdvice(result, skills) {
    const requestId = ++careerAdviceRequest.current;
    setCareerAdviceBusy(true);
    setCareerAdviceError('');
    setCareerAdvice('');

    const matched = resultSkillList(result.matched_skills).join(', ') || 'none';
    const missing = resultSkillList(result.missing_skills).join(', ') || 'none';

    const prompt = [
      'You are Fugu, an AI career coach. Give practical advice in simple English or Hinglish.',
      `Student goal: ${String(profile.goal || '').slice(0, 70)}.`,
      `Selected skills: ${skills.slice(0, 22).join(', ')}.`,
      `Recommended career: ${result.recommended_career}.`,
      `Matched skills: ${matched}. Missing skills: ${missing}.`,
      `Skill overlap: ${Number(result.skill_match_percentage || 0).toFixed(1)}%.`,
      'Give 3 skills to learn in order, a 4-week plan, and one free practice project.'
    ].join('\n').slice(0, 950);

    try {
      const response = await api('/api/chat', {
        token,
        method: 'POST',
        body: JSON.stringify({
          message: prompt,
          lang: language,
          history: [],
          profile
        })
      });

      const advice = String(response.reply || response.answer || '').trim();
      if (!advice) throw new Error('Fugu returned an empty response.');

      if (requestId === careerAdviceRequest.current) {
        setCareerAdvice(advice);
      }
    } catch (err) {
      if (requestId === careerAdviceRequest.current) {
        setCareerAdviceError(err.message);
      }
    } finally {
      if (requestId === careerAdviceRequest.current) {
        setCareerAdviceBusy(false);
      }
    }
  }

  /* ---------------- Page Router Render ---------------- */
  const renderContent = () => {
    switch (page) {
      case 'dashboard':
        return (
          <>
            <div className="sp">
              <div>
                <h2>Welcome back, {account?.name || profile.name || 'Learner'}! ??</h2>
                <p className="muted">Track your career goal and learning steps with Fugu AI.</p>
              </div>
              <Avatar z={56} />
            </div>
            <div className="g3" style={{ marginTop: 16 }}>
              <div className="panel">
                <span className="muted">Career Goal</span>
                <h3 style={{ margin: '6px 0' }}>{profile.goal || 'Software Developer'}</h3>
                <button className="btn out small" onClick={() => navigate('roadmap')}>View Roadmap ?</button>
              </div>
              <div className="panel">
                <span className="muted">Current Study Goal</span>
                <h3 style={{ margin: '6px 0' }}>{learningState.fuguRoadmap ? learningState.fuguRoadmap.goal : 'Not Started'}</h3>
                <button className="btn out small" onClick={() => navigate('roadmap')}>Generate Plan ?</button>
              </div>
              <div className="panel">
                <span className="muted">Mock Interviews</span>
                <h3 style={{ margin: '6px 0' }}>{mockHistory.length} Completed</h3>
                <button className="btn out small" onClick={() => navigate('mock')}>Practice ?</button>
              </div>
            </div>
            <h3 style={{ marginTop: 24 }}>Quick Actions</h3>
            <div className="g3" style={{ marginTop: 10 }}>
              {[
                ['', 'Fugu AI Mentor', 'chat'],
                ['\u{1F4DA}', 'Study Library', 'library'],
                ['\u{1F5FA}', 'Career Roadmap', 'roadmap'],
                ['\u{1F4C4}', 'Resume Builder', 'resume'],
                ['\u{1F3A4}', 'Mock Interview', 'mock'],
                ['\u{1F4CA}', 'Skill Analysis', 'skills']
              ].map(item => (
                <div key={item[2]} className="panel card clickable" onClick={() => navigate(item[2])}>
                  <span style={{ fontSize: 24 }}>{item[2] === "chat" ? <img src={fuguMascot} alt="Fugu" style={{ width: 38, height: 38, objectFit: "contain", verticalAlign: "middle" }} /> : item[0]}</span>
                  <b style={{ display: 'block', marginTop: 8 }}>{item[1]}</b>
                </div>
              ))}
            </div>
          </>
        );

      case 'skills':
        return (
          <>
            <div className="sp">
              <div>
                <h2>Skill Analysis</h2>
                <p className="muted">Select the skills you already know. Fugu will help identify a suitable career path.</p>
              </div>
              <span className="chip">{careerSelected.length} selected</span>
            </div>

            <div className="panel" style={{ marginTop: 14 }}>
              <h3>Choose Your Skills</h3>
              {careerLoading ? (
                <p className="muted">Loading skills...</p>
              ) : careerSkills.length ? (
                <div className="g3" style={{ marginTop: 12 }}>
                  {careerSkills.map(skill => (
                    <label key={skill} className="panel card" style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={careerSelected.includes(skill)}
                        onChange={e => {
                          setCareerSelected(prev =>
                            e.target.checked
                              ? [...prev, skill]
                              : prev.filter(item => item !== skill)
                          );
                          setCareerError('');
                        }}
                      />
                      <span>{skill}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="muted">No skills are available right now. Please try again later.</p>
              )}

              <button
                className="btn"
                style={{ marginTop: 16 }}
                onClick={analyzeCareerSkills}
                disabled={careerBusy || careerLoading || !careerSelected.length}
              >
                {careerBusy ? 'Analyzing...' : 'Analyze My Skills'}
              </button>

              {careerError && <p className="small" style={{ color: '#ff8b8b', marginTop: 10 }}>{careerError}</p>}
            </div>

            {careerResult && (
              <div className="panel" style={{ marginTop: 16 }}>
                <h3>Your Career Recommendation</h3>
                <h2 style={{ color: 'var(--cyan)', margin: '10px 0' }}>{careerResult.recommended_career}</h2>
                <p className="muted">
                  Skill match: {Number(careerResult.skill_match_percentage || 0).toFixed(1)}%
                </p>
                <div className="g2" style={{ marginTop: 12 }}>
                  <div>
                    <b>Matched Skills</b>
                    <p className="muted small">{resultSkillList(careerResult.matched_skills).join(', ') || 'None'}</p>
                  </div>
                  <div>
                    <b>Skills to Improve</b>
                    <p className="muted small">{resultSkillList(careerResult.missing_skills).join(', ') || 'None'}</p>
                  </div>
                </div>
                <button className="btn out small" onClick={() => navigate('roadmap')} style={{ marginTop: 10 }}>
                  Create Career Roadmap
                </button>
              </div>
            )}

            {(careerAdviceBusy || careerAdvice || careerAdviceError) && (
              <div className="panel" style={{ marginTop: 16 }}>
                <h3>Fugu AI Career Guidance</h3>
                {careerAdviceBusy && <p className="muted">Fugu is preparing your personalized advice...</p>}
                {careerAdvice && <div className="ai-box" style={{ whiteSpace: 'pre-wrap', marginTop: 10 }}>{careerAdvice}</div>}
                {careerAdviceError && <p className="small" style={{ color: '#ff8b8b' }}>{careerAdviceError}</p>}
              </div>
            )}
          </>
        );

      case 'roadmap':
        return (
          <>
            <h2>?? Career Roadmap Generator</h2>
            <div className="panel" style={{ marginTop: 14 }}>
              <label className="muted">Target Career Goal</label>
              <div className="row" style={{ marginTop: 6, gap: 10 }}>
                <input className="in2" value={roadmapGoal} onChange={e => setRoadmapGoal(e.target.value)} placeholder="e.g. Software Developer, Data Analyst" />
                <button className="btn" onClick={generateFuguRoadmap} disabled={roadmapBusy}>
                  {roadmapBusy ? 'Fugu is thinking...' : 'Generate with Fugu AI ??'}
                </button>
              </div>
            </div>
            {learningState.fuguRoadmap && (
              <div className="panel" style={{ marginTop: 16 }}>
                <h3>?? Fugu AI Study Roadmap: {learningState.fuguRoadmap.goal}</h3>
                <p className="muted small">Created on {learningState.fuguRoadmap.generatedAt}</p>
                <div className="ai-box" style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>
                  {learningState.fuguRoadmap.advice}
                </div>
              </div>
            )}
          </>
        );

      case 'library':
        return (
          <>
            <div className="sp">
              <h2>?? Study Library</h2>
              <button className="btn out small" onClick={refreshLibrary}>{libBusy ? 'Refreshing...' : 'Refresh'}</button>
            </div>
            <div className="g3" style={{ marginTop: 16 }}>
              {library.length ? library.map(item => (
                <ResourceCard key={item.id} item={item} canDelete={adminOK} onDelete={async (i) => {
                  try {
                    await api(`/api/library/${encodeURIComponent(i.id)}`, { method: 'DELETE', headers: { 'X-Admin-Key': adminKey } });
                    refreshLibrary();
                  } catch (e) { notify(e.message); }
                }} />
              )) : <p className="muted">No study materials available yet.</p>}
            </div>

            <div className="panel" style={{ marginTop: 24 }}>
              <h3>?? Founder Admin Controls</h3>
              {!adminOK ? (
                <div className="row" style={{ marginTop: 10 }}>
                  <input className="in2" type="password" placeholder="Private Admin Key" value={adminKey} onChange={e => setAdminKey(e.target.value)} />
                  <button className="btn" onClick={async () => {
                    try {
                      await api('/api/library/admin-check', { headers: { 'X-Admin-Key': adminKey } });
                      setAdminOK(true); notify('Admin verified!');
                    } catch (e) { notify('Invalid Key'); }
                  }}>Verify Admin</button>
                </div>
              ) : (
                <form onSubmit={uploadMaterial} style={{ display: 'grid', gap: 10, marginTop: 10 }}>
                  <input className="in2" name="title" required placeholder="Title" />
                  <input className="in2" name="skill" placeholder="Skill / Topic" />
                  <select className="in2" name="kind">
                    <option value="video">Video</option>
                    <option value="document">Document / PDF</option>
                    <option value="link">Link</option>
                  </select>
                  <input className="in2" name="url" placeholder="URL (e.g. YouTube Link)" />
                  <button className="btn" type="submit">Publish Resource</button>
                </form>
              )}
            </div>
          </>
        );

      case 'chat':
        return (
          <>
            <div className="sp" style={{ justifyContent: 'flex-start', gap: 12 }}>
              <Avatar z={48} />
              <div>
                <h2>Fugu AI Mentor</h2>
                <span className="chip">Fugu language</span>
                <select className="in2" style={{ marginTop: 8, maxWidth: 230 }} value={chatLanguage} onChange={e => setChatLanguage(e.target.value)}>
                  <option value="auto">Auto Detect</option>
                  {Object.entries(LANG_MAP).filter(([code]) => code !== "auto").map(([code, name]) => <option key={code} value={code}>{name} ({code})</option>)}
                </select>
              </div>
            </div>
            <div className="panel chat-box" style={{ marginTop: 14 }}>
              <div className="messages-list">
                {messages.map((m, i) => (
                  <div key={i} className={`msg ${m.role === 'user' ? 'u' : 'b'}`}>
                    {m.role === 'assistant' && <b>Fugu: </b>}
                    <span style={{ whiteSpace: 'pre-wrap' }}>{m.content}</span>
                    <div style={{ marginTop: 6 }}>
                      <button type="button" className="btn" style={{ padding: "4px 9px", fontSize: 12 }} onClick={() => translateMessage(i)} disabled={!!translating[i]}>{translating[i] ? "Translating..." : "Translate"}</button>
                    </div>
                    {m.translated && <div className="panel" style={{ marginTop: 8, padding: 10 }}><b>Translation:</b><div style={{ whiteSpace: "pre-wrap" }}>{m.translated}</div></div>}
                  </div>
                ))}
                {chatBusy && <div className="msg b">Fugu is thinking...</div>}
              </div>
              <form className="ci" onSubmit={sendMessage}>
                <input className="in2" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Ask Fugu anything..." />
                <button className="btn" type="submit" disabled={chatBusy || !chatInput.trim()}>Send ?</button>
              </form>
            </div>
          </>
        );

      case 'resume':
        return (
          <>
            <h2>?? Resume Builder</h2>
            <div className="g2" style={{ marginTop: 14 }}>
              <div className="panel form-grid">
                <label className="muted">Full Name</label>
                <input className="in2" value={resume.name} onChange={e => setResume({ ...resume, name: e.target.value })} />
                <label className="muted">Title</label>
                <input className="in2" value={resume.title} onChange={e => setResume({ ...resume, title: e.target.value })} />
                <label className="muted">Education</label>
                <input className="in2" value={resume.education} onChange={e => setResume({ ...resume, education: e.target.value })} />
                <label className="muted">Skills</label>
                <input className="in2" value={resume.skills} onChange={e => setResume({ ...resume, skills: e.target.value })} />
                <label className="muted">Summary</label>
                <textarea className="in2" rows="3" value={resume.summary} onChange={e => setResume({ ...resume, summary: e.target.value })} />
                <button
  className="btn"
  onClick={() => window.print()}
  style={{ marginTop: 10 }}
>
  📄 Print / Save PDF
</button>
              </div>
              <div id="resume-paper" className="paper">
                <h2>{resume.name || profile.full || 'Your Name'}</h2>
                <p><i>{resume.title}</i></p>
                <hr />
                <h4>Summary</h4><p>{resume.summary}</p>
                <h4>Education</h4><p>{resume.education}</p>
                <h4>Skills</h4><p>{resume.skills}</p>
              </div>
            </div>
          </>
        );

      case 'mock':
        return (
          <>
            <h2>?? Mock Interview</h2>
            {!mockRunning ? (
              <div className="panel" style={{ marginTop: 14 }}>
                <h3>Choose Topic</h3>
                <div className="row" style={{ gap: 10, margin: '12px 0' }}>
                  {Object.keys(QUESTIONS).map(k => (
                    <button key={k} className={`btn ${mockKind === k ? '' : 'out'}`} onClick={() => setMockKind(k)}>{k}</button>
                  ))}
                </div>
                <button className="btn" onClick={() => { setMockIndex(0); setMockAnswers([]); setMockAnswer(''); setTimeLeft(90); setMockRunning(true); }}>Start Practice ?</button>
              </div>
            ) : (
              <div className="panel" style={{ marginTop: 14 }}>
                <div className="sp">
                  <b>Question {mockIndex + 1}/{QUESTIONS[mockKind].length}</b>
                  <span className="chip">? {timeLeft}s</span>
                </div>
                <h3 style={{ margin: '16px 0' }}>{QUESTIONS[mockKind][mockIndex]}</h3>
                <textarea className="in2" rows="5" value={mockAnswer} onChange={e => setMockAnswer(e.target.value)} placeholder="Type your answer here..." />
                <div className="row" style={{ marginTop: 12, justifyContent: 'space-between' }}>
                  <button className="btn out" onClick={() => setMockRunning(false)}>Quit</button>
                  <button className="btn" onClick={advanceMock}>{mockIndex + 1 < QUESTIONS[mockKind].length ? 'Next Question ?' : 'Finish Test'}</button>
                </div>
              </div>
            )}
          </>
        );

      case 'founder':
        return <FounderSection navigate={navigate} />;

      default:
        return (
          <div className="panel">
            <h2>{page.toUpperCase()}</h2>
            <p className="muted">This feature is fully integrated with your data profile.</p>
          </div>
        );
    }
  };

  /* ---------------- Main Layout Output ---------------- */
  return (
    <>
      <style>{CSS}</style>

      {page === 'home' ? (
        <div className="landing-page">
          <nav className="nav-bar">
            <div className="brand-title">
              <Avatar z={32} />
              <b>AI Bharat Mentor</b>
            </div>
            <div className="row" style={{ gap: 16 }}>
              <button className="btn out small" onClick={() => navigate('founder')}>Founder</button>
              <button className="btn out small" onClick={() => navigate('login')}>Log In</button>
              <button className="btn small" onClick={() => navigate(token ? 'dashboard' : 'login')}>Get Started ?</button>
            </div>
          </nav>

          <header className="hero-section landing-hero">
  <div className="landing-copy">
    <span className="pill">âœ¦ AI-Powered Success Mentor</span>
    <h1>Your Future<br /><em className="cy-text">Starts Here.</em></h1>
    <p className="sub">
      Discover your strengths. Build real skills. Prepare for your dream career.
      Your personal AI-powered companion for learning, growth and success.
    </p>
    <div className="row landing-actions">
      <button className="btn lav" onClick={() => navigate(token ? 'dashboard' : 'login')}>
        Start Learning Free â†’
      </button>
      <button className="btn out" onClick={() => navigate('founder')}>
        Meet the Founder
      </button>
    </div>
    <div className="hero-trust">
      <span>âœ¦ Learn</span>
      <span>âœ¦ Improve</span>
      <span>âœ¦ Prepare</span>
      <span>âœ¦ Grow</span>
    </div>
  </div>
  <div className="landing-visual">
    <div className="fugu-glow"></div>
    <div className="fugu-orbit orbit-one"></div>
    <div className="fugu-orbit orbit-two"></div>
    <div className="fugu-mascot">
      <Fish size={260} />
    </div>
    <span className="float-tag tag-top">âœ¦ Your AI Companion</span>
    <span className="float-tag tag-bottom">ðŸš€ Build Your Future</span>
  </div>
</header>

<section className="module-section">
  <div className="module-heading">
    <span className="pill">YOUR GROWTH JOURNEY</span>
    <h2>Explore Your <em className="cy-text">Learning Modules</em></h2>
    <p>Everything you need to learn, prepare and move closer to your dream career.</p>
  </div>

  <div className="module-grid">
    <button type="button" className="module-card" onClick={() => navigate('chat')}>
      <span className="module-icon purple-icon">ðŸ¤–</span>
      <b>Fugu AI Mentor</b>
      <span>Get personal guidance and instant learning support.</span>
      <small>Explore Mentor â†’</small>
    </button>

    <button type="button" className="module-card" onClick={() => navigate('roadmap')}>
      <span className="module-icon blue-icon">ðŸ§­</span>
      <b>Career Roadmap</b>
      <span>Discover your career path with a step-by-step plan.</span>
      <small>Build Your Roadmap â†’</small>
    </button>

    <button type="button" className="module-card" onClick={() => navigate('skills')}>
      <span className="module-icon cyan-icon">ðŸ“Š</span>
      <b>Skill Analysis</b>
      <span>Understand your strengths and skills to improve.</span>
      <small>Analyze Skills â†’</small>
    </button>

    <button type="button" className="module-card" onClick={() => navigate('library')}>
      <span className="module-icon blue-icon">ðŸ“š</span>
      <b>Study Library</b>
      <span>Explore learning resources and study materials.</span>
      <small>Start Learning â†’</small>
    </button>

    <button type="button" className="module-card" onClick={() => navigate('resume')}>
      <span className="module-icon purple-icon">ðŸ“„</span>
      <b>Resume Builder</b>
      <span>Create a professional resume for opportunities.</span>
      <small>Create Resume â†’</small>
    </button>

    <button type="button" className="module-card" onClick={() => navigate('mock')}>
      <span className="module-icon cyan-icon">ðŸŽ¤</span>
      <b>Mock Interview</b>
      <span>Practice interviews and build your confidence.</span>
      <small>Practice Now â†’</small>
    </button>

    <button type="button" className="module-card" onClick={() => navigate('progress')}>
      <span className="module-icon blue-icon">ðŸ“ˆ</span>
      <b>Progress Tracker</b>
      <span>Track your learning journey and achievements.</span>
      <small>View Progress â†’</small>
    </button>
  </div>
</section>
          <FounderSection navigate={navigate} />
        </div>
      ) : page === 'login' ? (
        <div className="split-auth">
          <div className="auth-left">
            <div className="brand-title"><Avatar z={36} /> <b>AI Bharat Mentor</b></div>
            <div className="auth-hero-box">
              <h1>Learn Today.<br /><em className="cy-text">Lead Tomorrow.</em></h1>
              <p className="sub">Sign in to sync your roadmaps, skill tracking, and AI mentor chat.</p>
              <Fish size={180} />
            </div>
          </div>
          <div className="auth-right">
            <button className="back-btn" onClick={() => navigate('home')}>? Back to Home</button>
            <form className="auth-box panel" onSubmit={handleAuth}>
              <h2>{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
              {authMode === 'signup' && (
                <>
                  <label className="muted">Full Name</label>
                  <input className="in2" required value={authForm.name} onChange={e => setAuthForm({ ...authForm, name: e.target.value })} />
                </>
              )}
              <label className="muted">Email Address</label>
              <input className="in2" type="email" required value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} />
              <label className="muted">Password</label>
              <input className="in2" type="password" required value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} />
              <button className="btn lav" type="submit" disabled={authBusy} style={{ marginTop: 10 }}>
                {authBusy ? 'Please wait...' : authMode === 'login' ? 'Log In' : 'Sign Up'}
              </button>
              <p className="muted small" style={{ textAlign: 'center', marginTop: 10 }}>
                {authMode === 'login' ? "Don't have an account? " : "Already registered? "}
                <a style={{ color: '#22d3ee' }} onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}>
                  {authMode === 'login' ? 'Sign Up' : 'Log In'}
                </a>
              </p>
            </form>
          </div>
        </div>
      ) : (
        <div className="app-shell">
          <aside className="sidebar">
            <div className="brand-title" onClick={() => navigate('home')} style={{ cursor: 'pointer' }}>
              <Avatar z={32} />
              <div>
                <b>AI Bharat Mentor</b>
                <small style={{ fontSize: 9, display: 'block', color: '#9fb0d6' }}>LEARN Ã‚Â· GROW Ã‚Â· ACHIEVE</small>
              </div>
            </div>
            <nav className="side-nav">
              {MENU.map(n => (
                <a key={n[1]} className={page === n[1] ? 'on' : ''} onClick={() => navigate(n[1])}>
                  <span>{n[1] === "chat" ? <img src={fuguMascot} alt="Fugu" style={{ width: 25, height: 25, objectFit: "contain", verticalAlign: "middle" }} /> : n[0]}</span> {n[2]}
                </a>
              ))}
            </nav>
          </aside>
          <main className="main-content">
            <header className="top-bar">
              <span className="muted">Workspace / {MENU.find(m => m[1] === page)?.[2] || 'Page'}</span>
              <div className="row" style={{ gap: 12 }}>
                <select value={language} onChange={e => setLanguage(e.target.value)}>
                  {Object.entries(LANG_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <div className="user-badge" onClick={() => navigate('profile')}>
                  {(account?.name || profile.name || 'S')[0].toUpperCase()}
                </div>
              </div>
            </header>
            <div className="page-body">{renderContent()}</div>
          </main>
        </div>
      )}

      {toast && <div className="toast-popup">{toast}</div>}
    </>
  );
}

/* ---------------- Integrated Stylesheet ---------------- */
const CSS = `
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");
:root { --bg:#060f2b; --panel:#0d1a40; --p:#7C4DFF; --cy:#22d3ee; --lav:#a5a8f5; --t2:#9fb0d6; --line:#ffffff22; }
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Inter', sans-serif; background:var(--bg); color:#fff; min-height:100vh; }
a { color:inherit; text-decoration:none; cursor:pointer; }
.btn { border:0; border-radius:9px; padding:10px 18px; font:600 13px Inter; cursor:pointer; color:#fff; background:var(--p); display:inline-block; text-align:center; }
.btn.lav { background:var(--lav); color:#060f2b; }
.btn.out { background:transparent; border:1px solid #ffffff33; }
.btn.small { padding:6px 12px; font-size:12px; }
.btn.danger { background:#ef4444; }
.in2 { width:100%; background:#122354; border:1px solid var(--line); border-radius:8px; padding:10px; color:#fff; font:13px Inter; outline:0; }
.in2:focus { border-color:var(--cy); }
select.in2, select { background:#122354; color:#fff; border:1px solid var(--line); border-radius:8px; padding:8px; font:12px Inter; }
.fish-float { animation: fl 4s ease-in-out infinite; filter: drop-shadow(0 0 25px #3b82f6aa); }
@keyframes fl { 50% { transform: translateY(-10px); } }
.avatar-fugu { border-radius:50%; background:#102256; border:2px solid var(--cy); display:grid; place-items:center; overflow:hidden; }
.sp { display:flex; justify-content:space-between; align-items:center; }
.row { display:flex; align-items:center; }
.g2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.g3 { display:grid; grid-template-columns:repeat(3, 1fr); gap:14px; }
.panel { background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:18px; }
.panel.card.clickable { cursor:pointer; transition:transform 0.2s; }
.panel.card.clickable:hover { transform:translateY(-3px); border-color:var(--cy); }
.muted { color:var(--t2); font-size:13px; }
.small { font-size:12px; }
.chip { display:inline-block; padding:3px 9px; border-radius:6px; background:#ffffff15; font-size:11px; }
.pill { border:1px solid var(--cy); color:var(--cy); font-size:11px; padding:5px 12px; border-radius:20px; font-weight:600; }
.cy-text { color:var(--cy); font-style:normal; }
.landing-page { min-height:100vh; background:radial-gradient(ellipse at 50% 20%, #173780 0%, var(--bg) 70%); }
.nav-bar { display:flex; justify-content:space-between; align-items:center; padding:18px 6vw; }
.brand-title { display:flex; align-items:center; gap:10px; font-size:15px; }
.hero-section { text-align:center; padding:60px 4vw 40px; }
.hero-section h1 { font-size:clamp(36px, 5vw, 60px); margin:18px 0; line-height:1.1; }
.sub { max-width:480px; margin:0 auto 24px; color:var(--t2); font-size:15px; }
.split-auth { display:grid; grid-template-columns:1fr 1fr; min-height:100vh; }
.auth-left { background:radial-gradient(circle at 30% 50%, #1e459c, #07133b); padding:40px; display:flex; flex-direction:column; justify-content:space-between; }
.auth-right { background:var(--bg); padding:40px; display:flex; flex-direction:column; justify-content:center; position:relative; }
.auth-box { width:100%; max-width:360px; margin:0 auto; display:grid; gap:12px; }
.back-btn { position:absolute; top:24px; left:24px; background:none; border:0; color:var(--t2); cursor:pointer; font-size:13px; }
.app-shell { display:grid; grid-template-columns:240px 1fr; min-height:100vh; }
.sidebar { background:#040a1f; border-right:1px solid var(--line); padding:20px 14px; }
.side-nav { margin-top:24px; display:grid; gap:4px; }
.side-nav a { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:8px; font-size:13px; color:var(--t2); }
.side-nav a.on, .side-nav a:hover { background:var(--p); color:#fff; }
.main-content { display:flex; flex-direction:column; }
.top-bar { padding:16px 24px; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; align-items:center; }
.user-badge { width:32px; height:32px; border-radius:50%; background:var(--p); display:grid; place-items:center; font-weight:700; cursor:pointer; }
.page-body { padding:24px; flex:1; }
.chat-box { height:480px; display:flex; flex-direction:column; }
.messages-list { flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:10px; padding-right:6px; }
.msg { padding:10px 14px; border-radius:10px; font-size:13px; max-width:80%; line-height:1.4; }
.msg.u { background:var(--p); margin-left:auto; }
.msg.b { background:#122554; }
.ci { display:flex; gap:8px; margin-top:12px; }
.paper { background:#fff; color:#111; padding:24px; border-radius:8px; font-size:13px; line-height:1.6; }
.video-wrap iframe { width:100%; height:200px; border:0; border-radius:8px; }
.toast-popup { position:fixed; bottom:20px; right:20px; background:var(--p); color:#fff; padding:12px 20px; border-radius:8px; font-size:13px; z-index:99; box-shadow:0 4px 12px #000; }
.founder-wrap { display:grid; grid-template-columns:220px 1fr; gap:24px; background:linear-gradient(135deg, #0d1a40, #131038); border:1px solid var(--p); border-radius:18px; padding:28px; margin:40px 6vw; align-items:center; }
.founder-img-col { display:grid; place-items:center; }
.founder-kicker { color:var(--cy); font-size:11px; font-weight:700; letter-spacing:1px; text-transform:uppercase; }
.founder-name { font-size:28px; margin:6px 0; }
.founder-copy { font-size:13px; color:#c8d5f2; line-height:1.6; margin-bottom:8px; }
.founder-chips { display:flex; gap:6px; flex-wrap:wrap; margin-top:12px; }
.founder-chips span { border:1px solid var(--p); background:#7C4DFF22; border-radius:20px; padding:4px 10px; font-size:11px; }
/* ===== AI Bharat Mentor New Landing Design ===== */
.landing-page {
  background:
    radial-gradient(ellipse at 78% 22%, #172b67 0%, transparent 38%),
    radial-gradient(ellipse at 15% 5%, #21134d 0%, transparent 38%),
    #070b1e;
  overflow: hidden;
}
.landing-hero {
  max-width: 1240px;
  margin: 0 auto;
  min-height: 490px;
  padding: 65px 6vw 55px;
  display: grid;
  grid-template-columns: 1.05fr .95fr;
  align-items: center;
  gap: 35px;
  text-align: left;
}
.landing-copy { position: relative; z-index: 2; }
.landing-copy h1 {
  font-size: clamp(42px, 5.5vw, 70px);
  line-height: 1.06;
  letter-spacing: -2px;
  margin: 22px 0;
  color: #f6f7ff;
}
.landing-copy .sub {
  max-width: 510px;
  margin: 0 0 27px;
  line-height: 1.8;
  font-size: 15px;
}
.landing-actions { justify-content: flex-start; gap: 13px; flex-wrap: wrap; }
.hero-trust { display:flex; gap:20px; flex-wrap:wrap; margin-top:30px; color:#aebde8; font-size:12px; }
.hero-trust span { color:#9eaff0; }
.landing-visual {
  min-height: 340px;
  position: relative;
  display: grid;
  place-items: center;
}
.fugu-glow {
  position:absolute;
  width:280px;
  height:280px;
  border-radius:50%;
  background:radial-gradient(circle,#4c43c7 0%,#263c91 35%,transparent 72%);
  filter:blur(18px);
  opacity:.8;
}
.fugu-mascot { position:relative; z-index:2; animation:fl 4s ease-in-out infinite; filter:drop-shadow(0 0 25px #6555ff66); }
.fugu-orbit {
  position:absolute;
  width:330px;
  height:170px;
  border:1px solid #8294ff44;
  border-radius:50%;
  transform:rotate(-22deg);
}
.orbit-two { transform:rotate(35deg); width:290px; height:210px; border-color:#38d6e844; }
.float-tag {
  position:absolute;
  z-index:3;
  padding:10px 14px;
  border:1px solid #6579d966;
  background:#101c42dd;
  border-radius:12px;
  color:#e5eaff;
  font-size:11px;
  box-shadow:0 8px 30px #0005;
}
.tag-top { top:35px; right:0; }
.tag-bottom { bottom:35px; left:0; }
.module-section {
  max-width:1240px;
  margin:0 auto;
  padding:48px 6vw 65px;
}
.module-heading { text-align:center; margin-bottom:32px; }
.module-heading h2 { font-size:clamp(25px,3vw,36px); margin:15px 0 9px; }
.module-heading p { color:var(--t2); font-size:13px; line-height:1.7; }
.module-grid {
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:16px;
}
.module-card {
  min-width:0;
  text-align:left;
  display:flex;
  flex-direction:column;
  align-items:flex-start;
  gap:11px;
  padding:21px;
  min-height:190px;
  color:#f4f6ff;
  background:linear-gradient(145deg,#111d40,#0c1430);
  border:1px solid #34447788;
  border-radius:16px;
  cursor:pointer;
  font-family:inherit;
  transition:transform .22s ease,border-color .22s ease,box-shadow .22s ease;
}
.module-card:hover {
  transform:translateY(-5px);
  border-color:#8b69ff;
  box-shadow:0 12px 35px #6d4cff22;
}
.module-card b { font-size:15px; }
.module-card > span:not(.module-icon) { color:#aebbdc; font-size:12px; line-height:1.6; }
.module-card small { color:#67d9f0; font-size:11px; font-weight:700; margin-top:auto; }
.module-icon {
  width:43px;
  height:43px;
  border-radius:12px;
  display:grid;
  place-items:center;
  font-size:21px;
  background:#8055ff22;
}
.blue-icon { background:#397bff25; }
.cyan-icon { background:#25c6d925; }
.module-card:nth-child(5) { grid-column:2; }

@media(max-width:900px) {
  .module-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .module-card:nth-child(5) { grid-column:auto; }
}
@media(max-width:800px) {
  .landing-hero { grid-template-columns:1fr; text-align:center; padding-top:45px; }
  .landing-copy .sub { margin-left:auto; margin-right:auto; }
  .landing-actions { justify-content:center; }
  .hero-trust { justify-content:center; }
  .landing-visual { min-height:280px; }
  .fugu-mascot :is(svg) { max-width:210px; }
  .module-section { padding-top:30px; }
}
@media(max-width:480px) {
  .module-grid { grid-template-columns:1fr; }
  .module-card { min-height:160px; }
  .landing-copy h1 { letter-spacing:-1px; }
  .float-tag { font-size:10px; }
}
/* ===== End New Landing Design ===== */
@media(max-width:800px) {
  .app-shell, .split-auth, .g2, .g3, .founder-wrap { grid-template-columns:1fr !important; }
  .sidebar { display:none; }
}
`;
