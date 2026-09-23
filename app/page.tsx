'use client';

import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  GitBranch,
  Mail,
  Menu,
  X,
  Code2,
  Bot,
  FlaskConical,
  Database,
  ChevronRight,
  Terminal,
  Phone,
  MessageCircle,
  ExternalLink,
  Smartphone,
  MonitorCog,
  ShieldCheck,
  Sparkles,
  ServerCog,
  Palette,
} from 'lucide-react';

import type { Project } from '@/lib/projects';
import { defaultProjects } from '@/lib/projects';

const services = [
  { icon: Code2, title: 'Web & Web Apps', text: 'Business sites, landing pages, dashboards, customer portals, e-commerce and custom web applications.' },
  { icon: Smartphone, title: 'Mobile Apps', text: 'Cross-platform Android apps for customers, teams, utilities, ordering, booking and everyday workflows.' },
  { icon: MonitorCog, title: 'Desktop Software', text: 'Windows-first tools for productivity, automation, file management and business operations.' },
  { icon: Sparkles, title: 'AI & Automation', text: 'Practical AI assistants, intelligent search, natural-language workflows and automation that saves time.' },
  { icon: ServerCog, title: 'Backend & APIs', text: 'Databases, REST APIs, authentication, integrations, notifications and reliable data workflows.' },
  { icon: ShieldCheck, title: 'Security & Privacy', text: 'Privacy-conscious architecture, authorization, validation and security-minded product development.' },
  { icon: Palette, title: 'UI/UX & Branding', text: 'Responsive interfaces, interaction states, visual systems, icons and digital identity that feel intentional.' },
  { icon: Database, title: 'Business Systems', text: 'Admin panels, internal tools, dashboards, workflows and software shaped around how a business actually operates.' },
];

const skills = [
  { icon: Code2, title: 'Web Development', text: 'Responsive interfaces, modern React apps, APIs and production-ready frontends.' },
  { icon: Bot, title: 'AI & Automation', text: 'AI-assisted workflows, local models, automation ideas and practical tooling.' },
  { icon: FlaskConical, title: 'Testing & Debugging', text: 'Finding bugs, tracing failures and turning rough builds into reliable products.' },
  { icon: Database, title: 'Data & Digital Ops', text: 'Organizing information, working with databases and simplifying repetitive workflows.' },
];

