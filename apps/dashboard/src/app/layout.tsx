import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'ACP Dashboard',
  description: 'AN Communications Platform operator dashboard',
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-5xl p-6">{children}</div>
      </body>
    </html>
  );
}
