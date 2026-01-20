'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Brain } from 'lucide-react';

export function Header() {
  const pathname = usePathname();

  if (pathname === '/') return null; // Don't show on landing page

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <Brain className="w-6 h-6 text-blue-600" />
            <span className="text-xl font-bold">AI Study Planner</span>
          </Link>
          <nav className="flex space-x-6">
            <Link
              href="/dashboard"
              className={`${
                pathname === '/dashboard'
                  ? 'text-blue-600 font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/checkin"
              className={`${
                pathname === '/checkin'
                  ? 'text-blue-600 font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Check-in
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}