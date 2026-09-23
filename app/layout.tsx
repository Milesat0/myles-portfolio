import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'Myles | Web Developer & Digital Problem Solver',
  description: 'Portfolio of Myles: web development, AI, automation, cybersecurity and digital problem solving.',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    title: 'Myles | Web Developer & Digital Problem Solver',
    description: 'I build things worth clicking.',
    images: ['/open_graph.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Myles | Web Developer & Digital Problem Solver',
    description: 'I build things worth clicking.',
    images: ['/open_graph.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
