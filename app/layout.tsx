import '../src/index.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'Agency Reddit Dashboard',
  description: 'Real-time Reddit mentions and sentiment analysis.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#050810] text-gray-100 font-sans min-h-screen antialiased selection:bg-purple-500/30">
        {children}
      </body>
    </html>
  );
}
