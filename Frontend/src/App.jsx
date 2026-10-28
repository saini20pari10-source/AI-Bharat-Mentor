import React, { useEffect, useRef, useState } from 'react';

// AI Bharat Mentor (ABM) — React frontend for existing Flask server.py
// Start Flask on :5000 and Vite on :5173. No API keys are hard-coded here.

const MENU = [
  ['🏠', 'dashboard', 'Dashboard'], ['🧭', 'roadmap', 'Career Roadmap'],
  ['📚', 'library', 'Study Library'], ['🤖', 'chat', 'Fugu AI Mentor'],
  ['📊', 'skills', 'Skill Analysis'], ['📈', 'progress', 'Progress'],
  ['📄', 'resume', 'Resume Builder'], ['🎤', 'mock', 'Mock Interview'],
  ['👤', 'profile', 'Profile & Settings'], ['✨', 'founder', 'About Founder']
];
const ROADMAP = [
  ['Python Basics', 'Learn variables, loops, functions and files'],
  ['HTML & CSS', 'Build your first responsive web page'],
  ['JavaScript', 'Add interactions to websites'],
  ['Git & GitHub', 'Version control and publish code'],
  ['Data Structures', 'Practice arrays, stacks, lists and trees'],
  ['React', 'Build component-based interfaces'],
  ['MySQL & SQL', 'Store and query relational data'],
  ['Flask APIs', 'Connect frontend and backend'],
  ['AI Projects', 'Build useful projects using local models'],
  ['Portfolio', 'Showcase projects and write your resume']
];
const QUESTIONS = {
  Technical: ['What is a REST API?', 'Explain Python lists vs tuples.', 'What is a primary key in SQL?', 'What is React state?'],
  HR: ['Tell me about yourself.', 'Why do you want this internship?', 'What motivates you?', 'Where do you see yourself in five years?'],
  Behavioral: ['Describe a problem you solved.', 'How do you handle deadlines?', 'Tell me about something new you learned.', 'What would you do after receiving criticism?']
};
const DEFAULT_PROFILE = {
  name: '', full: '', email: '', edu: 'BCA Student', goal: 'Software Developer',
  city: 'Delhi', skills: ['Python', 'HTML', 'CSS']
};
const DEFAULT_RESUME = { name: '', title: 'BCA Student', education: 'Bachelor of Computer Applications', skills: 'Python, Flask, SQL, React', projects: 'AI Bharat Mentor — AI-powered career guidance platform', summary: 'Motivated student developer building accessible AI learning products.' };
const KEY = 'abm_react_v1';
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const safeText = value => String(value ?? '').trim();
const imagePath = `${import.meta.env.BASE_URL}founder.png`;

async function api(path, { token = '', headers = {}, ...options } = {}) {
  const isForm = options.body instanceof FormData;
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(isForm ? {} : options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    }
  });
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : null;
  if (!response.ok) throw new Error(data?.error || `Request failed (HTTP ${response.status})`);
  if (data == null) throw new Error('Unexpected server response. Is Flask running?');
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

function Resource({ item, canDelete, onDelete }) {
  const [playing, setPlaying] = useState(false);
  const fileUrl = item.fileUrl || item.file_url || (item.kind !== 'link' && item.id && !item.url ? `/api/library/${encodeURIComponent(item.id)}/file` : '');
  const url = item.url || fileUrl;
  const embed = youtubeEmbed(item.url || '');
  const isVideoFile = item.kind === 'video' && Boolean(fileUrl) && !item.url;
  const kindIcon = { video: '🎬', document: '📄', image: '🖼️', link: '🔗' }[item.kind] || '📚';
  return <article className="panel resource-card">
    <div className="resource-heading"><span className="icon-tile">{kindIcon}</span><span className="muted small">{item.skill || 'General'} · {item.kind || 'Resource'}</span></div>
    <h3>{item.title}</h3><p className="muted">{item.description || 'Explore this learning resource.'}</p>
    <div className="resource-actions">
      {embed && <button className="btn" onClick={() => setPlaying(x => !x)}>{playing ? 'Hide player' : '▶ Play here'}</button>}
      {url && <a className="btn subtle" href={url} target="_blank" rel="noopener noreferrer">{item.kind === 'video' ? '↗ Watch / open' : '↗ View material'}</a>}
      {canDelete && <button className="btn danger" onClick={() => onDelete(item)}>Delete</button>}
    </div>
    {playing && embed && <div className="video-wrap"><iframe title={`${item.title} player`} src={embed} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div>}
    {playing && !embed && isVideoFile && <video controls className="local-video" src={fileUrl}>Video could not be played.</video>}
  </article>;
}

