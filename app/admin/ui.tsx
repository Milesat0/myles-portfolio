'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { LogOut, Plus, Pencil, Trash2, Save, ExternalLink, LayoutDashboard, BellRing, Users, Eye, MousePointerClick, Activity } from 'lucide-react';

type Row = { id: string; title: string; type: string; desc: string; tags: string[]; accent: string; status: string; details: string; images: string[]; video: string | null; icon: string; sort_order: number };
type EventRow = { id: number; session_id: string; page: string; event: string; referrer: string; device: string; browser: string; os: string; country: string; region: string; city: string; ip_masked: string | null; ip_full?: string | null; created_at: string };
const blank: Omit<Row, 'id'> = { title:'', type:'', desc:'', tags:[], accent:'violet', status:'In development', details:'', images:[], video:null, icon:'', sort_order:99 };

export default function AdminDashboard({ initialProjects, email }: { initialProjects: Row[]; email: string }) {
  const [projects, setProjects] = useState<Row[]>(initialProjects);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<any>(blank);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [events, setEvents] = useState<EventRow[]>([]);
  const [notifications, setNotifications] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [pushReady, setPushReady] = useState(false);
  const [revealedIps, setRevealedIps] = useState<Set<number>>(new Set());

  const loadAnalytics = async (notify = false) => {
    const res = await fetch('/api/analytics/recent', { cache: 'no-store' }).catch(() => null);
    if (!res?.ok) return;
    const data = await res.json() as EventRow[];
    setEvents(data);
    const newest = data[0];
    if (notify && newest && newest.id.toString() !== lastSeen && newest.event !== 'pageview') {
      if (notifications && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('Myles Portfolio', { body: `${newest.country} · ${newest.device} · ${newest.event.split('_').join(' ')}` });
      }
      setLastSeen(newest.id.toString());
    }
    if (!lastSeen && newest) setLastSeen(newest.id.toString());
  };

  useEffect(() => {
    loadAnalytics(false);
    const timer = window.setInterval(() => loadAnalytics(true), 15000);
    return () => window.clearInterval(timer);
  }, [lastSeen, notifications]);

  const today = useMemo(() => events.filter(e => new Date(e.created_at).toDateString() === new Date().toDateString()), [events]);
  const live = useMemo(() => events.filter(e => Date.now() - new Date(e.created_at).getTime() < 5 * 60 * 1000), [events]);
  const sessionsToday = useMemo(() => new Set(today.map(e => e.session_id)).size, [today]);
  const interactions = useMemo(() => today.filter(e => e.event !== 'pageview').length, [today]);

  function base64ToBytes(value: string) {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
    const raw = atob(padded);
    return Uint8Array.from(raw, c => c.charCodeAt(0));
  }

  async function enableNotifications() {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) { setMessage('This browser does not support web push notifications.'); return; }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') { setMessage('Notifications were not enabled.'); return; }
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) { setMessage('Push is not configured yet. Add the VAPID public key to the deployment environment.'); return; }
    try {
      const registration = await navigator.serviceWorker.register('/push-sw.js');
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToBytes(publicKey) });
      const res = await fetch('/api/push/subscribe', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ subscription }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Subscription failed (${res.status})`);
      setNotifications(true); setPushReady(true); setMessage('Push alerts enabled. You can now receive high-intent visitor alerts even with the dashboard closed.');
    } catch (error) { setMessage(error instanceof Error ? `Push setup failed: ${error.message}` : 'Push setup failed.'); }
  }

  async function sendTestPush() {
    const res = await fetch('/api/push/test', { method:'POST' });
    const json = await res.json().catch(() => ({}));
    setMessage(res.ok ? 'Test push sent.' : (json.error || 'Test push failed.'));
  }

  function toggleIp(id: number) {
    setRevealedIps(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function startNew() { setEditing(null); setForm({ ...blank, sort_order: projects.length + 1 }); setMessage(''); }
  function startEdit(p: Row) { setEditing(p); setForm({ ...p, tags: p.tags.join(', '), images: p.images.join('\n') }); setMessage(''); }
  async function save() {
    setBusy(true); setMessage('');
    const payload = { ...form, tags: String(form.tags).split(',').map((x:string)=>x.trim()).filter(Boolean), images: String(form.images).split('\n').map((x:string)=>x.trim()).filter(Boolean), sort_order: Number(form.sort_order), video: form.video || null };
    const res = await fetch(editing ? `/api/projects/${editing.id}` : '/api/projects', { method: editing ? 'PATCH' : 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    const json = await res.json();
    if (!res.ok) { setMessage(json.error || 'Save failed.'); setBusy(false); return; }
    if (editing) setProjects(projects.map(p => p.id === editing.id ? json.project : p)); else setProjects([...projects, json.project]);
    setMessage('Saved.'); setBusy(false); setEditing(editing ? json.project : null);
  }
  async function remove(id:string) {
    if (!confirm('Delete this project from the portfolio database?')) return;
    const res = await fetch(`/api/projects/${id}`, { method:'DELETE' });
    if (res.ok) { setProjects(projects.filter(p => p.id !== id)); if (editing?.id === id) startNew(); }
  }
  async function logout() { const supabase = createClient(); await supabase.auth.signOut(); window.location.href='/login'; }
  const set = (key:string, value:any) => setForm((f:any) => ({...f, [key]:value}));
  const eventLabel = (event: string) => event.replace(/^project_view:/, 'Viewed ').replaceAll('_', ' ');

  return <main className="admin-shell">
    <div className="admin-grid-bg" />
    <header className="admin-topbar"><a href="/" className="admin-logo"><span>&lt;/&gt;</span> MYLES<span className="dot">.</span></a><div className="admin-top-actions"><a href="/" target="_blank"><ExternalLink size={15}/> View site</a><span>{email}</span><button onClick={logout}><LogOut size={15}/> Sign out</button></div></header>
    <div className="admin-layout">
      <aside className="admin-sidebar"><div className="sidebar-label">CONTROL ROOM</div><a className="admin-side-link active" href="/admin"><LayoutDashboard size={16}/> Dashboard</a><a className="admin-side-link" href="/admin/visitors"><Users size={16}/> Visitors</a><a className="admin-side-link" href="/admin/projects"><Pencil size={16}/> Projects</a><button className="admin-sidebar-action" onClick={startNew}><Plus size={16}/> New project</button></aside>
      <section className="admin-main">
        <div className="admin-heading"><div><span className="eyebrow">01 / CONTROL ROOM</span><h1>Portfolio control room</h1><p>Content, traffic and lead signals in one place.</p></div><div className="admin-heading-actions"><button className="admin-secondary" onClick={enableNotifications}><BellRing size={15}/> {pushReady ? 'Push alerts on' : notifications ? 'Notifications on' : 'Enable alerts'}</button>{pushReady && <button className="admin-secondary" onClick={sendTestPush}>Test push</button>}<button className="admin-primary compact" onClick={startNew}><Plus size={16}/> New project</button></div></div>
        {message && <div className="admin-message">{message}</div>}

        <div className="analytics-overview">
          <div className="analytics-card live-card"><div><span>LIVE NOW</span><strong>{live.length ? new Set(live.map(e=>e.session_id)).size : 0}</strong></div><Activity size={20}/></div>
          <div className="analytics-card"><div><span>VISITORS TODAY</span><strong>{sessionsToday}</strong></div><Users size={20}/></div>
          <div className="analytics-card"><div><span>PAGEVIEWS TODAY</span><strong>{today.filter(e=>e.event === 'pageview').length}</strong></div><Eye size={20}/></div>
          <div className="analytics-card"><div><span>INTERACTIONS</span><strong>{interactions}</strong></div><MousePointerClick size={20}/></div>
        </div>

        <div className="analytics-panels">
          <div className="admin-panel"><div className="panel-title"><strong>Live activity</strong><span>refreshes every 15s</span></div><div className="activity-list">{events.slice(0, 8).map(e => <div className="activity-row" key={e.id}><div className="activity-dot"/><div className="activity-copy"><b>{eventLabel(e.event)}</b><span>{e.country}{e.city ? ` · ${e.city}` : ''} · {e.device} · {e.browser} · from {e.referrer}</span></div><time>{new Date(e.created_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</time></div>)}{!events.length && <p className="admin-empty">No visitor activity yet. Open the public site in another tab to create your first event.</p>}</div></div>
          <div className="admin-panel"><div className="panel-title"><strong>Visitors today</strong><span>privacy-conscious signals</span></div><div className="visitor-list">{Array.from(new Map<string, EventRow>(today.filter(e=>e.event==='pageview').map(e=>[e.session_id,e] as [string, EventRow])).values()).slice(0,8).map(e => <div className="visitor-row" key={e.session_id}><div className="visitor-main"><b>{e.country}{e.city ? ` · ${e.city}` : ''}</b><span>{e.device} · {e.os} · {e.browser}</span></div><div><b>{e.referrer}</b><span>{e.page}</span></div><div className="visitor-tech"><span>{revealedIps.has(e.id) ? (e.ip_full || e.ip_masked || 'IP unavailable') : (e.ip_masked || 'IP unavailable')}</span>{e.ip_full && <button type="button" onClick={() => toggleIp(e.id)}>{revealedIps.has(e.id) ? 'Hide' : 'Reveal'}</button>}</div></div>)}{!today.length && <p className="admin-empty">Visitor summaries will appear here once traffic arrives.</p>}</div></div>
        </div>

        <div className="admin-heading subheading"><div><span className="eyebrow">02 / CONTENT</span><h2>Projects</h2><p>Edit the projects shown on the public portfolio without touching source code.</p></div></div>
        <div className="admin-panels">
          <div className="admin-panel project-list"><div className="panel-title"><strong>Projects</strong><span>{projects.length} total</span></div>{projects.map(p => <div className={'admin-project-row '+(editing?.id===p.id?'selected':'')} key={p.id}><div><b>{p.title}</b><span>{p.type}</span></div><div className="row-actions"><button onClick={()=>startEdit(p)} aria-label={'Edit '+p.title}><Pencil size={15}/></button><button onClick={()=>remove(p.id)} aria-label={'Delete '+p.title}><Trash2 size={15}/></button></div></div>)}{!projects.length && <p className="admin-empty">No projects in the database yet.</p>}</div>
          <div className="admin-panel editor"><div className="panel-title"><strong>{editing ? `Edit ${editing.title}` : 'New project'}</strong><span>Changes are saved to Supabase</span></div>
            <div className="form-grid">
              <label>Title<input value={form.title} onChange={e=>set('title',e.target.value)}/></label><label>Type<input value={form.type} onChange={e=>set('type',e.target.value)}/></label>
              <label className="wide">Short description<textarea value={form.desc} onChange={e=>set('desc',e.target.value)}/></label>
              <label>Accent<select value={form.accent} onChange={e=>set('accent',e.target.value)}><option value="violet">Violet</option><option value="cyan">Cyan</option><option value="orange">Orange</option></select></label><label>Status<input value={form.status} onChange={e=>set('status',e.target.value)}/></label>
              <label>Tags <span className="hint">comma separated</span><input value={form.tags} onChange={e=>set('tags',e.target.value)}/></label><label>Sort order<input type="number" min="1" value={form.sort_order} onChange={e=>set('sort_order',e.target.value)}/></label>
              <label className="wide">Details<textarea rows={5} value={form.details} onChange={e=>set('details',e.target.value)}/></label><label className="wide">Icon URL<input value={form.icon} onChange={e=>set('icon',e.target.value)} placeholder="/images/icons/project.png"/></label>
              <label className="wide">Image URLs <span className="hint">one per line</span><textarea rows={4} value={form.images} onChange={e=>set('images',e.target.value)} placeholder="/images/project-01.png"/></label><label className="wide">Demo video URL <span className="hint">optional</span><input value={form.video || ''} onChange={e=>set('video',e.target.value)} placeholder="/images/project-demo.mp4"/></label>
            </div>
            <div className="editor-actions"><button className="admin-primary" onClick={save} disabled={busy}><Save size={16}/>{busy?'Saving…':'Save project'}</button>{editing && <button className="admin-secondary" onClick={startNew}>Cancel</button>}</div>
          </div>
        </div>
      </section>
    </div>
  </main>;
}
