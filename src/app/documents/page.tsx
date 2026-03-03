'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/store/AppContext';
import { DocumentCard } from '@/components/documents/DocumentCard';
import { AddDocumentForm } from '@/components/documents/AddDocumentForm';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { STANDARD_DOCUMENT_TAGS } from '@/config/group';
import { FolderOpen, Plus } from 'lucide-react';

export default function DocumentsPage() {
  const { documents, courses } = useApp();
  const [showForm, setShowForm] = useState(false);

  const structure = useMemo(
    () =>
      courses.map((course) => {
        const courseDocs = documents.filter((doc) => doc.courseId === course.id);
        const hasMasterFolder = courseDocs.some((doc) =>
          doc.tags.some((tag) => tag.toLowerCase() === 'mappe')
        );

        const tags = courseDocs.flatMap((doc) => doc.tags.map((tag) => tag.toLowerCase()));
        const missingTags = STANDARD_DOCUMENT_TAGS.filter((tag) => !tags.includes(tag));

        return {
          course,
          count: courseDocs.length,
          hasMasterFolder,
          missingTags,
        };
      }),
    [courses, documents]
  );

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

      <Card>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <h2 className="font-semibold text-gray-900 text-sm">Dokumentstruktur pr. fag</h2>
          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            <FolderOpen className="w-3.5 h-3.5" />
            Standard-tags: {STANDARD_DOCUMENT_TAGS.join(', ')}
          </span>
        </div>
        <ul className="divide-y divide-gray-50">
          {structure.length === 0 && (
            <li className="px-5 py-4 text-sm text-gray-500">Opret et fag for at opbygge dokumentstruktur.</li>
          )}
          {structure.map((item) => (
            <li key={item.course.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.course.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.count} dokument(er)</p>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    item.hasMasterFolder ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {item.hasMasterFolder ? 'Mappe-link ok' : 'Mangler mappe-link'}
                </span>
              </div>
              {item.missingTags.length > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  Mangler tags: {item.missingTags.join(', ')}
                </p>
              )}
            </li>
          ))}
        </ul>
      </Card>

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
