'use client';

import { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { DocumentCard } from '@/components/documents/DocumentCard';
import { AddDocumentForm } from '@/components/documents/AddDocumentForm';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';

export default function DocumentsPage() {
  const { documents } = useApp();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dokumenter</h1>
          <p className="text-sm text-gray-500 mt-1">{documents.length} links gemt</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Tilføj dokument
        </Button>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium">Ingen dokumenter endnu</p>
          <p className="text-sm mt-1">Gem et link til et Google Doc, Drive-mappe eller en anden ressource.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <DocumentCard key={doc.id} document={doc} />
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Tilføj dokument">
        <AddDocumentForm onClose={() => setShowForm(false)} />
      </Modal>
    </div>
  );
}
