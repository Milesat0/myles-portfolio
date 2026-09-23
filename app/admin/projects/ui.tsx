'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, ExternalLink, LogOut, Pencil, Plus, Save, Trash2, Upload, X, ChevronUp, ChevronDown, Image as ImageIcon, Film } from 'lucide-react';

type Row = { id: string; title: string; type: string; desc: string; tags: string[]; accent: string; status: string; details: string; images: string[]; video: string | null; icon: string; sort_order: number };
type Form = { title:string; type:string; desc:string; tags:string; accent:string; status:string; details:string; images:string[]; video:string|null; icon:string; sort_order:number };
const blank: Form = { title:'', type:'', desc:'', tags:'', accent:'violet', status:'In development', details:'', images:[], video:null, icon:'', sort_order:99 };

function safeName(name: string) { return name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 100); }

export default function ProjectsManager({ initialProjects, email }: { initialProjects: Row[]; email: string }) {
  const [projects, setProjects] = useState<Row[]>(initialProjects);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Form>(blank);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const set = (key:keyof Form, value:any) => setForm(f => ({...f, [key]:value}));
  function startNew() { setEditing(null); setForm({ ...blank, sort_order: projects.length + 1 }); setMessage(''); }
  function startEdit(p: Row) { setEditing(p); setForm({ ...p, tags: p.tags.join(', '), images: [...p.images] }); setMessage(''); }

  async function uploadFiles(files: FileList | null, kind: 'icon'|'image'|'video') {
    if (!files?.length) return;
    setUploading(true); setMessage('Uploading media…');
    try {
      const supabase = createClient();
      const bucket = 'portfolio-assets';
      const folder = kind === 'icon' ? 'icons' : kind === 'video' ? 'videos' : 'projects';
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
        const path = `${folder}/${crypto.randomUUID()}-${safeName(file.name.replace(/\.[^.]+$/, ''))}.${safeName(ext || 'bin')}`;
        const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type || undefined, cacheControl: '31536000' });
        if (error) throw error;
        uploaded.push(supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl);
      }
      if (kind === 'icon') set('icon', uploaded[0]);
      if (kind === 'image') setForm(f => ({ ...f, images: [...f.images, ...uploaded] }));
      if (kind === 'video') set('video', uploaded[0]);
      setMessage(`${uploaded.length} ${kind === 'image' ? 'image(s)' : kind} uploaded.`);
    } catch (error) {
      setMessage(error instanceof Error ? `Upload failed: ${error.message}` : 'Upload failed.');
    } finally { setUploading(false); }
  }

  function moveImage(index: number, direction: -1|1) {
    setForm(f => { const next=[...f.images]; const target=index+direction; if(target<0 || target>=next.length) return f; [next[index],next[target]]=[next[target],next[index]]; return {...f,images:next}; });
  }
  function removeImage(index:number) { setForm(f => ({...f, images:f.images.filter((_,i)=>i!==index)})); }

  async function save() {
    if (!form.title.trim()) { setMessage('Give the project a title first.'); return; }
    setBusy(true); setMessage('');
    const payload = { ...form, tags: String(form.tags).split(',').map(x=>x.trim()).filter(Boolean), images: form.images.filter(Boolean), sort_order: Number(form.sort_order), video: form.video || null };
    const res = await fetch(editing ? `/api/projects/${editing.id}` : '/api/projects', { method: editing ? 'PATCH' : 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    const json = await res.json().catch(()=>({}));
    if (!res.ok) { setMessage(json.error || 'Save failed.'); setBusy(false); return; }
    if (editing) setProjects(projects.map(p => p.id === editing.id ? json.project : p)); else setProjects([...projects, json.project]);
    setEditing(editing ? json.project : null); setMessage('Project saved to Supabase.'); setBusy(false);
  }
  async function remove(id:string) {
    if (!confirm('Delete this project from the portfolio database? Uploaded media remains in storage so it can be reused later.')) return;
    const res = await fetch(`/api/projects/${id}`, { method:'DELETE' });
    if (res.ok) { setProjects(projects.filter(p => p.id !== id)); if (editing?.id === id) startNew(); setMessage('Project deleted.'); } else setMessage('Delete failed.');
  }
  async function logout() { const supabase = createClient(); await supabase.auth.signOut(); window.location.href='/login'; }

  return <main className="admin-shell"><div className="admin-grid-bg" />
    <header className="admin-topbar"><a href="/" className="admin-logo"><span>&lt;/&gt;</span> MYLES<span className="dot">.</span></a><div className="admin-top-actions"><a href="/" target="_blank"><ExternalLink size={15}/> View site</a><span>{email}</span><button onClick={logout}><LogOut size={15}/> Sign out</button></div></header>
    <div className="admin-layout"><aside className="admin-sidebar"><div className="sidebar-label">CONTROL ROOM</div><a className="admin-side-link" href="/admin">Dashboard</a><a className="admin-side-link" href="/admin/visitors">Visitors</a><a className="admin-side-link active" href="/admin/projects">Projects</a><button className="admin-sidebar-action" onClick={startNew}><Plus size={16}/> New project</button></aside>
      <section className="admin-main">
        <div className="admin-heading"><div><a className="admin-back" href="/admin"><ArrowLeft size={15}/> Back to control room</a><span className="eyebrow">02 / CONTENT</span><h1>Project manager</h1><p>Edit what appears in the public portfolio without touching source code.</p></div><button className="admin-primary compact" onClick={startNew}><Plus size={16}/> New project</button></div>
        {message && <div className="admin-message">{message}</div>}
        <div className="admin-panels">
          <div className="admin-panel project-list"><div className="panel-title"><strong>Projects</strong><span>{projects.length} total</span></div>{projects.map(p => <div className={'admin-project-row '+(editing?.id===p.id?'selected':'')} key={p.id}><div><b>{p.title}</b><span>{p.type} · {p.status}</span></div><div className="row-actions"><button onClick={()=>startEdit(p)} aria-label={'Edit '+p.title}><Pencil size={15}/></button><button onClick={()=>remove(p.id)} aria-label={'Delete '+p.title}><Trash2 size={15}/></button></div></div>)}{!projects.length && <p className="admin-empty">No projects yet. Create the first one.</p>}</div>
          <div className="admin-panel editor"><div className="panel-title"><strong>{editing ? `Edit ${editing.title}` : 'New project'}</strong><span>Saved to Supabase</span></div>
            <div className="form-grid">
              <label>Title<input value={form.title} onChange={e=>set('title',e.target.value)} /></label><label>Type<input value={form.type} onChange={e=>set('type',e.target.value)} /></label>
              <label className="wide">Short description<textarea value={form.desc} onChange={e=>set('desc',e.target.value)} /></label>
              <label>Accent<select value={form.accent} onChange={e=>set('accent',e.target.value)}><option value="violet">Violet</option><option value="cyan">Cyan</option><option value="orange">Orange</option></select></label><label>Status<input value={form.status} onChange={e=>set('status',e.target.value)} /></label>
              <label>Tags <span className="hint">comma separated</span><input value={form.tags} onChange={e=>set('tags',e.target.value)} /></label><label>Sort order<input type="number" min="1" value={form.sort_order} onChange={e=>set('sort_order',e.target.value)} /></label>
              <label className="wide">Details<textarea rows={6} value={form.details} onChange={e=>set('details',e.target.value)} /></label>
              <div className="media-field wide"><div className="media-label"><span>PROJECT ICON</span><span className="hint">PNG, JPG, WEBP</span></div><div className="upload-row"><label className="upload-button"><Upload size={15}/> {uploading ? 'Uploading…' : 'Choose icon'}<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={e=>uploadFiles(e.target.files,'icon')} disabled={uploading}/></label>{form.icon && <div className="media-preview icon-preview"><img src={form.icon} alt="Project icon preview"/><button type="button" onClick={()=>set('icon','')} aria-label="Remove icon"><X size={14}/></button></div>}</div><input className="media-url" value={form.icon} onChange={e=>set('icon',e.target.value)} placeholder="Or paste an existing icon URL" /></div>
              <div className="media-field wide"><div className="media-label"><span>PROJECT IMAGES</span><span className="hint">Upload several, then reorder them</span></div><label className="upload-button"><Upload size={15}/> {uploading ? 'Uploading…' : 'Choose images'}<input type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" onChange={e=>uploadFiles(e.target.files,'image')} disabled={uploading}/></label><div className="media-grid">{form.images.map((src,index)=><div className="media-tile" key={src}><img src={src} alt={`Project screenshot ${index+1}`} /><div className="media-tile-bar"><span>0{index+1}</span><div><button type="button" onClick={()=>moveImage(index,-1)} disabled={index===0} aria-label="Move image up"><ChevronUp size={13}/></button><button type="button" onClick={()=>moveImage(index,1)} disabled={index===form.images.length-1} aria-label="Move image down"><ChevronDown size={13}/></button><button type="button" onClick={()=>removeImage(index)} aria-label="Remove image"><X size={13}/></button></div></div></div>)}</div><input className="media-url" value={form.images.join('\n')} onChange={e=>setForm(f=>({...f,images:e.target.value.split(/\n+/).map(x=>x.trim()).filter(Boolean)}))} placeholder="Or paste image URLs, one per line" /></div>
              <div className="media-field wide"><div className="media-label"><span>DEMO VIDEO</span><span className="hint">MP4 / WebM</span></div><div className="upload-row"><label className="upload-button"><Film size={15}/> {uploading ? 'Uploading…' : 'Choose video'}<input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={e=>uploadFiles(e.target.files,'video')} disabled={uploading}/></label>{form.video && <div className="video-chip"><Film size={14}/><span>{form.video.split('/').pop()}</span><button type="button" onClick={()=>set('video',null)}><X size={14}/></button></div>}</div><input className="media-url" value={form.video || ''} onChange={e=>set('video',e.target.value)} placeholder="Or paste an existing video URL" /></div>
            </div>
            <div className="editor-actions"><button className="admin-primary" onClick={save} disabled={busy || uploading}><Save size={16}/>{busy?'Saving…':'Save project'}</button>{editing && <button className="admin-secondary" onClick={startNew}>Cancel</button>}</div>
          </div>
        </div>
      </section>
    </div>
  </main>;
}
