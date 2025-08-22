// file: frontend-nextjs/app/project/[projectId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import DataExplorer from '@/app/components/DataExplorer';
import APISettings from '@/app/components/APISettings'; // Komponen baru

interface Project {
  id: string;
  name: string;
  apiKey: string;
  activeCollections: string[];
}

export default function ProjectPage({ params }: { params: { projectId: string } }) {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('explorer');

  const fetchProjectDetails = async () => {
      if (!params.projectId) return;
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch('http://localhost:8080/api/v1/projects');
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to fetch project list');
        }
        
        const projects: Project[] = await response.json();
        const currentProject = projects.find((p) => p.id === params.projectId);

        if (!currentProject) {
          throw new Error(`Project with ID ${params.projectId} not found.`);
        }
        if (!currentProject.apiKey) {
            throw new Error('API Key is missing from the project data.');
        }

        setProject(currentProject);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [params.projectId]);

  if (isLoading) return <p>Loading project details...</p>;
  if (error) return <p className="text-red-500 font-bold p-4 bg-red-100 rounded-md">Error: {error}</p>;

  return (
    <div>
      {project && (
        <>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          
          <div className="mt-4 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button onClick={() => setActiveTab('explorer')} className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'explorer' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}>
                Data Explorer
              </button>
              <button onClick={() => setActiveTab('settings')} className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'settings' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}>
                API Settings
              </button>
            </nav>
          </div>

          <div className="mt-6">
            {activeTab === 'explorer' && <DataExplorer projectId={project.id} apiKey={project.apiKey} />}
            {activeTab === 'settings' && <APISettings project={project} onSettingsSave={fetchProjectDetails} />}
          </div>
        </>
      )}
    </div>
  );
}