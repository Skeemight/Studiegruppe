'use client';

import React, { createContext, useContext, useCallback } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { Course, Task, Document, Exam } from '@/types';

const defaultCourses: Course[] = [];
const defaultTasks: Task[] = [];
const defaultDocuments: Document[] = [];
const defaultExams: Exam[] = [];

// ── Helpers ───────────────────────────────────────────────────────────────────

const generateId = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

// ── Context type ──────────────────────────────────────────────────────────────

interface AppContextType {
  courses: Course[];
  tasks: Task[];
  documents: Document[];
  exams: Exam[];
  getCourseById: (id: string) => Course | undefined;
  addCourse: (course: Omit<Course, 'id'>) => void;
  deleteCourse: (id: string) => void;
  addTask: (task: Omit<Task, 'id'>) => void;
  updateTask: (id: string, updates: Partial<Omit<Task, 'id'>>) => void;
  deleteTask: (id: string) => void;
  addDocument: (doc: Omit<Document, 'id'>) => void;
  deleteDocument: (id: string) => void;
  addExam: (exam: Omit<Exam, 'id'>) => void;
  deleteExam: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [courses, setCourses] = useLocalStorage<Course[]>('sg_courses', defaultCourses);
  const [tasks, setTasks] = useLocalStorage<Task[]>('sg_tasks', defaultTasks);
  const [documents, setDocuments] = useLocalStorage<Document[]>('sg_documents', defaultDocuments);
  const [exams, setExams] = useLocalStorage<Exam[]>('sg_exams', defaultExams);

  const getCourseById = useCallback(
    (id: string) => courses.find((c) => c.id === id),
    [courses]
  );

  const addCourse = useCallback(
    (course: Omit<Course, 'id'>) =>
      setCourses((prev) => [...prev, { ...course, id: generateId() }]),
    [setCourses]
  );

  const deleteCourse = useCallback(
    (id: string) => setCourses((prev) => prev.filter((c) => c.id !== id)),
    [setCourses]
  );

  const addTask = useCallback(
    (task: Omit<Task, 'id'>) =>
      setTasks((prev) => [...prev, { ...task, id: generateId() }]),
    [setTasks]
  );

  const updateTask = useCallback(
    (id: string, updates: Partial<Omit<Task, 'id'>>) =>
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t))),
    [setTasks]
  );

  const deleteTask = useCallback(
    (id: string) => setTasks((prev) => prev.filter((t) => t.id !== id)),
    [setTasks]
  );

  const addDocument = useCallback(
    (doc: Omit<Document, 'id'>) =>
      setDocuments((prev) => [...prev, { ...doc, id: generateId() }]),
    [setDocuments]
  );

  const deleteDocument = useCallback(
    (id: string) => setDocuments((prev) => prev.filter((d) => d.id !== id)),
    [setDocuments]
  );

  const addExam = useCallback(
    (exam: Omit<Exam, 'id'>) =>
      setExams((prev) => [...prev, { ...exam, id: generateId() }]),
    [setExams]
  );

  const deleteExam = useCallback(
    (id: string) => setExams((prev) => prev.filter((e) => e.id !== id)),
    [setExams]
  );

  return (
    <AppContext.Provider
      value={{
        courses, tasks, documents, exams,
        getCourseById,
        addCourse, deleteCourse,
        addTask, updateTask, deleteTask,
        addDocument, deleteDocument,
        addExam, deleteExam,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// ── Consumer hook ─────────────────────────────────────────────────────────────

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
