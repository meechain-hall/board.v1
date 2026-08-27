import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MeeChain Magic Hall | Quest & Relic Network',
  description: 'Enter the MeeChain Magic Hall to explore quests, rituals, relics, and network guardians.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
