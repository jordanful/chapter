import type { Metadata, Viewport } from 'next';
import { Inter, Crimson_Pro } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/lib/query-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { ServiceWorkerProvider } from '@/components/service-worker-provider';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const crimsonPro = Crimson_Pro({ subsets: ['latin'], variable: '--font-serif' });

export const metadata: Metadata = {
  title: 'Chapter',
  description: 'Minimal, offline-first reading app',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Chapter',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${crimsonPro.variable} font-sans antialiased`}>
        <ServiceWorkerProvider>
          <QueryProvider>
            <ThemeProvider>{children}</ThemeProvider>
          </QueryProvider>
        </ServiceWorkerProvider>
      </body>
    </html>
  );
}