export default function Home() {
  const [open, setOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>(defaultProjects);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    fetch('/api/analytics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ page: '/', event: 'pageview' }) }).catch(() => {});
    fetch('/api/projects-public').then(r => r.ok ? r.json() : null).then(data => {
      if (Array.isArray(data) && data.length) setProjects(data);
    }).catch(() => {});
  }, []);

  const go = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setOpen(false);
  };

  const track = (event: string, page = window.location.pathname) => {
    fetch('/api/analytics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ page, event }) }).catch(() => {});
  };

  const openProject = (project: Project) => {
    track('project_view:' + project.title, '#work');
    setSelectedProject(project);
    setActiveImage(0);
  };

  useEffect(() => {
    document.body.style.overflow = selectedProject ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedProject]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedProject(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <main>
      <div className="noise" />

      <nav className="nav">
        <button className="brand" onClick={() => go('home')} aria-label="Go to home">
          <span className="brand-mark">&lt;/&gt;</span>MYLES<span className="dot">.</span>
        </button>
        <div className={'nav-links ' + (open ? 'open' : '')}>
          {['home', 'work', 'services', 'skills', 'about'].map((x) => (
            <button key={x} onClick={() => go(x)}>{x}</button>
          ))}
          <button className="nav-cta" onClick={() => { track('nav_contact'); go('contact'); }}>Let&apos;s talk <ArrowUpRight size={15} /></button>
        </div>
        <button className="menu" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? <X /> : <Menu />}
        </button>
      </nav>

      <section id="home" className="section hero">
        <div className="hero-grid" />
        <div className="hero-copy">
          <div className="eyebrow"><span className="pulse" /> AVAILABLE FOR PROJECTS</div>
          <h1>I build things<br /><span>worth clicking.</span></h1>
          <p className="hero-text">Web developer, builder and digital problem solver. I turn ideas into clean, useful interfaces, tools and experiments.</p>
          <div className="hero-actions">
            <button className="button primary" onClick={() => go('work')}>See my work <ArrowUpRight size={18} /></button>
            <button className="button ghost" onClick={() => { track('cta_work_with_me'); go('contact'); }}>Work with me</button>
          </div>
          <div className="mini-stats">
            <div><strong>07+</strong><span>Projects built</span></div>
            <div><strong>∞</strong><span>Things to learn</span></div>
            <div><strong>01</strong><span>Stubborn debugger</span></div>
          </div>
        </div>

        <div className="terminal-card">
          <div className="terminal-top"><div className="traffic"><i /><i /><i /></div><span>myles@dev ~</span><Terminal size={14} /></div>
          <div className="terminal-body">
            <p><span className="muted">$</span> whoami</p>
            <p className="output">myles<span className="cyan">@builder</span></p>
            <p><span className="muted">$</span> cat mission.txt</p>
            <p className="output">build useful stuff.<br />make it feel good to use.</p>
            <p><span className="muted">$</span> status</p>
            <p className="output"><span className="green">● online</span> <span className="dim">| learning | shipping</span></p>
            <p><span className="muted">$</span> <span className="cursor">_</span></p>
          </div>
        </div>
      </section>

      <section id="work" className="section work">
        <div className="section-heading"><div><span className="section-number">01</span><h2>Selected work</h2></div><p>Real projects, experiments and things I&apos;ve spent too many hours making work.</p></div>
        <div className="projects">
          {projects.map((p, i) => (
            <article className={'project-card ' + p.accent} key={p.title}>
              <span className="project-number">0{i + 1}</span>
              <span className="project-status">{p.status}</span>
              <div className="project-info">
                <div className="project-type">{p.type}</div>
                <h3>{p.title}</h3>
                <p>{p.desc}</p>
                <div className="tags">{p.tags.map((t) => <span key={t}>{t}</span>)}</div>
                <button className="text-button" onClick={() => openProject(p)} aria-label={'Explore ' + p.title}>Explore project <ChevronRight size={17} /></button>
              </div>
              <button className="project-icon-button" onClick={() => openProject(p)} aria-label={'View ' + p.title}>
                {p.icon ? <img className="project-icon-image" src={p.icon} alt="" /> : <span className="project-icon-fallback">&lt;/&gt;</span>}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section id="services" className="section services">
        <div className="section-heading"><div><span className="section-number">02</span><h2>What I can build</h2></div><p>From a polished public website to the software behind the scenes, I build digital products around the problem that needs solving.</p></div>
        <div className="service-grid">
          {services.map(({ icon: Icon, title, text }, i) => (
            <article className="service-card" key={title}><div className="service-icon"><Icon size={20} /><span>0{i + 1}</span></div><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
      </section>

      <section id="skills" className="section skills">
        <div className="section-heading"><div><span className="section-number">03</span><h2>What I do</h2></div><p>I like the messy middle between an idea and a finished product.</p></div>
        <div className="skill-grid">
          {skills.map(({ icon: Icon, title, text }, i) => (
            <article className="skill-card" key={title}><div className="skill-icon"><Icon size={22} /><span>0{i + 1}</span></div><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
      </section>

      <section id="building" className="section building">
        <div className="section-heading"><div><span className="section-number">04</span><h2>Currently building</h2></div><p>The portfolio is the map. These are the places I&apos;m still exploring.</p></div>
        <div className="building-grid">
          <article className="building-card"><span className="status">IN DEVELOPMENT</span><h3>VI Radar</h3><p>Turning scattered GTA VI updates into a focused tracking experience.</p><div className="tags"><span>React Native</span><span>Expo</span><span>Mobile</span></div></article>
          <article className="building-card"><span className="status">IN DEVELOPMENT</span><h3>NEXUS</h3><p>A privacy-first local PC organization assistant with AI-assisted workflows.</p><div className="tags"><span>Python</span><span>AI</span><span>Automation</span></div></article>
          <article className="building-card"><span className="status">IN DEVELOPMENT</span><h3>AudioBlitz</h3><p>An audio utility evolving across desktop and mobile with queueing, previews and processing.</p><div className="tags"><span>Expo</span><span>FFmpeg</span><span>Audio</span></div></article>
        </div>
      </section>

      <section id="about" className="section about">
        <div className="about-panel"><div className="about-mark">M</div><div>
          <span className="eyebrow">A LITTLE ABOUT ME</span>
          <h2>Curious enough to<br /><span>build the weird idea.</span></h2>
          <p>I&apos;m Myles, a developer who enjoys turning problems into working software. I&apos;m especially interested in web development, cybersecurity, AI and the tiny details that make an interface feel alive.</p>
          <p>I learn by building. That means prototypes, experiments, bugs, rebuilds, and occasionally staring at a console like it personally offended me.</p>
          <div className="about-pills"><span>Web</span><span>AI</span><span>Cybersecurity</span><span>UI/UX</span><span>Automation</span></div>
        </div></div>
      </section>

      <section id="contact" className="section contact">
        <div className="contact-inner"><div><span className="eyebrow">05 / CONTACT</span><h2>Have something<br /><span>worth building?</span></h2><p>Tell me what you&apos;re working on. If I can help, I&apos;ll let you know what I&apos;d build.</p></div>
          <div className="contact-actions">
            <a className="contact-button" href="mailto:chatmoralesgpt@gmail.com" onClick={() => track('contact_email')}><Mail size={20} /> Email me <ArrowUpRight size={18} /></a>
            <a className="contact-button secondary" href="tel:+2349166667412" onClick={() => track('contact_call')}><Phone size={19} /> Call me <ArrowUpRight size={16} /></a>
            <a className="contact-button secondary" href="https://wa.me/2349166667412" onClick={() => track('contact_whatsapp')} target="_blank" rel="noreferrer"><MessageCircle size={19} /> WhatsApp <ArrowUpRight size={16} /></a>
            <a className="contact-button secondary" href="https://github.com/" onClick={() => track('contact_github')} target="_blank" rel="noreferrer"><GitBranch size={20} /> GitHub <ArrowUpRight size={16} /></a>
          </div>
        </div>
      </section>

      {selectedProject && (
        <div className="project-modal" role="dialog" aria-modal="true" aria-label={selectedProject.title + ' project details'} onClick={() => setSelectedProject(null)}>
          <div className="project-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedProject(null)} aria-label="Close project details"><X /></button>
            <div className="modal-content">
              <div className="eyebrow">{selectedProject.status}</div>
              <div className="project-type">{selectedProject.type}</div>
              <h2>{selectedProject.title}</h2>
              <p>{selectedProject.details}</p>
              <div className="tags">{selectedProject.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>

              {selectedProject.images.length > 0 && (
                <div className="gallery">
                  <div className="gallery-main">
                    <img src={selectedProject.images[activeImage]} alt={selectedProject.title + ' project screenshot ' + (activeImage + 1)} />
                    {selectedProject.images.length > 1 && <>
                      <button className="gallery-prev" onClick={() => setActiveImage((activeImage - 1 + selectedProject.images.length) % selectedProject.images.length)} aria-label="Previous image">‹</button>
                      <button className="gallery-next" onClick={() => setActiveImage((activeImage + 1) % selectedProject.images.length)} aria-label="Next image">›</button>
                    </>}
                  </div>
                  {selectedProject.images.length > 1 && <div className="gallery-thumbs">
                    {selectedProject.images.map((src, index) => <button key={src} className={index === activeImage ? 'active' : ''} onClick={() => setActiveImage(index)} aria-label={'Show screenshot ' + (index + 1)}><img src={src} alt="" /></button>)}
                  </div>}
                </div>
              )}

              {selectedProject.video && <div className="demo-video"><div className="project-type">PROJECT DEMO</div><video controls playsInline preload="metadata" src={selectedProject.video} /></div>}

              <button className="button primary" onClick={() => { setSelectedProject(null); go('contact'); }}>Talk about this project <ArrowUpRight size={18} /></button>
            </div>
          </div>
        </div>
      )}

      <footer><span>© 2026 Myles.</span><span>Built with curiosity + caffeine.</span><span><a href="/privacy">Privacy</a> · Privacy-conscious analytics, encrypted IP storage.</span></footer>
    </main>
  );
}
