import type { Metadata } from 'next';
import './globals.css';
import MswInit from './_components/MswInit';

export const metadata: Metadata = {
  title: 'EPCC — Social Management',
  description: 'Eastern Province Chamber of Commerce — unified social media platform.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <MswInit />
        {children}
      </body>
    </html>
  );
}
