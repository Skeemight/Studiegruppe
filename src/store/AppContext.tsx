'use client';

import React, { createContext, useCallback, useContext, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { Course, Task, Document, Exam, Meeting, StudyNote, WeekFocus, ScheduleEvent, CanvasModule } from '@/types';
import { COURSE_COLORS } from '@/lib/courseColors';

const SEED_MARKER_KEY = 'sg_seed_hait_v1';

const DEFAULT_COURSES: Course[] = [];
const DEFAULT_TASKS: Task[] = [];
const DEFAULT_DOCUMENTS: Document[] = [];
const DEFAULT_EXAMS: Exam[] = [];
const DEFAULT_MEETINGS: Meeting[] = [];
const DEFAULT_NOTES: StudyNote[] = [];

const SEEDED_COURSES: Course[] = [
  { id: 'course-regnskab', name: 'Regnskab (virksomheds økonomi)', code: 'BINT01057E', semester: 'Forår 2026', color: 'blue' },
  { id: 'course-it-projektledelse', name: 'IT-Projektledelse', code: 'BINT01059E', semester: 'Forår 2026', color: 'violet' },
  { id: 'course-organisationsteori', name: 'Organisationsteori', code: 'BINT01060E', semester: 'Forår 2026', color: 'emerald' },
  { id: 'course-programmering', name: 'Programmering', code: 'BINT01642D', semester: 'Forår 2026', color: 'amber' },
];

const SEEDED_EXAMS: Exam[] = [
  {
    id: 'exam-programmering-2026-05-11',
    courseId: 'course-programmering',
    courseName: 'Programmering',
    title: 'Mundtlig eksamen med skriftligt forlæg',
    date: '2026-05-11',
    notes: '',
  },
  {
    id: 'exam-it-projektledelse-2026-05-15',
    courseId: 'course-it-projektledelse',
    courseName: 'IT-Projektledelse',
    title: 'Mundtlig eksamen med skriftligt forlæg',
    date: '2026-05-15',
    notes: '',
  },
  {
    id: 'exam-organisationsteori-2026-05-22',
    courseId: 'course-organisationsteori',
    courseName: 'Organisationsteori',
    title: 'Mundtlig eksamen med skriftligt forlæg',
    date: '2026-05-22',
    notes: '',
  },
  {
    id: 'exam-regnskab-2026-05-26',
    courseId: 'course-regnskab',
    courseName: 'Regnskab (virksomheds økonomi)',
    title: 'Skriftlig stedprøve',
    date: '2026-05-26',
    notes: '',
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
  weekFocus: WeekFocus[];
  getCourseById: (id: string) => Course | undefined;
  addCourse: (course: Omit<Course, 'id'>) => void;
  updateCourse: (id: string, updates: Partial<Omit<Course, 'id'>>) => void;
  deleteCourse: (id: string) => void;
  addTask: (task: Omit<Task, 'id'>) => void;
  updateTask: (id: string, updates: Partial<Omit<Task, 'id'>>) => void;
  deleteTask: (id: string) => void;
  addDocument: (doc: Omit<Document, 'id'>) => void;
  deleteDocument: (id: string) => void;
  addExam: (exam: Omit<Exam, 'id'>) => void;
  updateExam: (id: string, updates: Partial<Omit<Exam, 'id'>>) => void;
  deleteExam: (id: string) => void;
  addMeeting: (meeting: Omit<Meeting, 'id'>) => void;
  updateMeeting: (id: string, updates: Partial<Omit<Meeting, 'id'>>) => void;
  deleteMeeting: (id: string) => void;
  addNote: (note: Omit<StudyNote, 'id'>) => void;
  updateNote: (id: string, updates: Partial<Omit<StudyNote, 'id'>>) => void;
  deleteNote: (id: string) => void;
  addWeekFocus: (item: Omit<WeekFocus, 'id'>) => void;
  updateWeekFocus: (id: string, updates: Partial<Omit<WeekFocus, 'id'>>) => void;
  deleteWeekFocus: (id: string) => void;
  scheduleEvents: ScheduleEvent[];
  setScheduleEvents: (events: ScheduleEvent[]) => void;
  canvasModules: CanvasModule[];
  upsertModules: (modules: CanvasModule[]) => void;
  exportData: () => void;
  importData: (json: string) => { success: boolean; error?: string };
  upsertCourses: (courses: Course[]) => void;
  upsertTasks: (tasks: Task[]) => void;
  upsertDocuments: (docs: Document[]) => void;
  pruneCanvasData: (keepCourseIds: string[]) => void;
  mergeCourses: (keepId: string, removeId: string, newName: string) => void;
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
  const [weekFocus, setWeekFocus] = useLocalStorage<WeekFocus[]>('sg_weekfocus', []);
  const [scheduleEvents, setScheduleEvents] = useLocalStorage<ScheduleEvent[]>('sg_schedule', []);
  const [canvasModules, setCanvasModules] = useLocalStorage<CanvasModule[]>('sg_canvas_modules', []);

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
    const repairedExams = exams.map((exam) => {
      const repairedNotes = repairMojibake(exam.notes);
      // Backfill courseName from courses if not yet stored
      const courseName = exam.courseName ?? courses.find((c) => c.id === exam.courseId)?.name;
      return { ...exam, notes: repairedNotes, ...(courseName ? { courseName } : {}) };
    });

    const examChanged = repairedExams.some(
      (exam, index) =>
        exam.notes !== exams[index]?.notes || exam.courseName !== exams[index]?.courseName
    );

    if (examChanged) {
      setExams(repairedExams);
    }
  }, [exams, courses, setExams]);

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

  const updateCourse = useCallback(
    (id: string, updates: Partial<Omit<Course, 'id'>>) =>
      setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c))),
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

  const updateExam = useCallback(
    (id: string, updates: Partial<Omit<Exam, 'id'>>) =>
      setExams((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e))),
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

  const addWeekFocus = useCallback(
    (item: Omit<WeekFocus, 'id'>) =>
      setWeekFocus((prev) => [...prev, { ...item, id: generateId() }]),
    [setWeekFocus]
  );

  const updateWeekFocus = useCallback(
    (id: string, updates: Partial<Omit<WeekFocus, 'id'>>) =>
      setWeekFocus((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f))),
    [setWeekFocus]
  );

  const deleteWeekFocus = useCallback(
    (id: string) => setWeekFocus((prev) => prev.filter((f) => f.id !== id)),
    [setWeekFocus]
  );

  // Upsert: add if new ID, update title/name if already exists (Canvas sync)
  const upsertCourses = useCallback(
    (incoming: Course[]) =>
      setCourses((prev) => {
        const map = new Map(prev.map((c) => [c.id, c]));
        const usedColors = new Set(prev.map((c) => c.color).filter(Boolean));
        let colorIndex = 0;
        incoming.forEach((c) => {
          const existing = map.get(c.id);
          // Preserve existing color, or assign next available palette color
          if (!existing?.color && !c.color) {
            const available = COURSE_COLORS.filter((col) => !usedColors.has(col));
            const assignedColor = available[colorIndex % Math.max(available.length, 1)] ?? COURSE_COLORS[colorIndex % COURSE_COLORS.length];
            usedColors.add(assignedColor);
            colorIndex++;
            map.set(c.id, { ...existing, ...c, color: assignedColor });
          } else {
            map.set(c.id, { ...existing, ...c, color: existing?.color ?? c.color });
          }
        });
        return Array.from(map.values());
      }),
    [setCourses]
  );

  const upsertTasks = useCallback(
    (incoming: Task[]) =>
      setTasks((prev) => {
        const map = new Map(prev.map((t) => [t.id, t]));
        incoming.forEach((t) => {
          // Preserve user-set status and assignedTo if task already exists
          const existing = map.get(t.id);
          map.set(t.id, existing ? { ...t, status: existing.status, assignedTo: existing.assignedTo } : t);
        });
        return Array.from(map.values());
      }),
    [setTasks]
  );

  const upsertDocuments = useCallback(
    (incoming: Document[]) =>
      setDocuments((prev) => {
        const map = new Map(prev.map((d) => [d.id, d]));
        incoming.forEach((d) => map.set(d.id, { ...map.get(d.id), ...d }));
        return Array.from(map.values());
      }),
    [setDocuments]
  );

  const upsertModules = useCallback(
    (incoming: CanvasModule[]) => {
      const courseIds = new Set(incoming.map((m) => m.courseId));
      setCanvasModules((prev) => [
        ...prev.filter((m) => !courseIds.has(m.courseId)),
        ...incoming,
      ]);
    },
    [setCanvasModules]
  );

  const mergeCourses = useCallback(
    (keepId: string, removeId: string, newName: string) => {
      // Reassign all data from removeId to keepId
      setTasks((prev) => prev.map((t) => t.courseId === removeId ? { ...t, courseId: keepId } : t));
      setDocuments((prev) => prev.map((d) => d.courseId === removeId ? { ...d, courseId: keepId } : d));
      setExams((prev) => prev.map((e) => {
        if (e.courseId === removeId) return { ...e, courseId: keepId, courseName: newName };
        if (e.courseId === keepId) return { ...e, courseName: newName };
        return e;
      }));
      setNotes((prev) => prev.map((n) => n.courseId === removeId ? { ...n, courseId: keepId } : n));
      // Rename kept course and delete the merged one
      setCourses((prev) =>
        prev
          .filter((c) => c.id !== removeId)
          .map((c) => c.id === keepId ? { ...c, name: newName } : c)
      );
    },
    [setCourses, setTasks, setDocuments, setExams, setNotes]
  );

  // Remove canvas-sourced courses not in keepCourseIds, and their tasks/documents
  const pruneCanvasData = useCallback(
    (keepCourseIds: string[]) => {
      const keepSet = new Set(keepCourseIds);
      setCourses((prev) => prev.filter((c) => !c.id.startsWith('canvas-') || keepSet.has(c.id)));
      setTasks((prev) => prev.filter((t) => !t.courseId.startsWith('canvas-') || keepSet.has(t.courseId)));
      setDocuments((prev) => prev.filter((d) => !d.courseId.startsWith('canvas-') || keepSet.has(d.courseId)));
      setCanvasModules((prev) => prev.filter((m) => !m.courseId.startsWith('canvas-') || keepSet.has(m.courseId)));
    },
    [setCourses, setTasks, setDocuments, setCanvasModules]
  );

  const exportData = useCallback(() => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      courses,
      tasks,
      documents,
      exams,
      meetings,
      notes,
      weekFocus,
      scheduleEvents,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studiegruppe-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [courses, tasks, documents, exams, meetings, notes, weekFocus]);

  const importData = useCallback(
    (json: string): { success: boolean; error?: string } => {
      try {
        const data = JSON.parse(json) as Record<string, unknown>;
        if (data.version !== 1 || !Array.isArray(data.courses)) {
          return { success: false, error: 'Ugyldigt filformat' };
        }
        setCourses((data.courses as Course[]) ?? []);
        setTasks((data.tasks as Task[]) ?? []);
        setDocuments((data.documents as Document[]) ?? []);
        setExams((data.exams as Exam[]) ?? []);
        setMeetings((data.meetings as Meeting[]) ?? []);
        setNotes((data.notes as StudyNote[]) ?? []);
        setWeekFocus((data.weekFocus as WeekFocus[]) ?? []);
        if (Array.isArray(data.scheduleEvents)) setScheduleEvents(data.scheduleEvents as ScheduleEvent[]);
        window.localStorage.setItem(SEED_MARKER_KEY, 'imported');
        return { success: true };
      } catch {
        return { success: false, error: 'Kunne ikke læse filen' };
      }
    },
    [setCourses, setTasks, setDocuments, setExams, setMeetings, setNotes]
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
        weekFocus,
        getCourseById,
        addCourse,
        updateCourse,
        deleteCourse,
        addTask,
        updateTask,
        deleteTask,
        addDocument,
        deleteDocument,
        addExam,
        updateExam,
        deleteExam,
        addMeeting,
        updateMeeting,
        deleteMeeting,
        addNote,
        updateNote,
        deleteNote,
        addWeekFocus,
        updateWeekFocus,
        deleteWeekFocus,
        scheduleEvents,
        setScheduleEvents,
        canvasModules,
        upsertModules,
        exportData,
        importData,
        upsertCourses,
        upsertTasks,
        upsertDocuments,
        pruneCanvasData,
        mergeCourses,
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
