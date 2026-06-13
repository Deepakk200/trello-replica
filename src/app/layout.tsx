import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ui/theme-provider';
import { SessionProvider } from '@/components/ui/session-provider';
import { StoreNamespacer } from '@/components/ui/store-namespacer';
import { LegacyDbSync } from '@/components/ui/legacy-db-sync';
import { OfflineBanner } from '@/components/ui/offline-banner';
import { PwaInstallPrompt } from '@/components/ui/pwa-install-prompt';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://trello-replica-one.vercel.app'),
  title: {
    default: 'Trello Clone — Project boards your team will actually use',
    template: '%s — Trello Clone',
  },
  description:
    'Drag-and-drop project boards with real-time collaboration, AI features, ' +
    'checklists, and file attachments. Free to start.',
  keywords: [
    'project management', 'kanban board', 'task tracking',
    'team collaboration', 'trello alternative', 'free kanban',
  ],
  authors: [{ name: 'Trello Clone' }],
  creator: 'Trello Clone',
  robots: { index: true, follow: true },
  icons: { icon: '/favicon.svg', apple: '/icons/icon-192.svg' },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Trello Clone',
  },
  openGraph: {
    type: 'website',
    siteName: 'Trello Clone',
    title: 'Trello Clone — Project boards your team will actually use',
    description: 'Free kanban boards with real-time collaboration and AI features.',
    url: 'https://trello-replica-one.vercel.app',
    images: [{
      url: '/og-image.png', // static fallback (create a 1200x630 PNG before launch)
      width: 1200,
      height: 630,
      alt: 'Trello Clone — board view',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Trello Clone',
    description: 'Free kanban boards with real-time collaboration and AI features.',
    images: ['/og-image.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)',  color: '#1D2125' },
    { media: '(prefers-color-scheme: light)', color: '#F7F8F9' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-trello-bg text-trello-text antialiased min-h-screen`}>
        <OfflineBanner />
        <SessionProvider>
          <StoreNamespacer />
          <LegacyDbSync />
          <ThemeProvider>{children}</ThemeProvider>
        </SessionProvider>
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