function Tag({ children }) { return <span className="tag">{children}</span>; }
function SectionHeading({ eyebrow, title, subtitle }) { return <div className="section-heading"><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{subtitle && <p className="muted">{subtitle}</p>}</div>; }
function Founder() {
  return <div>
    <SectionHeading eyebrow="The person behind the project" title="Meet the Founder" subtitle="Building technology that makes learning and career decisions easier for students." />
    <div className="panel founder-grid">
      <img src={imagePath} className="founder-photo" alt="Portrait provided by the AI Bharat Mentor founder" />
      <div><span className="eyebrow">Founder & Developer · AI Bharat Mentor</span><h2>Pari Saini</h2>
        <p>Hi! I'm Pari, a second-year BCA student from Delhi and the solo founder of <strong>AI Bharat Mentor</strong>. I'm designing and developing this platform to help students explore careers, improve skills, and learn with accessible technology.</p>
        <p>My work brings together Python, Flask, MySQL, local AI through Ollama, product design and personalized learning. I want practical guidance to be available to students regardless of their starting point.</p>
        <div className="tags"><Tag>🎓 BCA Student</Tag><Tag>💻 Python & Flask</Tag><Tag>🗄️ MySQL</Tag><Tag>🤖 Local AI</Tag><Tag>🚀 Solo Founder</Tag></div>
      </div>
    </div>
  </div>;
}

