import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

export const metadata: Metadata = {
  title: {
    default: 'BloodLink | Blood Donation & Healthcare Network',
    template: '%s | BloodLink',
  },
  description: 'National blood donation and hospital requisition platform.',
  applicationName: 'BloodLink',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#C62828',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F8FAFC] font-sans text-[#1E293B] antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
