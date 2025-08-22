// file: frontend-nextjs/app/components/DataExplorer.tsx
'use client';

import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';

// Definisikan props yang akan diterima komponen ini
interface DataExplorerProps {
  projectId: string;
  apiKey: string;
}

export default function DataExplorer({ projectId, apiKey }: DataExplorerProps) {
  const [allCollections, setAllCollections] = useState<string[]>([]); // State baru untuk daftar koleksi
  const [collectionName, setCollectionName] = useState(''); // Default collection name
  const [documents, setDocuments] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // State untuk modal Create/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentDoc, setCurrentDoc] = useState<any>(null);
  const [docContent, setDocContent] = useState('');


  // useEffect baru untuk mengambil daftar semua koleksi saat komponen dimuat
  useEffect(() => {
    const fetchCollectionsList = async () => {
      if (!projectId) return;
      try {
        const response = await fetch(`http://localhost:8080/api/v1/projects/${projectId}/collections`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch collections');
        
        setAllCollections(data);
        // Secara otomatis pilih koleksi pertama sebagai default jika ada
        if (data.length > 0 && collectionName === '') {
          setCollectionName(data[0]);
        }
      } catch (err: any) {
        setError(`Failed to load collection list: ${err.message}`);
      }
    };
    fetchCollectionsList();
  }, [projectId]);


  // Fungsi untuk mengambil data dokumen dari koleksi yang dipilih
  const fetchData = async () => {
    if (!projectId || !collectionName) return;
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`http://localhost:8080/api/v1/data/${projectId}/${collectionName}`, {
        headers: { 'X-API-Key': apiKey },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Fetch failed');
      
      setDocuments(data);
      if (data.length > 0) {
        setHeaders(Object.keys(data[0]));
      } else {
        setHeaders([]);
      }
    } catch (err: any) {
      setError(err.message);
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };

  // useEffect ini sekarang akan terpanggil setiap kali collectionName berubah (dari dropdown)
  useEffect(() => {
    fetchData();
  }, [collectionName]); // Hanya bergantung pada collectionName

  const handleDelete = async (docId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      const response = await fetch(`http://localhost:8080/api/v1/data/${projectId}/${collectionName}/${docId}`, {
        method: 'DELETE',
        headers: { 'X-API-Key': apiKey },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Delete failed');
      alert('Document deleted successfully!');
      fetchData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setDocContent('{\n  "key": "value"\n}');
    setCurrentDoc(null);
    setIsModalOpen(true);
  };
  
  const openEditModal = (doc: any) => {
    setIsEditing(true);
    setCurrentDoc(doc);
    const { _id, ...editableDoc } = doc;
    setDocContent(JSON.stringify(editableDoc, null, 2));
    setIsModalOpen(true);
  };
  
  const handleSave = async () => {
    let url: string;
    let method: string;
    
    if (isEditing) {
      url = `http://localhost:8080/api/v1/data/${projectId}/${collectionName}/${currentDoc._id}`;
      method = 'PUT';
    } else {
      url = `http://localhost:8080/api/v1/data/${projectId}/${collectionName}`;
      method = 'POST';
    }
    
    try {
      JSON.parse(docContent);
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: docContent,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Save failed');
      
      alert(`Document ${isEditing ? 'updated' : 'created'} successfully!`);
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
        alert(`Error: Invalid JSON format or API error.\n${err.message}`);
    }
  };

  return (
    <div className="mt-8 w-full max-w-4xl rounded-lg bg-white p-8 shadow-md">
      <h2 className="text-2xl font-bold">Data Explorer</h2>
      <div className="flex items-center space-x-4">
        <p className="mt-2 text-gray-600">
          Project ID: <code className="bg-gray-200 p-1 font-mono text-sm rounded">{projectId}</code>
        </p>
        <p className="mt-2 text-gray-600">
          API Key: <code className="bg-gray-200 p-1 font-mono text-sm rounded">{apiKey}</code>
        </p>
      </div>

      <div className="mt-6 flex items-end space-x-4">
        <div className="flex-grow">
          <label htmlFor="collectionName" className="block text-sm font-medium text-gray-700">Collection Name</label>
          <select
            id="collectionName"
            value={collectionName}
            onChange={(e) => setCollectionName(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm"
            disabled={allCollections.length === 0}
          >
            {allCollections.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
             {allCollections.length === 0 && <option>No collections found</option>}
          </select>
        </div>
        <button onClick={fetchData} disabled={isLoading} className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-400">
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
         <button onClick={openCreateModal} disabled={allCollections.length === 0} className="rounded-md bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:bg-gray-400">
          + Create
        </button>
      </div>
      
      {error && <div className="mt-4 rounded bg-red-100 p-4 text-center font-bold text-red-700">{error}</div>}

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {headers.map(header => <th key={header} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{header}</th>)}
              {headers.length > 0 && <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {documents.map(doc => (
              <tr key={doc._id}>
                {headers.map(header => <td key={`${doc._id}-${header}`} className="whitespace-nowrap px-6 py-4 text-sm text-gray-700 max-w-xs truncate">{JSON.stringify(doc[header])}</td>)}
                {headers.length > 0 && (
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <button onClick={() => openEditModal(doc)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                    <button onClick={() => handleDelete(doc._id)} className="ml-4 text-red-600 hover:text-red-900">Delete</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {documents.length === 0 && !isLoading && <p className="py-4 text-center text-gray-500">No documents found in this collection.</p>}
      </div>

      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsModalOpen(false)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
              <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                  <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                      <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                          <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                              {isEditing ? 'Edit Document' : 'Create New Document'}
                          </Dialog.Title>
                          <div className="mt-4">
                              <textarea
                                  className="h-64 w-full rounded-md border p-2 font-mono text-sm"
                                  value={docContent}
                                  onChange={(e) => setDocContent(e.target.value)}
                              />
                          </div>
                          <div className="mt-6 flex justify-end space-x-4">
                              <button type="button" className="rounded-md bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200" onClick={() => setIsModalOpen(false)}>Cancel</button>
                              <button type="button" className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700" onClick={handleSave}>Save</button>
                          </div>
                      </Dialog.Panel>
                  </Transition.Child>
              </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}