export default function App() {
  const saved = read(KEY, {});
  const [page, setPage] = useState('home');
  const [token, setToken] = useState(() => localStorage.getItem('abm_react_token') || '');
  const [account, setAccount] = useState(null);
  const [profile, setProfile] = useState(saved.u || DEFAULT_PROFILE);
  const [done, setDone] = useState(saved.dn || []);
  const [resume, setResume] = useState(saved.rs || DEFAULT_RESUME);
  const [mockHistory, setMockHistory] = useState(saved.mh || []);
  const [bookmarks, setBookmarks] = useState(saved.bm || []);
  const [language, setLanguage] = useState('en');
  const [alert, setAlert] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authBusy, setAuthBusy] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([{ role: 'assistant', content: "Hi! I'm Fugu, your AI career mentor. Tell me your goal." }]);
  const [chatBusy, setChatBusy] = useState(false);
  const [library, setLibrary] = useState([]);
  const [libError, setLibError] = useState('');
  const [libBusy, setLibBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [adminOK, setAdminOK] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [videoPreview, setVideoPreview] = useState(false);
  const [mockKind, setMockKind] = useState('Technical');
  const [mockIndex, setMockIndex] = useState(0);
  const [mockAnswer, setMockAnswer] = useState('');
  const [mockAnswers, setMockAnswers] = useState([]);
  const [mockRunning, setMockRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(90);
  const [serverStatus, setServerStatus] = useState('Checking server...');
  const cloudReady = useRef(false);
  const firstRender = useRef(true);

  const notify = (msg) => { setAlert(msg); };
  const navigate = p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const percent = Math.round(done.length / ROADMAP.length * 100);
  const userName = account?.name || profile.name || 'Learner';

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const health = await api('/api/health');
        if (!cancelled) setServerStatus(health.status === 'ok' ? 'Flask online' : 'Server responded');
      } catch { if (!cancelled) setServerStatus('Flask offline — run python server.py'); }
      if (!token) { cloudReady.current = true; return; }
      try {
        const [me, state] = await Promise.all([api('/api/me', { token }), api('/api/state', { token })]);
        if (cancelled) return;
        setAccount(me);
        if (state.u) setProfile(state.u);
        if (Array.isArray(state.dn)) setDone(state.dn);
        if (state.rs) setResume(state.rs);
        if (Array.isArray(state.mh)) setMockHistory(state.mh);
        if (Array.isArray(state.bm)) setBookmarks(state.bm);
        navigate('dashboard');
      } catch (error) {
        if (!cancelled) {
          localStorage.removeItem('abm_react_token');
          setToken('');
          if (/401|log in/i.test(error.message)) notify('Session expired. Please log in.');
        }
      } finally { cloudReady.current = true; }
    }
    init();
    return () => { cancelled = true; };
  }, []); // Session check happens once; regular state saves are handled below.

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify({ u: profile, dn: done, rs: resume, mh: mockHistory, bm: bookmarks }));
    if (firstRender.current) { firstRender.current = false; return; }
    if (!token || !cloudReady.current) return;
    const timer = setTimeout(() => {
      api('/api/state', {
        token, method: 'PUT', body: JSON.stringify({ u: profile, dn: done, rs: resume, mh: mockHistory, bm: bookmarks })
      }).catch(() => notify('Changes saved locally; server sync failed.'));
    }, 900);
    return () => clearTimeout(timer);
  }, [profile, done, resume, mockHistory, bookmarks, token]);

  useEffect(() => {
    if (page === 'library') refreshLibrary();
  }, [page]);

  useEffect(() => {
    if (!mockRunning) return;
    const interval = setInterval(() => setTimeLeft(n => Math.max(0, n - 1)), 1000);
    return () => clearInterval(interval);
  }, [mockRunning, mockIndex]);
  useEffect(() => { if (mockRunning && timeLeft === 0) advanceMock(); }, [mockRunning, timeLeft]);

  async function authenticate(event) {
    event.preventDefault();
    setAuthBusy(true);
    try {
      const signup = authMode === 'signup';
      const result = await api(`/api/auth/${signup ? 'signup' : 'login'}`, {
        method: 'POST', body: JSON.stringify(authForm)
      });
      localStorage.setItem('abm_react_token', result.token);
      setToken(result.token);
      setAccount(result.user);
      const state = result.state || {};
      setProfile(state.u || { ...profile, name: result.user.name || authForm.name, full: result.user.name || authForm.name, email: result.user.email });
      if (Array.isArray(state.dn)) setDone(state.dn);
      if (state.rs) setResume(state.rs);
      if (Array.isArray(state.mh)) setMockHistory(state.mh);
      cloudReady.current = true;
      setAuthForm({ name: '', email: '', password: '' });
      navigate('dashboard');
      notify(signup ? 'Account created successfully.' : 'Welcome back!');
    } catch (error) { notify(error.message); }
    finally { setAuthBusy(false); }
  }
  function logout() {
    localStorage.removeItem('abm_react_token');
    cloudReady.current = false;
    setToken(''); setAccount(null); setMessages([{ role: 'assistant', content: 'Hi! I am Fugu. How can I help?' }]);
    navigate('home'); notify('Logged out.');
    cloudReady.current = true;
  }

  async function sendMessage(event) {
    event.preventDefault();
    const message = chatInput.trim();
    if (!message || chatBusy) return;
    const history = messages.filter(m => m.role === 'user' || m.role === 'assistant').slice(-8);
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    setChatInput(''); setChatBusy(true);
    try {
      const result = await api('/api/chat', {
        token, method: 'POST', body: JSON.stringify({ message, lang: language, history, profile })
      });
      setMessages(prev => [...prev, { role: 'assistant', content: result.reply || result.answer || 'No reply returned.' }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠ ${error.message}. Check Ollama and your login.` }]);
    } finally { setChatBusy(false); }
  }

  async function refreshLibrary() {
    setLibBusy(true); setLibError('');
    try {
      const results = await api('/api/library');
      if (!Array.isArray(results)) throw new Error('The library API did not return a list.');
      setLibrary(results);
    } catch (error) { setLibError(`${error.message} — Check that library.py is loaded by Flask.`); }
    finally { setLibBusy(false); }
  }
  async function verifyAdmin(event) {
    event.preventDefault();
    try {
      await api('/api/library/admin-check', { headers: { 'X-Admin-Key': adminKey } });
      setAdminOK(true); notify('Admin verified.');
    } catch (error) { setAdminOK(false); notify(error.message); }
  }
  async function uploadMaterial(event) {
    event.preventDefault();
    if (!adminOK) return;
    setUploadBusy(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    if (!data.get('file')?.size) data.delete('file');
    try {
      await api('/api/library', { method: 'POST', headers: { 'X-Admin-Key': adminKey }, body: data });
      notify('Material published successfully.');
      form.reset(); setVideoPreview(false);
      await refreshLibrary();
    } catch (error) { notify(`Upload failed: ${error.message}`); }
    finally { setUploadBusy(false); }
  }
  async function removeMaterial(item) {
    if (!adminOK || !window.confirm(`Delete "${item.title}"?`)) return;
    try {
      await api(`/api/library/${encodeURIComponent(item.id)}`, { method: 'DELETE', headers: { 'X-Admin-Key': adminKey } });
      notify('Material deleted.'); await refreshLibrary();
    } catch (error) { notify(error.message); }
  }

  function startMock(kind) {
    setMockKind(kind); setMockIndex(0); setMockAnswers([]); setMockAnswer(''); setTimeLeft(90); setMockRunning(true);
  }
  function advanceMock() {
    const all = [...mockAnswers, mockAnswer.trim()];
    const next = mockIndex + 1;
    if (next < QUESTIONS[mockKind].length) {
      setMockAnswers(all); setMockAnswer(''); setMockIndex(next); setTimeLeft(90);
    } else {
      const result = { kind: mockKind, date: new Date().toLocaleDateString(), answered: all.filter(Boolean).length, total: all.length };
      setMockHistory(prev => [result, ...prev].slice(0, 25));
      setMockRunning(false); notify(`Interview finished: ${result.answered}/${result.total} questions answered. This is not an AI score.`);
    }
  }

  const filteredResources = library.filter(item =>
    (type === 'all' || item.kind === type) &&
    [item.title, item.skill, item.description].join(' ').toLowerCase().includes(search.trim().toLowerCase())
  );
  const mainPages = ['dashboard', 'roadmap', 'library', 'chat', 'skills', 'progress', 'resume', 'mock', 'profile', 'founder'];

  function content() {
    switch (page) {
      case 'dashboard': return <>
        <SectionHeading eyebrow="Your workspace" title={`Welcome, ${userName}! 👋`} subtitle="Build skills, explore opportunities and grow with Fugu AI." />
        <div className="stats">
          <div className="panel"><span className="muted">Career Goal</span><h3>{profile.goal || 'Explore careers'}</h3><button className="text-link" onClick={() => navigate('roadmap')}>View roadmap →</button></div>
          <div className="panel"><span className="muted">Roadmap Completed</span><h3>{done.length} / {ROADMAP.length}</h3><div className="meter"><div style={{ width: `${percent}%` }} /></div></div>
          <div className="panel"><span className="muted">Study Materials</span><h3>Videos · PDFs · Notes</h3><button className="text-link" onClick={() => navigate('library')}>Open Study Library →</button></div>
        </div>
        <h3 className="block-title">Quick actions</h3>
        <div className="quick-grid">{[['🤖', 'Ask Fugu', 'chat'], ['📚', 'Study Library', 'library'], ['🧭', 'Career Roadmap', 'roadmap'], ['📄', 'Build Resume', 'resume'], ['🎤', 'Mock Interview', 'mock'], ['👤', 'Founder', 'founder']].map(x => <button key={x[2]} onClick={() => navigate(x[2])} className="panel quick"><span>{x[0]}</span>{x[1]} <span className="arrow">↗</span></button>)}</div>
        <div className="panel feature-banner"><span className="emoji">🐡</span><div><h3>Meet Fugu, your AI learning companion</h3><p>Ask for a roadmap, interview practice or help with coding.</p></div><button className="btn" onClick={() => navigate('chat')}>Open AI Chat</button></div>
      </>;
      case 'roadmap': return <>
        <SectionHeading eyebrow="Career growth" title="Your Learning Roadmap" subtitle="Check off milestones as you complete them. Customize the plan for your goal." />
        <div className="panel"><div className="split-heading"><strong>Overall progress</strong><strong>{percent}%</strong></div><div className="meter"><div style={{ width: `${percent}%` }} /></div></div>
        <div className="roadmap-list">{ROADMAP.map(([title, detail], index) => <label className="panel task" key={title}>
          <input type="checkbox" checked={done.includes(index + 1)} onChange={e => setDone(prev => e.target.checked ? [...prev, index + 1] : prev.filter(id => id !== index + 1))} />
          <span className="task-number">{String(index + 1).padStart(2, '0')}</span><span><strong>{title}</strong><small className="muted">{detail}</small></span></label>)}</div>
      </>;
      case 'library': return <>
        <div className="split-heading"><SectionHeading eyebrow="Curated by AI Bharat Mentor" title="📚 Study Library" subtitle="Watch tutorial videos, read notes and learn from your own saved resources." /><button className="btn subtle" onClick={refreshLibrary}>{libBusy ? 'Refreshing…' : 'Refresh'}</button></div>
        <div className="filters panel"><input aria-label="Search resources" placeholder="Search videos, topics, notes..." value={search} onChange={e => setSearch(e.target.value)} />
          <select aria-label="Filter material type" value={type} onChange={e => setType(e.target.value)}><option value="all">All materials</option><option value="video">Videos</option><option value="document">PDFs & Notes</option><option value="link">Links</option><option value="image">Images</option></select></div>
        {libError && <p className="error-msg">{libError}</p>}
        {!libError && (libBusy ? <p className="muted">Loading materials...</p> : <div className="resource-grid">{filteredResources.length ? filteredResources.map(item => <Resource key={item.id} item={item} canDelete={adminOK} onDelete={removeMaterial} />) : <p className="muted">No materials found. The admin can upload the first resource below.</p>}</div>)}
        <div className="panel admin"><div className="split-heading"><div><h3>🔐 Founder Admin</h3><p className="muted">Only people with your private ADMIN_KEY can publish or delete materials.</p></div><button className="btn subtle" onClick={() => { setAdminOpen(!adminOpen); setAdminKey(''); setAdminOK(false); }}> {adminOpen ? 'Close' : 'Admin Controls'} </button></div>
          {adminOpen && <>{!adminOK ? <form className="inline-form" onSubmit={verifyAdmin}><input required type="password" placeholder="Private admin key" autoComplete="off" value={adminKey} onChange={e => setAdminKey(e.target.value)} /><button className="btn" type="submit">Verify</button></form> : <>
            <p className="good-msg">Admin access verified for this page.</p>
            <form className="upload-form" onSubmit={uploadMaterial}>
              <div className="two-fields"><label>Title<input name="title" required maxLength={200} placeholder="Python for beginners" /></label><label>Skill / Topic<input name="skill" maxLength={80} placeholder="Python" /></label></div>
              <div className="two-fields"><label>Type<select name="kind" defaultValue="video" onChange={e => setVideoPreview(e.target.value !== 'video' && e.target.value !== 'link')}><option value="video">Video</option><option value="document">PDF / Notes</option><option value="link">Website link</option><option value="image">Image</option></select></label><label>Estimated hours<input name="hours" type="number" min="0.1" max="500" step="0.1" defaultValue="1" /></label></div>
              <label>Description<textarea name="description" maxLength={500} placeholder="What will students learn?" /></label>
              <label>Video or website URL<input type="url" name="url" placeholder="https://youtube.com/watch?v=..." /></label>
              <label>File (PDF / image / MP4)<input type="file" name="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.png,.jpg,.jpeg,.webp,.mp4,.webm" /></label>
              <p className="muted small">For YouTube, paste the original watch URL. Some creators disable embedded playback; students can still use Watch / open.</p>
              <button className="btn" disabled={uploadBusy}>{uploadBusy ? 'Uploading...' : 'Publish Material'}</button>
            </form></> }</>}
        </div>
      </>;
      case 'chat': return <>
        <SectionHeading eyebrow="Powered by your local Ollama model" title="🐡 Fugu AI Mentor" subtitle="Ask questions about programming, careers, roadmaps, resumes and interviews." />
        <div className="panel chat-panel"><div className="messages" aria-live="polite">{messages.map((m, index) => <div className={`bubble ${m.role === 'user' ? 'mine' : 'fugu'}`} key={index}>{m.role === 'assistant' && <span className="speaker">🐡 Fugu</span>}{m.content}</div>)}{chatBusy && <div className="bubble fugu">Fugu is thinking...</div>}</div>
          <div className="prompts">{['Beginner Python roadmap', 'BCA internship preparation', 'Explain Flask APIs'].map(q => <button key={q} onClick={() => setChatInput(q)}>{q}</button>)}</div>
          <form className="chat-form" onSubmit={sendMessage}><input aria-label="Message Fugu" placeholder="Ask Fugu anything..." value={chatInput} onChange={e => setChatInput(e.target.value)} /><button className="btn" type="submit" disabled={chatBusy || !chatInput.trim()}>Send ➤</button></form>
        </div>
      </>;
      case 'skills': return <>
        <SectionHeading eyebrow="Understand your strengths" title="Skill Gap Analysis" subtitle="Starter checklist based on your chosen career goal; not an ML model prediction." />
        <div className="stats"><div className="panel"><span className="muted">Target career</span><h3>{profile.goal}</h3></div><div className="panel"><span className="muted">Skills listed</span><h3>{profile.skills?.length || 0}</h3></div><div className="panel"><span className="muted">Roadmap progress</span><h3>{percent}%</h3></div></div>
        <div className="panel"><h3>Your skills</h3><div className="tags">{(profile.skills || []).map(skill => <Tag key={skill}>{skill}</Tag>)}</div><h3>Suggested next steps</h3><p className="muted">Prioritize SQL, DSA, full-stack development, Git and real projects, choosing what is relevant to your goal.</p><button className="btn" onClick={() => navigate('roadmap')}>Continue roadmap</button></div>
      </>;
      case 'progress': return <>
        <SectionHeading eyebrow="Keep going" title="My Learning Progress" subtitle="Your roadmap tasks and mock interview history." />
        <div className="stats"><div className="panel"><span className="muted">Completed tasks</span><h3>{done.length}</h3></div><div className="panel"><span className="muted">Overall completion</span><h3>{percent}%</h3></div><div className="panel"><span className="muted">Mock interview sessions</span><h3>{mockHistory.length}</h3></div></div>
        <div className="panel"><h3>Completed milestones</h3>{done.length ? done.slice().sort((a,b) => a-b).map(id => <p key={id} className="muted">✓ {ROADMAP[id - 1]?.[0]}</p>) : <p className="muted">No completed tasks yet.</p>}</div>
      </>;
      case 'resume': return <>
        <SectionHeading eyebrow="Career tools" title="Resume Builder" subtitle="Edit your resume and print or save it as PDF using your browser." />
        <div className="resume-layout"><div className="panel form-fields">
          {[["Full Name", 'name'], ["Role / Title", 'title'], ["Education", 'education'], ["Skills (comma separated)", 'skills']].map(([label, field]) => <label key={field}>{label}<input value={resume[field] || ''} onChange={e => setResume(r => ({ ...r, [field]: e.target.value }))} /></label>)}
          {[["Professional Summary", 'summary'], ["Projects & Achievements", 'projects']].map(([label, field]) => <label key={field}>{label}<textarea value={resume[field] || ''} onChange={e => setResume(r => ({ ...r, [field]: e.target.value }))} /></label>)}
          <button className="btn" onClick={() => window.print()}>🖨 Print / Save as PDF</button>
        </div><div id="resume-preview" className="paper"><h1>{resume.name || profile.full || 'Your Name'}</h1><p>{resume.title}</p><hr /><h3>Profile</h3><p>{resume.summary}</p><h3>Education</h3><p>{resume.education}</p><h3>Skills</h3><p>{resume.skills}</p><h3>Projects</h3><p className="prewrap">{resume.projects}</p></div></div>
      </>;
      case 'mock': return <>
        <SectionHeading eyebrow="Get interview-ready" title="Mock Interview" subtitle="Practice written answers with 90 seconds per question. Automatic AI evaluation is not included." />
        {!mockRunning ? <><div className="panel"><h3>Select interview type</h3><div className="tags">{Object.keys(QUESTIONS).map(kind => <button key={kind} className={`btn ${kind === mockKind ? '' : 'subtle'}`} onClick={() => setMockKind(kind)}>{kind}</button>)}</div><p className="muted">{QUESTIONS[mockKind].length} questions · 90 seconds each</p><button className="btn" onClick={() => startMock(mockKind)}>Start practice</button></div><div className="panel"><h3>Recent sessions</h3>{mockHistory.length ? mockHistory.map((h, i) => <p className="muted" key={i}>{h.date} · {h.kind || h.c} · {h.answered ?? '?'} answers / {h.total ?? '?'}</p>) : <p className="muted">No sessions yet.</p>}</div></> : <div className="panel"><div className="split-heading"><strong>{mockKind} · Question {mockIndex + 1}/{QUESTIONS[mockKind].length}</strong><Tag>⏱ {timeLeft}s</Tag></div><h3 className="interview-question">{QUESTIONS[mockKind][mockIndex]}</h3><textarea rows={6} value={mockAnswer} onChange={e => setMockAnswer(e.target.value)} placeholder="Type your answer here..." /><div className="resource-actions"><button className="btn" onClick={advanceMock}>{mockIndex === QUESTIONS[mockKind].length - 1 ? 'Finish' : 'Next question →'}</button><button className="btn subtle" onClick={() => setMockRunning(false)}>Quit</button></div></div>}
      </>;
      case 'profile': return <>
        <SectionHeading eyebrow="Personalize your experience" title="My Profile" subtitle="Your profile helps Fugu personalize its responses." />
        <div className="panel form-fields profile-form"><div className="two-fields">{[["Full name", 'full'], ["Education", 'edu'], ["Career goal", 'goal'], ["City", 'city']].map(([label, field]) => <label key={field}>{label}<input value={profile[field] || ''} onChange={e => setProfile(p => ({ ...p, [field]: e.target.value, ...(field === 'full' ? { name: e.target.value.trim().split(' ')[0] || '' } : {}) }))} /></label>)}</div>
          <label>Skills (comma separated)<input value={(profile.skills || []).join(', ')} onChange={e => setProfile(p => ({ ...p, skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} /></label>
          <p className="muted small">Changes save automatically in this browser. When logged in, they also sync to your Flask /api/state.</p>
          {account && <button className="btn subtle" onClick={logout}>Log out</button>}
        </div>
      </>;
      case 'founder': return <Founder />;
      default: return null;
    }
  }

  return <div className="app">
    {page === 'home' ? <>
      <header className="landing-header"><button className="brand" onClick={() => navigate('home')}><span className="brand-mark">✦</span><span>AI Bharat Mentor<small>LEARN · GROW · ACHIEVE</small></span></button><nav><button onClick={() => navigate('founder')}>About Founder</button><button onClick={() => navigate('library')}>Study Library</button><button onClick={() => navigate('login')}>Log in</button><button className="btn" onClick={() => navigate(account ? 'dashboard' : 'login')}>Get Started →</button></nav></header>
      <main className="landing-main"><div><span className="eyebrow">AI-powered guidance for Indian students</span><h1>Your career.<br /><span className="gradient-text">Your future.</span><br />Powered by AI.</h1><p>Plan your career path, learn practical skills and prepare for interviews with Fugu — your own AI mentor.</p><div className="hero-actions"><button className="btn big" onClick={() => navigate(account ? 'dashboard' : 'login')}>Start Learning →</button><button className="btn subtle big" onClick={() => navigate('founder')}>Meet the Founder</button></div></div><div className="robot-showcase"><div className="halo" /><span className="fugu">🐡</span><div className="floating-chip">🤖 Meet Fugu AI</div><div className="floating-chip second">📚 Learn · Grow · Achieve</div></div></main>
      <div className="feature-strip"><span>🧭 Career Roadmaps</span><span>🤖 AI Mentor</span><span>📚 Study Library</span><span>📄 Resume & Interview Tools</span></div>
      <div className="landing-founder"><Founder /></div>
    </> : page === 'login' ? <main className="auth-shell"><button className="back" onClick={() => navigate('home')}>← Back to Home</button><div className="auth-layout"><div className="auth-intro"><span className="eyebrow">AI Bharat Mentor</span><h1>Learn today.<br /><span className="gradient-text">Lead tomorrow.</span></h1><span className="fugu">🐡</span></div><form className="panel auth-form" onSubmit={authenticate}><h2>{authMode === 'signup' ? 'Create your account' : 'Welcome back'}</h2><p className="muted">Continue your journey toward your goals.</p>{authMode === 'signup' && <label>Full Name<input required minLength={2} autoComplete="name" value={authForm.name} onChange={e => setAuthForm(v => ({ ...v, name: e.target.value }))} /></label>}<label>Email<input type="email" required autoComplete="email" value={authForm.email} onChange={e => setAuthForm(v => ({ ...v, email: e.target.value }))} /></label><label>Password<input type="password" required minLength={6} autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} value={authForm.password} onChange={e => setAuthForm(v => ({ ...v, password: e.target.value }))} /></label><button className="btn wide" disabled={authBusy}>{authBusy ? 'Please wait...' : authMode === 'signup' ? 'Sign up' : 'Log in'}</button><p className="muted small">{authMode === 'login' ? 'New here?' : 'Already registered?'} <button type="button" className="text-link" onClick={() => setAuthMode(m => m === 'login' ? 'signup' : 'login')}>{authMode === 'login' ? 'Create an account' : 'Log in instead'}</button></p></form></div></main> : <div className="workspace"><aside className="sidebar"><button className="brand" onClick={() => navigate('home')}><span className="brand-mark">✦</span><span>AI Bharat Mentor<small>LEARN · GROW · ACHIEVE</small></span></button><nav className="side-nav" aria-label="App sections">{MENU.map(([icon, key, label]) => <button key={key} className={page === key ? 'active' : ''} onClick={() => navigate(key)}><span className="nav-icon">{icon}</span>{label}</button>)}</nav><div className="sidebar-bottom"><span className="server-dot" />{serverStatus}</div></aside><main className="workspace-main"><header className="workspace-header"><div className="breadcrumb">AI Bharat Mentor <span> / {MENU.find(x => x[1] === page)?.[2] || 'Dashboard'}</span></div><div className="header-right"><select aria-label="AI language" value={language} onChange={e => setLanguage(e.target.value)}><option value="en">English</option><option value="hi">हिन्दी</option><option value="zh">中文</option></select><button className="avatar" onClick={() => navigate('profile')} title="Profile">{userName[0]?.toUpperCase() || 'P'}</button></div></header><div className="page-content">{content()}</div></main></div>}
    {alert && <div role="alert" className="toast"><span>{alert}</span><button aria-label="Dismiss notification" onClick={() => setAlert('')}>×</button></div>}
  </div>;
}
