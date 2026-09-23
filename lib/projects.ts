export type Project = {
  id?: string;
  title: string;
  type: string;
  desc: string;
  tags: string[];
  accent: 'violet' | 'cyan' | 'orange';
  status: string;
  details: string;
  images: string[];
  video?: string;
  icon: string;
  sort_order?: number;
};

export const defaultProjects: Project[] = [
  {
    title: 'NEXUS', type: 'Intelligent File Organization',
    desc: 'A privacy-first desktop tool that scans, classifies and organizes files while keeping the user in control.',
    tags: ['Python', 'AI', 'PySide6', 'Automation'], accent: 'violet', status: 'In development',
    details: 'A Windows-first file organization and cleanup app with scanning, classification, protected items, organization previews, local AI support and a privacy-first design.',
    images: ['/images/nexus-01.png'], icon: '/images/icons/nexus.png', sort_order: 1,
  },
  {
    title: 'AudioBlitz', type: 'Media Processing',
    desc: 'A media-focused application exploring audio processing, queue management, waveform visualization and mobile delivery.',
    tags: ['Python', 'React Native', 'Expo', 'Audio'], accent: 'cyan', status: 'In development',
    details: 'An audio-focused project built around importing media, managing a queue, previewing audio, waveform visualization, merging, transitions and mobile delivery.',
    images: ['/images/audioblitz-01.png', '/images/audioblitz-02.png', '/images/audioblitz-03.png'], icon: '/images/icons/audioblitz.png', sort_order: 2,
  },
  {
    title: 'VI Radar', type: 'GTA VI Intelligence Platform',
    desc: 'A mobile-focused radar for GTA VI news, updates, sightings and everything worth tracking as the game gets closer.',
    tags: ['React Native', 'Expo', 'Mobile', 'News'], accent: 'violet', status: 'In development',
    details: 'A mobile project designed to turn scattered GTA VI information into a focused radar experience. The project is evolving with more features, feeds and tools to come.',
    images: ['/images/vi-radar-cover.jpg'], video: '/images/vi-radar-demo.mp4', icon: '/images/icons/vi-radar.png', sort_order: 3,
  },
  {
    title: 'Paradise Eatery', type: 'Business Website',
    desc: 'A modern web presence for a real food business, focused on clear navigation and practical customer actions.',
    tags: ['Next.js', 'Supabase', 'UI/UX'], accent: 'orange', status: 'Client project',
    details: 'A customer-facing website built for a real food business, combining a polished interface with practical business information and Supabase-backed functionality.',
    images: ['/images/paradise-01.png', '/images/paradise-02.png', '/images/paradise-03.png', '/images/paradise-04.png'], icon: '/images/icons/paradise-eatery.png', sort_order: 4,
  },
  {
    title: 'SpaceSage', type: 'Productivity & Space Management',
    desc: 'A focused productivity concept designed to turn planning, organization and personal workflows into a calmer digital space.',
    tags: ['Next.js', 'Productivity', 'UI/UX'], accent: 'violet', status: 'In development',
    details: 'SpaceSage is a productivity-focused project exploring a calmer way to organize tasks, plans and personal workflows. The project is being shaped as a polished, practical experience rather than another noisy productivity dashboard.',
    images: [], icon: '/images/icons/spacesage.png', sort_order: 5,
  },
  {
    title: 'CareOS', type: 'Personal Care & Wellness Platform',
    desc: 'A mobile-first care platform focused on making personal routines, tracking and everyday care easier to manage.',
    tags: ['React Native', 'Mobile', 'Productivity', 'UX'], accent: 'cyan', status: 'In development',
    details: 'CareOS is a mobile-first project built around a practical personal-care experience, with the mobile version treated as the primary product. The project focuses on clear workflows, useful tracking and a calm interface that makes everyday care information easier to manage.',
    images: [], icon: '/images/icons/careos.png', sort_order: 6,
  },
  {
    title: 'Polo Court Hotel', type: 'Hospitality Website',
    desc: 'A polished hotel website concept focused on presenting the property, amenities, story and guest-facing information with a calm luxury feel.',
    tags: ['Web Development', 'UI/UX', 'Hospitality'], accent: 'cyan', status: 'Project',
    details: 'A hospitality-focused website for Polo Court Hotel in Port Harcourt, designed around a premium but approachable visual system. The project includes a home experience, amenities presentation, hotel story and a categorized gallery, with responsive navigation and guest-oriented calls to action.',
    images: ['/images/polo-court-01.png', '/images/polo-court-02.png', '/images/polo-court-03.png', '/images/polo-court-04.png'], icon: '', sort_order: 7,
  },
];
