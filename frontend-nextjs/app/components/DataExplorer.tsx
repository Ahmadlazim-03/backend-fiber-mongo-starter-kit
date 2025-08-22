// file: frontend-nextjs/app/components/DataExplorer.tsx
'use client';

import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';

// Definisikan props yang akan diterima komponen ini dari halaman induknya
interface DataExplorerProps {
  projectId: string;
  apiKey: string;
  collectionNameFromUrl: string; // Menerima nama koleksi dari parameter URL
}

export default function DataExplorer({ projectId, apiKey, collectionNameFromUrl }: DataExplorerProps) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // State untuk modal Create/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentDoc, setCurrentDoc] = useState<any>(null);
  const [docContent, setDocContent] = useState('');

  // Fungsi untuk mengambil data dari API
  const fetchData = async () => {
    if (!projectId || !collectionNameFromUrl) return;
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`http://localhost:8080/api/v1/data/${projectId}/${collectionNameFromUrl}`, {
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

  // useEffect sekarang bergantung pada prop dari URL untuk memuat data
  useEffect(() => {
    fetchData();
  }, [collectionNameFromUrl, projectId]); // Muat ulang data jika URL koleksi berubah

  const handleDelete = async (docId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      const response = await fetch(`http://localhost:8080/api/v1/data/${projectId}/${collectionNameFromUrl}/${docId}`, {
        method: 'DELETE',
        headers: { 'X-API-Key': apiKey },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Delete failed');
      alert('Document deleted successfully!');
      fetchData(); // Muat ulang data setelah berhasil menghapus
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
      url = `http://localhost:8080/api/v1/data/${projectId}/${collectionNameFromUrl}/${currentDoc._id}`;
      method = 'PUT';
    } else {
      url = `http://localhost:8080/api/v1/data/${projectId}/${collectionNameFromUrl}`;
      method = 'POST';
    }
    
    try {
      JSON.parse(docContent); // Validasi JSON sebelum mengirim
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: docContent,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Save failed');
      
      alert(`Document ${isEditing ? 'updated' : 'created'} successfully!`);
      setIsModalOpen(false);
      fetchData(); // Muat ulang data setelah berhasil menyimpan
    } catch (err: any) {
        alert(`Error: Invalid JSON format or API error.\n${err.message}`);
    }
  };

  return (
    <div className="mt-4 w-full">
      <div className="flex items-center justify-between">
        <p className="text-gray-600">
            API Key: <code className="bg-gray-200 p-1 font-mono text-sm rounded">{apiKey}</code>
        </p>
        <div>
            <button onClick={fetchData} disabled={isLoading} className="mr-4 rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-400">
            {isLoading ? 'Loading...' : 'Refresh'}
            </button>
            <button onClick={openCreateModal} className="rounded-md bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700">
            + Create New
            </button>
        </div>
      </div>
      
      {error && <div className="mt-4 rounded bg-red-100 p-4 text-center font-bold text-red-700">{error}</div>}

      <div className="mt-6 overflow-x-auto rounded-lg border">
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
                {headers.map(header => (
                  <td key={`${doc._id}-${header}`} className="whitespace-nowrap px-6 py-4 text-sm text-gray-700 max-w-xs truncate">
                    {JSON.stringify(doc[header])}
                  </td>
                ))}
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
        {documents.length === 0 && !isLoading && <p className="py-8 text-center text-gray-500">No documents found in this collection.</p>}
        {isLoading && <p className="py-8 text-center text-gray-500">Loading documents...</p>}
      </div>

      {/* Modal untuk Create/Edit */}
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
                              {isEditing ? `Edit Document in "${collectionNameFromUrl}"` : `Create New Document in "${collectionNameFromUrl}"`}
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