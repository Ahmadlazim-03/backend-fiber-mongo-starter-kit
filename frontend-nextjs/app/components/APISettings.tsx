// file: frontend-nextjs/app/components/APISettings.tsx
'use client';

import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';

// Tipe data untuk satu field dalam schema builder
interface SchemaField {
  id: number;
  name: string;
  type: string;
  required: boolean;
}

export default function APISettings({ project, onSettingsSave }: { project: any, onSettingsSave: () => void }) {
  const [allCollections, setAllCollections] = useState<string[]>([]);
  const [activeCollections, setActiveCollections] = useState<string[]>(project.activeCollections || []);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // State untuk Modal "Create Collection"
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [schemaFields, setSchemaFields] = useState<SchemaField[]>([{ id: Date.now(), name: '', type: 'string', required: false }]);
  const [isCreating, setIsCreating] = useState(false);

  // State untuk Modal "How to use"
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState('');

  const API_BASE_URL = `http://localhost:8080/api/v1/data/${project.id}`;

  const fetchAllCollections = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`http://localhost:8080/api/v1/projects/${project.id}/collections`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch collections');
      setAllCollections(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllCollections();
  }, [project.id]);

  const handleToggle = (collectionName: string) => {
    setActiveCollections(prev =>
      prev.includes(collectionName)
        ? prev.filter(c => c !== collectionName)
        : [...prev, collectionName]
    );
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    setError('');
    try {
        const response = await fetch(`http://localhost:8080/api/v1/projects/${project.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activeCollections }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to save settings');
        alert('Settings saved successfully!');
        onSettingsSave(); // Refresh data proyek di halaman induk
    } catch (err: any) {
        setError(err.message);
        alert(`Error: ${err.message}`);
    } finally {
        setIsSaving(false);
    }
  };
  
  const handleDeleteCollection = async (collectionName: string) => {
    if (!window.confirm(`Are you sure you want to PERMANENTLY DELETE the '${collectionName}' collection and all its data? This cannot be undone.`)) return;

    try {
        const response = await fetch(`http://localhost:8080/api/v1/projects/${project.id}/collections/${collectionName}`, {
            method: 'DELETE',
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to delete collection');
        alert('Collection deleted successfully!');
        fetchAllCollections(); // Refresh daftar koleksi
    } catch(err: any) {
        alert(`Error: ${err.message}`);
    }
  };

  const handleFieldChange = (id: number, field: keyof SchemaField, value: string | boolean) => {
    setSchemaFields(fields =>
      fields.map(f => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  const addField = () => {
    setSchemaFields(fields => [...fields, { id: Date.now(), name: '', type: 'string', required: false }]);
  };

  const removeField = (id: number) => {
    setSchemaFields(fields => fields.filter(f => f.id !== id));
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName) {
      alert('Collection name is required.');
      return;
    }
    setIsCreating(true);

    const schema = {
      bsonType: "object",
      properties: schemaFields.reduce((acc, field) => {
        if (field.name) {
          acc[field.name] = { bsonType: field.type };
        }
        return acc;
      }, {} as any),
      required: schemaFields.filter(f => f.required && f.name).map(f => f.name)
    };

    try {
      const response = await fetch(`http://localhost:8080/api/v1/projects/${project.id}/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionName: newCollectionName,
          schema: (schema.required.length > 0 || Object.keys(schema.properties).length > 0) ? schema : {}
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create collection');

      alert(data.message);
      setIsCreateModalOpen(false);
      setNewCollectionName('');
      setSchemaFields([{ id: Date.now(), name: '', type: 'string', required: false }]);
      fetchAllCollections(); // Refresh daftar koleksi setelah berhasil
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const openUsageModal = (collectionName: string) => {
    setSelectedEndpoint(`${API_BASE_URL}/${collectionName}`);
    setIsUsageModalOpen(true);
  };

  const curlSnippet = `curl -X GET "${selectedEndpoint}" \\\n -H "X-API-Key: ${project.apiKey}"`;
  const jsSnippet = `fetch('${selectedEndpoint}', {\n  headers: {\n    'X-API-Key': '${project.apiKey}'\n  }\n})\n.then(res => res.json())\n.then(console.log);`;
  const pythonSnippet = `import requests\n\nurl = "${selectedEndpoint}"\nheaders = {\n    "X-API-Key": "${project.apiKey}"\n}\n\nresponse = requests.get(url, headers=headers)\nprint(response.json())`;

  if (isLoading) return <p>Loading collections...</p>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
            <h2 className="text-2xl font-bold">API & Collections</h2>
            <p className="mt-2 text-gray-600">Manage collections and control which are exposed as API endpoints.</p>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className="rounded-md bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700">
            + New Collection
        </button>
      </div>

      {error && <p className="mt-4 font-bold text-red-500">{error}</p>}

      <div className="mt-6 space-y-4">
        {allCollections.map(name => {
          const isEnabled = activeCollections.includes(name);
          return (
            <div key={name} className="rounded-md border p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-lg">{name}</span>
                <div className="flex items-center space-x-4">
                    <button onClick={() => alert('Edit schema feature is coming soon!')} className="text-sm font-semibold text-gray-600 hover:text-blue-600">Edit</button>
                    <button onClick={() => handleDeleteCollection(name)} className="text-sm font-semibold text-gray-600 hover:text-red-600">Delete</button>
                    <label htmlFor={`toggle-${name}`} className="flex cursor-pointer items-center">
                        <div className="relative">
                            <input type="checkbox" id={`toggle-${name}`} className="sr-only" checked={isEnabled} onChange={() => handleToggle(name)} />
                            <div className="block h-8 w-14 rounded-full bg-gray-300"></div>
                            <div className={`dot absolute left-1 top-1 h-6 w-6 rounded-full bg-white transition ${isEnabled ? 'translate-x-6 !bg-green-400' : ''}`}></div>
                        </div>
                    </label>
                </div>
              </div>
              
              {isEnabled && (
                <div className="mt-4 space-y-2 rounded-lg bg-gray-50 p-3">
                    <p className="text-sm font-semibold">Endpoint Activated:</p>
                    <div className="flex items-center justify-between">
                        <code className="text-sm text-gray-700">
                            <span className="font-bold text-green-600">GET</span> /api/v1/data/{project.id}/{name}
                        </code>
                        <button onClick={() => openUsageModal(name)} className="rounded bg-blue-500 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-600">
                            How to use
                        </button>
                    </div>
                </div>
              )}
            </div>
          )
        })}
        {allCollections.length === 0 && <p className="text-center text-gray-500">No collections found. Create your first one!</p>}
      </div>
      
      <button onClick={handleSaveChanges} disabled={isSaving || allCollections.length === 0} className="mt-8 w-full rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-400">
        {isSaving ? 'Saving...' : 'Save API Endpoint Settings'}
      </button>

      {/* Modal untuk Create Collection & Schema Builder */}
      <Transition appear show={isCreateModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsCreateModalOpen(false)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    Create New Collection
                  </Dialog.Title>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label htmlFor="newCollectionName" className="block text-sm font-medium text-gray-700">Collection Name</label>
                      <input type="text" id="newCollectionName" value={newCollectionName} onChange={(e) => setNewCollectionName(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm" required />
                    </div>
                    <hr/>
                    <p className="text-sm font-medium text-gray-700">Define Schema (Optional)</p>
                    <div className="space-y-3">
                      {schemaFields.map((field) => (
                        <div key={field.id} className="grid grid-cols-12 items-center gap-2">
                          <input type="text" placeholder="Field Name" value={field.name} onChange={(e) => handleFieldChange(field.id, 'name', e.target.value)} className="col-span-4 rounded-md border-gray-300" />
                          <select value={field.type} onChange={(e) => handleFieldChange(field.id, 'type', e.target.value)} className="col-span-3 rounded-md border-gray-300">
                            <option value="string">String</option>
                            <option value="string">Image URL (String)</option>
                            <option value="double">Number</option>
                            <option value="int">Integer</option>
                            <option value="bool">Boolean</option>
                            <option value="objectId">ObjectID (Relation)</option>
                            <option value="date">Date</option>
                            <option value="array">Array</option>
                          </select>
                          <label className="col-span-4 flex items-center justify-center space-x-2">
                            <input type="checkbox" checked={field.required} onChange={(e) => handleFieldChange(field.id, 'required', e.target.checked)} className="rounded" />
                            <span>Required</span>
                          </label>
                          <button onClick={() => removeField(field.id)} className="col-span-1 text-2xl font-bold text-red-500 hover:text-red-700" disabled={schemaFields.length <= 1}>&times;</button>
                        </div>
                      ))}
                    </div>
                    <button onClick={addField} className="text-sm text-blue-600 hover:underline">+ Add Field</button>
                  </div>
                  <div className="mt-6 flex justify-end space-x-4">
                    <button type="button" className="rounded-md bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
                    <button type="button" className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700" onClick={handleCreateCollection} disabled={isCreating}>
                      {isCreating ? 'Creating...' : 'Create Collection'}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Modal untuk "How to use" */}
      <Transition appear show={isUsageModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsUsageModalOpen(false)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
              <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                  <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                      <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                          <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                              How to Use Your API Endpoint
                          </Dialog.Title>
                          <div className="mt-4 space-y-6">
                              <p className="text-sm text-gray-600">To access your data, you must include your API Key in the <code className="bg-gray-200 p-1 rounded">X-API-Key</code> header of your request. Here are some examples:</p>
                              
                              <div>
                                  <h4 className="font-semibold">cURL (Command Line)</h4>
                                  <pre className="mt-2 rounded bg-gray-900 p-4 text-sm text-white font-mono overflow-auto">{curlSnippet}</pre>
                              </div>

                              <div>
                                  <h4 className="font-semibold">JavaScript (fetch)</h4>
                                  <pre className="mt-2 rounded bg-gray-900 p-4 text-sm text-white font-mono overflow-auto">{jsSnippet}</pre>
                              </div>

                              <div>
                                  <h4 className="font-semibold">Python (requests)</h4>
                                  <pre className="mt-2 rounded bg-gray-900 p-4 text-sm text-white font-mono overflow-auto">{pythonSnippet}</pre>
                              </div>
                          </div>
                          <div className="mt-6 flex justify-end">
                              <button type="button" className="rounded-md bg-blue-100 px-4 py-2 text-blue-900 hover:bg-blue-200" onClick={() => setIsUsageModalOpen(false)}>Got it!</button>
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