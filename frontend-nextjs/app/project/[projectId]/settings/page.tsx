// file: frontend-nextjs/app/project/[projectId]/settings/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import APISettings from '@/app/components/APISettings'; // Sesuaikan path

interface Project {
  id: string;
  name: string;
  apiKey: string;
  activeCollections: string[];
}

export default function SettingsPage() {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const params = useParams();
  const projectId = params.projectId as string;

  const fetchProjectDetails = async () => {
      if (!projectId) return;
      setIsLoading(true);
      setError('');
      try {
        // Panggil endpoint baru yang lebih spesifik
        const response = await fetch(`http://localhost:8080/api/v1/projects/${projectId}`);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch project details');
        }
        setProject(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [projectId]);

  if (isLoading) return <p>Loading project settings...</p>;
  if (error) return <p className="text-red-500 font-bold p-4 bg-red-100 rounded-md">Error: {error}</p>;

  return (
    <div>
      {project && (
        <>
          <h1 className="text-3xl font-bold">Project Settings</h1>
          <APISettings project={project} onSettingsSave={fetchProjectDetails} />
        </>
      )}
    </div>
  );
}