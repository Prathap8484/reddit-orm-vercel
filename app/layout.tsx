import '../src/index.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'Samsung ORM | Agency Intelligence',
  description: 'Real-time Reddit mentions and Comment Studio.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased text-slate-100 min-h-screen selection:bg-purple-500/30"
            style={{ 
              fontFamily: "'Outfit', sans-serif",
              backgroundColor: '#030712',
              backgroundImage: 'radial-gradient(circle at 10% 40%, rgba(139, 92, 246, 0.15), transparent 30%), radial-gradient(circle at 90% 20%, rgba(56, 189, 248, 0.1), transparent 30%), radial-gradient(circle at 50% 90%, rgba(16, 185, 129, 0.08), transparent 40%)',
              backgroundAttachment: 'fixed'
            }}>
        {children}
      </body>
    </html>
  );
}
