'use client';

import React, { createContext, useCallback, useContext, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { Course, Task, Document, Exam, Meeting, StudyNote } from '@/types';

const SEED_MARKER_KEY = 'sg_seed_hait_v1';

const DEFAULT_COURSES: Course[] = [];
const DEFAULT_TASKS: Task[] = [];
const DEFAULT_DOCUMENTS: Document[] = [];
const DEFAULT_EXAMS: Exam[] = [];
const DEFAULT_MEETINGS: Meeting[] = [];
const DEFAULT_NOTES: StudyNote[] = [];

const SEEDED_COURSES: Course[] = [
  { id: 'course-regnskab', name: 'Regnskab (virksomheds økonomi)', semester: 'Forår 2026' },
  { id: 'course-it-projektledelse', name: 'IT-Projektledelse', semester: 'Forår 2026' },
  { id: 'course-organisationsteori', name: 'Organisationsteori', semester: 'Forår 2026' },
  { id: 'course-programmering', name: 'Programmering', semester: 'Forår 2026' },
];

const SEEDED_EXAMS: Exam[] = [
  {
    id: 'exam-programmering-2026-05-11',
    courseId: 'course-programmering',
    date: '2026-05-11',
    notes: 'Mundtlig m. skriftligt forlæg (BINT01642D).',
  },
  {
    id: 'exam-it-projektledelse-2026-05-15',
    courseId: 'course-it-projektledelse',
    date: '2026-05-15',
    notes: 'Mundtlig m. skriftligt forlæg (BINT01059E).',
  },
  {
    id: 'exam-organisationsteori-2026-05-22',
    courseId: 'course-organisationsteori',
    date: '2026-05-22',
    notes: 'Mundtlig m. skriftligt forlæg (BINT01060E).',
  },
  {
    id: 'exam-regnskab-2026-05-26',
    courseId: 'course-regnskab',
    date: '2026-05-26',
    notes: 'Skriftlig stedprøve (BINT01057E).',
  },
];

const SEEDED_MEETINGS: Meeting[] = [];

function repairMojibake(value: string): string {
  if (!/[ÃÂ]/.test(value)) return value;
  try {
    const bytes = Uint8Array.from(value, (char) => char.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return value;
  }
}

const generateId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

interface AppContextType {
  courses: Course[];
  tasks: Task[];
  documents: Document[];
  exams: Exam[];
  meetings: Meeting[];
  notes: StudyNote[];
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
  addMeeting: (meeting: Omit<Meeting, 'id'>) => void;
  updateMeeting: (id: string, updates: Partial<Omit<Meeting, 'id'>>) => void;
  deleteMeeting: (id: string) => void;
  addNote: (note: Omit<StudyNote, 'id'>) => void;
  updateNote: (id: string, updates: Partial<Omit<StudyNote, 'id'>>) => void;
  deleteNote: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function readStoredArrayLength(key: string): number {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [courses, setCourses] = useLocalStorage<Course[]>('sg_courses', DEFAULT_COURSES);
  const [tasks, setTasks] = useLocalStorage<Task[]>('sg_tasks', DEFAULT_TASKS);
  const [documents, setDocuments] = useLocalStorage<Document[]>('sg_documents', DEFAULT_DOCUMENTS);
  const [exams, setExams] = useLocalStorage<Exam[]>('sg_exams', DEFAULT_EXAMS);
  const [meetings, setMeetings] = useLocalStorage<Meeting[]>('sg_meetings', DEFAULT_MEETINGS);
  const [notes, setNotes] = useLocalStorage<StudyNote[]>('sg_notes', DEFAULT_NOTES);

  useEffect(() => {
    const hasSeeded = window.localStorage.getItem(SEED_MARKER_KEY);
    if (hasSeeded) return;

    const hasPersistedData =
      readStoredArrayLength('sg_courses') > 0 ||
      readStoredArrayLength('sg_tasks') > 0 ||
      readStoredArrayLength('sg_documents') > 0 ||
      readStoredArrayLength('sg_exams') > 0 ||
      readStoredArrayLength('sg_meetings') > 0 ||
      readStoredArrayLength('sg_notes') > 0;

    if (hasPersistedData) {
      window.localStorage.setItem(SEED_MARKER_KEY, 'skipped-existing-data');
      return;
    }

    setCourses(SEEDED_COURSES);
    setExams(SEEDED_EXAMS);
    setMeetings(SEEDED_MEETINGS);
    window.localStorage.setItem(SEED_MARKER_KEY, 'seeded');
  }, [setCourses, setExams, setMeetings]);

  useEffect(() => {
    const repairedCourses = courses.map((course) => ({
      ...course,
      name: repairMojibake(course.name),
      semester: repairMojibake(course.semester),
    }));

    const courseChanged = repairedCourses.some(
      (course, index) =>
        course.name !== courses[index]?.name || course.semester !== courses[index]?.semester
    );

    if (courseChanged) {
      setCourses(repairedCourses);
    }
  }, [courses, setCourses]);

  useEffect(() => {
    const repairedExams = exams.map((exam) => ({
      ...exam,
      notes: repairMojibake(exam.notes),
    }));

    const examChanged = repairedExams.some((exam, index) => exam.notes !== exams[index]?.notes);

    if (examChanged) {
      setExams(repairedExams);
    }
  }, [exams, setExams]);

  useEffect(() => {
    if (meetings.length === 0) return;

    const repairedMeetings = meetings.map((meeting) => ({
      ...meeting,
      title: repairMojibake(meeting.title),
      location: repairMojibake(meeting.location),
      agenda: meeting.agenda.map(repairMojibake),
      decisions: meeting.decisions.map(repairMojibake),
    }));

    const hasChanges = repairedMeetings.some((meeting, index) => {
      const original = meetings[index];
      return (
        meeting.title !== original.title ||
        meeting.location !== original.location ||
        meeting.agenda.some((item, itemIndex) => item !== original.agenda[itemIndex]) ||
        meeting.decisions.some((item, itemIndex) => item !== original.decisions[itemIndex])
      );
    });

    if (hasChanges) {
      setMeetings(repairedMeetings);
    }
  }, [meetings, setMeetings]);

  const getCourseById = useCallback((id: string) => courses.find((c) => c.id === id), [courses]);

  const addCourse = useCallback(
    (course: Omit<Course, 'id'>) => setCourses((prev) => [...prev, { ...course, id: generateId() }]),
    [setCourses]
  );

  const deleteCourse = useCallback(
    (id: string) => setCourses((prev) => prev.filter((c) => c.id !== id)),
    [setCourses]
  );

  const addTask = useCallback(
    (task: Omit<Task, 'id'>) => setTasks((prev) => [...prev, { ...task, id: generateId() }]),
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
    (exam: Omit<Exam, 'id'>) => setExams((prev) => [...prev, { ...exam, id: generateId() }]),
    [setExams]
  );

  const deleteExam = useCallback(
    (id: string) => setExams((prev) => prev.filter((e) => e.id !== id)),
    [setExams]
  );

  const addMeeting = useCallback(
    (meeting: Omit<Meeting, 'id'>) =>
      setMeetings((prev) => [...prev, { ...meeting, id: generateId() }]),
    [setMeetings]
  );

  const updateMeeting = useCallback(
    (id: string, updates: Partial<Omit<Meeting, 'id'>>) =>
      setMeetings((prev) =>
        prev.map((meeting) => (meeting.id === id ? { ...meeting, ...updates } : meeting))
      ),
    [setMeetings]
  );

  const deleteMeeting = useCallback(
    (id: string) => setMeetings((prev) => prev.filter((m) => m.id !== id)),
    [setMeetings]
  );

  const addNote = useCallback(
    (note: Omit<StudyNote, 'id'>) => setNotes((prev) => [...prev, { ...note, id: generateId() }]),
    [setNotes]
  );

  const updateNote = useCallback(
    (id: string, updates: Partial<Omit<StudyNote, 'id'>>) =>
      setNotes((prev) => prev.map((note) => (note.id === id ? { ...note, ...updates } : note))),
    [setNotes]
  );

  const deleteNote = useCallback(
    (id: string) => setNotes((prev) => prev.filter((note) => note.id !== id)),
    [setNotes]
  );

  return (
    <AppContext.Provider
      value={{
        courses,
        tasks,
        documents,
        exams,
        meetings,
        notes,
        getCourseById,
        addCourse,
        deleteCourse,
        addTask,
        updateTask,
        deleteTask,
        addDocument,
        deleteDocument,
        addExam,
        deleteExam,
        addMeeting,
        updateMeeting,
        deleteMeeting,
        addNote,
        updateNote,
        deleteNote,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
