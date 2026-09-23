import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Admin Login | Myles',
  description: 'Private Myles portfolio control room login.',
  icons: {
    icon: '/admin-favicon.png',
    shortcut: '/admin-favicon.png',
    apple: '/admin-favicon.png',
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
