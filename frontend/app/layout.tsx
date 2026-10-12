import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'BloodLink | Blood Donation & Healthcare Network',
  description: 'National blood donation and hospital requisition platform.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F5F5F5] text-[#212121] flex flex-col font-sans">
        <AuthProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="bg-white border-t border-[#E2E8F0] py-5 text-center text-xs text-[#757575]">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <span>&copy; {new Date().getFullYear()} BloodLink. All rights reserved.</span>
              <span className="text-slate-400">National Blood Transfusion Network</span>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
