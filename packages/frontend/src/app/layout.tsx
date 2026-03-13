import type { Metadata } from 'next';
import './globals.css';
import { ThemeInitScript } from './theme-init';

export const metadata: Metadata = {
  title: 'OpenClaw Studio',
  description: 'Visual design studio for multi-agent architectures',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeInitScript />
      </head>
      <body className="min-h-screen bg-studio-bg text-studio-text">
        {children}
      </body>
    </html>
  );
}
