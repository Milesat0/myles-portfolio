import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Control Room | Myles',
  description: 'Private Myles portfolio control room.',
  robots: { index: false, follow: false },
  icons: {
    icon: '/admin-favicon.png',
    shortcut: '/admin-favicon.png',
    apple: '/admin-favicon.png',
  },
  openGraph: {
    title: 'Myles · Control Room',
    description: 'Private portfolio control room.',
    images: [{ url: '/admin-open_graph.png', width: 1200, height: 630, alt: 'Myles Control Room' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Myles · Control Room',
    description: 'Private portfolio control room.',
    images: ['/admin-open_graph.png'],
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
