// file: frontend-nextjs/app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'MongoLink API',
  description: 'Instantly generate APIs from your MongoDB database',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <aside className="w-64 bg-white p-6 shadow-md">
          <h1 className="text-2xl font-bold text-blue-600">MongoLink API</h1>
          <nav className="mt-8">
            <Link href="/" className="block rounded py-2 px-4 text-gray-700 hover:bg-gray-200">
              Dashboard
            </Link>
            <Link href="/connect" className="mt-2 block rounded py-2 px-4 text-gray-700 hover:bg-gray-200">
              + Connect Database
            </Link>
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </body>
    </html>
  );
}