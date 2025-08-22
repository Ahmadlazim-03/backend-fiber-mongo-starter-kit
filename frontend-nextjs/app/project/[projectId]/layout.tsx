// file: frontend-nextjs/app/project/[projectId]/layout.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const [collections, setCollections] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const params = useParams();
  const pathname = usePathname();
  const projectId = params.projectId as string;

  useEffect(() => {
    if (!projectId) return;
    const fetchCollections = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`http://localhost:8080/api/v1/projects/${projectId}/collections`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch collections');
        setCollections(data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCollections();
  }, [projectId]);

  return (
    <div className="flex h-full w-full">
      {/* Sidebar Navigasi Koleksi */}
      <aside className="flex h-full w-64 flex-col border-r bg-white">
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold">Collections</h2>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {isLoading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : (
            collections.map(name => {
              const isActive = pathname.endsWith(`/${name}`);
              return (
                <Link 
                  key={name}
                  href={`/project/${projectId}/${name}`}
                  className={`block rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  {name}
                </Link>
              );
            })
          )}
        </nav>
        <div className="border-t p-2">
           <Link href={`/project/${projectId}/settings`} className={`block w-full rounded-md px-3 py-2 text-sm font-medium ${pathname.endsWith('/settings') ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>
             ⚙️ Settings
           </Link>
        </div>
      </aside>

      {/* Konten Utama */}
      <div className="flex-1 overflow-y-auto p-8">
        {children}
      </div>
    </div>
  );
}