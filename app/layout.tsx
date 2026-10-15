import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'AstraChat - BYO Key Web Client',
  description: 'A minimal, privacy-focused client-side AI chat client with local IndexedDB storage, streaming Markdown, and OpenAI-compatible API support.',
  openGraph: {
    title: 'AstraChat - BYO Key Web Client',
    description: 'A minimal, privacy-focused client-side AI chat client with local IndexedDB storage, streaming Markdown, and OpenAI-compatible API support.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AstraChat - BYO Key Web Client',
    description: 'A minimal, privacy-focused client-side AI chat client with local IndexedDB storage, streaming Markdown, and OpenAI-compatible API support.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
