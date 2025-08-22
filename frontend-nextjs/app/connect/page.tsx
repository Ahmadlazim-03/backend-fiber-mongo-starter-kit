// file: frontend-nextjs/app/connect/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function ConnectPage() {
  const router = useRouter();

  // State untuk form koneksi
  const [projectName, setProjectName] = useState('');
  const [dbHost, setDbHost] = useState('');
  const [dbPort, setDbPort] = useState('27017');
  const [dbUser, setDbUser] = useState('');
  const [dbPassword, setDbPassword] = useState('');
  const [dbName, setDbName] = useState('');
  const [authSource, setAuthSource] = useState('admin');
  
  // State untuk UI feedback
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('http://localhost:8080/api/v1/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: projectName, dbHost, dbPort, dbUser, dbPassword, dbName, authSource }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }
      
      // Jika berhasil, arahkan kembali ke halaman utama (dashboard)
      alert('Project connected successfully!');
      router.push('/'); 

    } catch (err: any) {
      setMessage(err.message);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Connect a New Database</h1>
      <div className="w-full max-w-2xl rounded-lg bg-white p-8 shadow-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="projectName" className="block text-sm font-medium text-gray-700">Project Name</label>
            <input type="text" id="projectName" value={projectName} onChange={(e) => setProjectName(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm" placeholder="My E-Commerce API" required />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="dbHost" className="block text-sm font-medium text-gray-700">Host</label>
              <input type="text" id="dbHost" value={dbHost} onChange={(e) => setDbHost(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm" placeholder="127.0.0.1 or cluster.mongodb.net" required />
            </div>
            <div>
              <label htmlFor="dbPort" className="block text-sm font-medium text-gray-700">Port</label>
              <input type="text" id="dbPort" value={dbPort} onChange={(e) => setDbPort(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm" placeholder="27017" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="dbUser" className="block text-sm font-medium text-gray-700">Username (Optional)</label>
              <input type="text" id="dbUser" value={dbUser} onChange={(e) => setDbUser(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm" placeholder="admin" />
            </div>
            <div>
              <label htmlFor="dbPassword" className="block text-sm font-medium text-gray-700">Password (Optional)</label>
              <input type="password" id="dbPassword" value={dbPassword} onChange={(e) => setDbPassword(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="dbName" className="block text-sm font-medium text-gray-700">Database Name</label>
              <input type="text" id="dbName" value={dbName} onChange={(e) => setDbName(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm" placeholder="toko_online" required />
            </div>
            <div>
              <label htmlFor="authSource" className="block text-sm font-medium text-gray-700">Auth Source (Optional)</label>
              <input type="text" id="authSource" value={authSource} onChange={(e) => setAuthSource(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm" placeholder="admin" />
            </div>
          </div>
          <button type="submit" disabled={isLoading} className="w-full rounded-md bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:bg-gray-400">
            {isLoading ? 'Connecting...' : 'Connect & Create Project'}
          </button>
        </form>
        {message && (
          <div className={`mt-4 rounded p-4 text-center font-bold ${isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}