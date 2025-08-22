// file: frontend-nextjs/app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
  dbHost: string;
  dbName: string;
  createdAt: string;
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProjects = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/v1/projects');
        const data = await response.json();
        if (!response.ok) throw new Error('Failed to fetch projects');
        setProjects(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
        return;
    }
    try {
        const response = await fetch(`http://localhost:8080/api/v1/projects/${projectId}`, {
            method: 'DELETE',
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to delete project');
        
        alert('Project deleted successfully!');
        // Hapus proyek dari state agar UI terupdate tanpa refresh
        setProjects(currentProjects => currentProjects.filter(p => p.id !== projectId));

    } catch (err: any) {
        alert(`Error: ${err.message}`);
    }
  };


  if (isLoading) return <p>Loading projects...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;

  return (
    <div>
      <h1 className="text-3xl font-bold">My Projects</h1>
      
      {projects.length === 0 ? (
        <div className="mt-6 rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
            <h2 className="text-xl font-medium text-gray-900">No Projects Found</h2>
            <p className="mt-2 text-gray-500">Get started by connecting your first database.</p>
            <Link href="/connect" className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">
              Connect Database
            </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div key={project.id} className="flex flex-col justify-between rounded-lg bg-white p-6 shadow transition hover:shadow-lg">
              <div>
                <h3 className="text-xl font-semibold">{project.name}</h3>
                <p className="mt-2 text-sm text-gray-500">{project.dbHost} / {project.dbName}</p>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <Link href={`/project/${project.id}`} className="font-semibold text-blue-600 hover:underline">
                  Manage →
                </Link>
                <button 
                  onClick={() => handleDeleteProject(project.id)}
                  className="rounded bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}