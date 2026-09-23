'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, ExternalLink, Eye, EyeOff, LogOut, Save, Search, Users, ChevronDown, ChevronUp, Clock3, MapPin, Monitor, Activity } from 'lucide-react';

type Visitor = {
  session_id: string; nickname: string | null; first_seen: string; last_seen: string;
  visit_count: number; pageview_count: number; interaction_count: number; latest_page: string;
  latest_event: string; device: string; browser: string; os: string; country: string;
  region: string; city: string; ip_masked: string | null; ip_full: string | null;
};
type EventRow = { id: number; page: string; event: string; referrer: string; device: string; browser: string; os: string; country: string; region: string; city: string; ip_masked: string | null; created_at: string };

export default function VisitorsManager({ email }: { email: string }) {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [query, setQuery] = useState('');
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<Record<string, EventRow[]>>({});
  const [loadingTimeline, setLoadingTimeline] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch('/api/visitors', { cache: 'no-store' });
    if (res.ok) setVisitors(await res.json());
  }
  useEffect(() => { load(); const timer = window.setInterval(load, 15000); return () => window.clearInterval(timer); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return visitors;
    return visitors.filter(v => [v.nickname, v.country, v.region, v.city, v.device, v.browser, v.os, v.latest_page, v.ip_masked].some(x => String(x ?? '').toLowerCase().includes(q)));
  }, [visitors, query]);

  function beginNickname(v: Visitor) { setEditing(v.session_id); setNickname(v.nickname || ''); setMessage(''); }
  async function saveNickname(sessionId: string) {
    setBusy(true); setMessage('');
    const res = await fetch(`/api/visitors/${sessionId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nickname }) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setMessage(json.error || 'Nickname could not be saved.'); setBusy(false); return; }
    setVisitors(current => current.map(v => v.session_id === sessionId ? { ...v, nickname: json.visitor.nickname } : v));
    setEditing(null); setMessage('Visitor nickname saved.'); setBusy(false);
  }
  function toggleIp(id: string) { setRevealed(current => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; }); }
  async function toggleTimeline(id: string) {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (timeline[id]) return;
    setLoadingTimeline(id);
    const res = await fetch(`/api/visitors/${id}`, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    if (res.ok) setTimeline(current => ({ ...current, [id]: json.events || [] }));
    setLoadingTimeline(null);
  }
  async function logout() { const supabase = createClient(); await supabase.auth.signOut(); window.location.href = '/login'; }
  const eventLabel = (event: string) => event.replace(/^project_view:/, 'Viewed ').replaceAll('_', ' ');

  return <main className="admin-shell"><div className="admin-grid-bg" />
    <header className="admin-topbar"><a href="/" className="admin-logo"><span>&lt;/&gt;</span> MYLES<span className="dot">.</span></a><div className="admin-top-actions"><a href="/" target="_blank"><ExternalLink size={15}/> View site</a><span>{email}</span><button onClick={logout}><LogOut size={15}/> Sign out</button></div></header>
    <div className="admin-layout"><aside className="admin-sidebar"><div className="sidebar-label">CONTROL ROOM</div><a className="admin-side-link" href="/admin">Dashboard</a><a className="admin-side-link active" href="/admin/visitors"><Users size={16}/> Visitors</a><a className="admin-side-link" href="/admin/projects">Projects</a></aside>
      <section className="admin-main">
        <div className="admin-heading"><div><a className="admin-back" href="/admin"><ArrowLeft size={15}/> Back to control room</a><span className="eyebrow">03 / AUDIENCE</span><h1>Visitor directory</h1><p>Every tracked browser gets a private record. Give people your own nickname for quick reference.</p></div><div className="analytics-card"><div><span>TRACKED VISITORS</span><strong>{visitors.length}</strong></div><Users size={20}/></div></div>
        {message && <div className="admin-message">{message}</div>}
        <div className="admin-panel visitor-directory-panel">
          <div className="panel-title"><strong>People who have visited</strong><span>updates every 15s</span></div>
          <div className="visitor-search-wrap"><Search size={16}/><input className="visitor-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search nickname, location, device, page or IP…" /></div>
          <div className="visitor-directory">{filtered.map(v => <article className="visitor-profile-card" key={v.session_id}>
            <div className="visitor-profile-head"><div><span className="eyebrow">{v.nickname ? 'CUSTOM NAME' : 'UNNAMED VISITOR'}</span><h3>{v.nickname || 'Unnamed visitor'}</h3><p>{v.country}{v.region ? ` · ${v.region}` : ''}{v.city ? ` · ${v.city}` : ''}</p></div><div className="visitor-card-actions"><button className="admin-secondary" onClick={()=>beginNickname(v)}><Save size={14}/> Rename</button><button className="admin-secondary" onClick={()=>toggleTimeline(v.session_id)}>{expanded === v.session_id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>} Activity</button></div></div>
            <div className="visitor-tech-strip"><span><Monitor size={13}/> {v.device} · {v.os} · {v.browser}</span><span><Activity size={13}/> {v.pageview_count} views · {v.interaction_count} interactions</span></div>
            {editing === v.session_id && <div className="visitor-nickname-editor"><input autoFocus value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="e.g. Restaurant lead, John, Hotel prospect…" maxLength={80}/><button className="admin-primary" disabled={busy} onClick={()=>saveNickname(v.session_id)}><Save size={15}/> Save</button><button className="admin-secondary" onClick={()=>setEditing(null)}>Cancel</button></div>}
            <div className="visitor-profile-grid"><div><span>FIRST SEEN</span><b>{new Date(v.first_seen).toLocaleString()}</b></div><div><span>LAST SEEN</span><b>{new Date(v.last_seen).toLocaleString()}</b></div><div><span>LAST PAGE</span><b>{v.latest_page}</b></div><div><span>LAST EVENT</span><b>{eventLabel(v.latest_event)}</b></div><div><span>REFRESHES</span><b>{v.visit_count} record{v.visit_count === 1 ? '' : 's'}</b></div><div><span>IP ADDRESS</span><b>{revealed.has(v.session_id) ? (v.ip_full || v.ip_masked || 'Unavailable') : (v.ip_masked || 'Unavailable')}</b>{v.ip_full && <button type="button" onClick={()=>toggleIp(v.session_id)}>{revealed.has(v.session_id) ? <><EyeOff size={12}/> Hide</> : <><Eye size={12}/> Reveal</>}</button>}</div></div>
            {expanded === v.session_id && <div className="visitor-timeline"><div className="timeline-heading"><span>ACTIVITY TIMELINE</span>{loadingTimeline && <span>loading…</span>}</div>{(timeline[v.session_id] || []).map(e => <div className="timeline-row" key={e.id}><div className="timeline-icon"><Clock3 size={13}/></div><div className="timeline-copy"><b>{eventLabel(e.event)}</b><span>{e.page} · {e.device} · {e.browser}{e.referrer ? ` · from ${e.referrer}` : ''}</span></div><time>{new Date(e.created_at).toLocaleString()}</time></div>)}{!loadingTimeline && timeline[v.session_id] && !timeline[v.session_id].length && <p className="admin-empty">No activity found for this visitor.</p>}</div>}
          </article>)}{!filtered.length && <p className="admin-empty">No visitors match that search.</p>}</div>
        </div>
      </section>
    </div>
  </main>;
}
