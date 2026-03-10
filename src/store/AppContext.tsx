'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { getSupabase, supabaseConfigured } from '@/lib/supabase';
import type {
  Course, Task, Document, Exam, Meeting, StudyNote, WeekFocus, ScheduleEvent,
  CanvasModule, GroupConfig, User, Group, LessonNote, StudyPage,
  GroupAssignment, GroupTask, AssignmentFile, AssignmentComment, AssignmentMeetingNote,
  GroupMeeting, GroupChecklistItem, GroupActivityItem, MemberAvailability,
} from '@/types';
import { COURSE_COLORS } from '@/lib/courseColors';

const generateId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ── Row → TypeScript converters ────────────────────────────────────────────

function rowToCourse(r: any): Course {
  return { id: r.id, name: r.name, semester: r.semester ?? '', color: r.color, code: r.code };
}
function rowToTask(r: any): Task {
  return { id: r.id, title: r.title, courseId: r.course_id ?? '', deadline: r.deadline ?? '', status: r.status, assignedTo: r.assigned_to ?? '', url: r.url };
}
function rowToDocument(r: any): Document {
  return { id: r.id, title: r.title, courseId: r.course_id ?? '', url: r.url, tags: r.tags ?? [], createdAt: r.created_at };
}
function rowToExam(r: any): Exam {
  return { id: r.id, courseId: r.course_id ?? '', courseName: r.course_name, title: r.title, date: r.date, notes: r.notes ?? '', topics: r.topics ?? [] };
}
function rowToMeeting(r: any): Meeting {
  return { id: r.id, title: r.title, date: r.date, location: r.location ?? '', agenda: r.agenda ?? [], decisions: r.decisions ?? [] };
}
function rowToStudyNote(r: any): StudyNote {
  return { id: r.id, title: r.title, courseId: r.course_id ?? '', week: r.week ?? '', format: r.format ?? 'link', url: r.url ?? '', sourceType: r.source_type ?? 'link', fileName: r.file_name, mimeType: r.mime_type, tags: r.tags ?? [], examRelevant: r.exam_relevant ?? false };
}
function rowToWeekFocus(r: any): WeekFocus {
  return { id: r.id, week: r.week, courseId: r.course_id ?? '', text: r.text, done: r.done ?? false };
}
function rowToScheduleEvent(r: any): ScheduleEvent {
  return { id: r.id, title: r.title, start: r.start_time, end: r.end_time, location: r.location };
}
function rowToCanvasModule(r: any): CanvasModule {
  return { id: r.id, courseId: r.course_id ?? '', name: r.name, position: r.position ?? 0, week: r.week, items: r.items ?? [] };
}
function rowToLessonNote(r: any): LessonNote {
  return { id: r.id, courseId: r.course_id ?? '', moduleId: r.module_id, lessonTitle: r.lesson_title ?? '', content: r.content, authorId: r.author_id ?? '', authorName: r.author_name ?? '', createdAt: r.created_at, updatedAt: r.updated_at };
}
function rowToGroupAssignment(r: any): GroupAssignment {
  return { id: r.id, title: r.title, courseId: r.course_id ?? '', courseName: r.course_name ?? '', deadline: r.deadline, description: r.description, tasks: r.tasks ?? [], files: r.files ?? [], comments: r.comments ?? [], meetingNotes: r.meeting_notes ?? [], status: r.status ?? 'active', createdAt: r.created_at, createdById: r.created_by ?? '' };
}
function rowToGroupMeeting(r: any): GroupMeeting {
  return { id: r.id, title: r.title, date: r.date ?? '', startTime: r.start_time ?? '', endTime: r.end_time ?? '', location: r.location ?? '', assignmentId: r.assignment_id, description: r.description, notes: r.notes ?? '', timePoll: r.time_poll, status: r.status ?? 'planned', createdAt: r.created_at, createdById: r.created_by ?? '' };
}
function rowToChecklistItem(r: any): GroupChecklistItem {
  return { id: r.id, text: r.text, done: r.done ?? false, addedById: r.added_by_id ?? '', addedByName: r.added_by_name ?? '', addedAt: r.added_at };
}
function rowToActivityItem(r: any): GroupActivityItem {
  return { id: r.id, type: r.type, message: r.message, userId: r.user_id ?? '', userName: r.user_name ?? '', timestamp: r.timestamp, assignmentId: r.assignment_id, meetingId: r.meeting_id };
}
function rowToMemberAvailability(r: any): MemberAvailability {
  return { userId: r.user_id, text: r.text, updatedAt: r.updated_at };
}
function rowToStudyPage(r: any): StudyPage {
  return { id: r.id, courseId: r.course_id ?? '', moduleId: r.module_id ?? '', moduleName: r.module_name ?? '', weekNumber: r.week_number, title: r.title, htmlContent: r.html_content, createdById: r.created_by ?? '', createdByName: r.created_by_name ?? '', createdAt: r.created_at, updatedAt: r.updated_at };
}

// ── Context type ───────────────────────────────────────────────────────────

interface AppContextType {
  // Auth
  currentUser: User | null;
  currentGroup: Group | null;
  groupConfig: GroupConfig | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string; userId?: string }>;
  createGroup: (userId: string, name: string, program: string, school: string) => Promise<string>;
  joinGroup: (userId: string, inviteCode: string) => Promise<{ success: boolean; error?: string }>;
  findGroupByCode: (code: string) => Promise<Group | null>;
  // Data
  courses: Course[];
  tasks: Task[];
  documents: Document[];
  exams: Exam[];
  meetings: Meeting[];
  notes: StudyNote[];
  weekFocus: WeekFocus[];
  scheduleEvents: ScheduleEvent[];
  canvasModules: CanvasModule[];
  lessonNotes: LessonNote[];
  courseMapping: Record<string, string>;
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
  setScheduleEvents: (events: ScheduleEvent[]) => void;
  upsertModules: (modules: CanvasModule[]) => void;
  upsertCourses: (courses: Course[]) => void;
  upsertTasks: (tasks: Task[]) => void;
  upsertDocuments: (docs: Document[]) => void;
  pruneCanvasData: (keepCourseIds: string[]) => void;
  mergeCourses: (keepId: string, removeId: string, newName: string) => void;
  addLessonNote: (note: Omit<LessonNote, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateLessonNote: (id: string, content: string) => void;
  deleteLessonNote: (id: string) => void;
  updateCourseMapping: (key: string, courseId: string) => void;
  exportData: () => void;
  importData: (json: string) => { success: boolean; error?: string };
  // Group system
  groupAssignments: GroupAssignment[];
  groupMeetings: GroupMeeting[];
  groupChecklist: GroupChecklistItem[];
  groupActivity: GroupActivityItem[];
  memberAvailability: MemberAvailability[];
  addGroupAssignment: (a: Omit<GroupAssignment, 'id' | 'createdAt' | 'tasks' | 'files' | 'comments' | 'meetingNotes' | 'status'>) => string;
  updateGroupAssignment: (id: string, updates: Partial<Pick<GroupAssignment, 'title' | 'courseId' | 'courseName' | 'deadline' | 'description' | 'status'>>) => void;
  deleteGroupAssignment: (id: string) => void;
  addGroupTask: (assignmentId: string, task: Omit<GroupTask, 'id' | 'createdAt'>) => void;
  updateGroupTask: (assignmentId: string, taskId: string, updates: Partial<Omit<GroupTask, 'id' | 'createdAt'>>) => void;
  deleteGroupTask: (assignmentId: string, taskId: string) => void;
  addAssignmentFile: (assignmentId: string, file: Omit<AssignmentFile, 'id' | 'addedAt'>) => void;
  deleteAssignmentFile: (assignmentId: string, fileId: string) => void;
  addAssignmentComment: (assignmentId: string, comment: Omit<AssignmentComment, 'id' | 'createdAt'>) => void;
  deleteAssignmentComment: (assignmentId: string, commentId: string) => void;
  addAssignmentMeetingNote: (assignmentId: string, note: Omit<AssignmentMeetingNote, 'id' | 'createdAt'>) => void;
  deleteAssignmentMeetingNote: (assignmentId: string, noteId: string) => void;
  addGroupMeeting: (meeting: Omit<GroupMeeting, 'id' | 'createdAt' | 'notes' | 'status'>) => string;
  updateGroupMeeting: (id: string, updates: Partial<Omit<GroupMeeting, 'id' | 'createdAt'>>) => void;
  deleteGroupMeeting: (id: string) => void;
  voteTimePoll: (meetingId: string, slotId: string, userId: string) => void;
  confirmTimePoll: (meetingId: string, slotId: string) => void;
  addGroupChecklistItem: (item: Omit<GroupChecklistItem, 'id' | 'addedAt'>) => void;
  toggleGroupChecklistItem: (id: string) => void;
  deleteGroupChecklistItem: (id: string) => void;
  setMemberAvailability: (userId: string, text: string) => void;
  getGroupMembers: () => User[];
  // Study pages
  studyPages: StudyPage[];
  addStudyPage: (page: Omit<StudyPage, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateStudyPage: (id: string, updates: Partial<Pick<StudyPage, 'title' | 'htmlContent'>>) => void;
  deleteStudyPage: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ── Provider ───────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  if (!supabaseConfigured) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif', padding: '2rem', textAlign: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>Supabase ikke konfigureret</h1>
          <p style={{ color: '#6b7280', marginBottom: '0.5rem' }}>Opret filen <code style={{ background: '#f3f4f6', padding: '0.1rem 0.4rem', borderRadius: 4 }}>.env.local</code> i projektets rodmappe med:</p>
          <pre style={{ background: '#f3f4f6', padding: '1rem', borderRadius: 8, textAlign: 'left', display: 'inline-block' }}>
{`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...`}
          </pre>
          <p style={{ color: '#6b7280', marginTop: '0.75rem', fontSize: '0.875rem' }}>Find værdierne under <strong>Project Settings → API</strong> i Supabase-dashboardet.</p>
        </div>
      </div>
    );
  }
  return <AppProviderInner>{children}</AppProviderInner>;
}

function AppProviderInner({ children }: { children: React.ReactNode }) {
  const supabase = getSupabase();

  // Auth state
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // App data
  const [courses, setCourses] = useState<Course[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [weekFocus, setWeekFocus] = useState<WeekFocus[]>([]);
  const [scheduleEvents, setScheduleEventsState] = useState<ScheduleEvent[]>([]);
  const [canvasModules, setCanvasModules] = useState<CanvasModule[]>([]);
  const [lessonNotes, setLessonNotes] = useState<LessonNote[]>([]);
  const [courseMapping, setCourseMappingState] = useState<Record<string, string>>({});
  const [groupAssignments, setGroupAssignments] = useState<GroupAssignment[]>([]);
  const [groupMeetings, setGroupMeetings] = useState<GroupMeeting[]>([]);
  const [groupChecklist, setGroupChecklist] = useState<GroupChecklistItem[]>([]);
  const [groupActivity, setGroupActivity] = useState<GroupActivityItem[]>([]);
  const [memberAvailability, setMemberAvailabilityState] = useState<MemberAvailability[]>([]);
  const [studyPages, setStudyPages] = useState<StudyPage[]>([]);

  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const courseMergeMapRef = useRef<Map<string, string>>(new Map()); // canvas-id → merged-id

  // ── Data loading ──────────────────────────────────────────────────────────

  const clearAllData = useCallback(() => {
    setCurrentUser(null); setCurrentGroup(null); setGroupMembers([]);
    setCourses([]); setTasks([]); setDocuments([]); setExams([]); setMeetings([]);
    setNotes([]); setWeekFocus([]); setScheduleEventsState([]); setCanvasModules([]);
    setLessonNotes([]); setCourseMappingState({});
    setGroupAssignments([]); setGroupMeetings([]); setGroupChecklist([]);
    setGroupActivity([]); setMemberAvailabilityState([]); setStudyPages([]);
  }, []);

  const loadGroupData = useCallback(async (groupId: string) => {
    const [
      { data: coursesData },
      { data: tasksData },
      { data: docsData },
      { data: examsData },
      { data: meetingsData },
      { data: notesData },
      { data: focusData },
      { data: schedData },
      { data: modulesData },
      { data: lessonNotesData },
      { data: assignmentsData },
      { data: grpMeetingsData },
      { data: checklistData },
      { data: activityData },
      { data: availData },
      { data: studyPagesData },
    ] = await Promise.all([
      supabase.from('courses').select('*').eq('group_id', groupId),
      supabase.from('tasks').select('*').eq('group_id', groupId),
      supabase.from('documents').select('*').eq('group_id', groupId),
      supabase.from('exams').select('*').eq('group_id', groupId),
      supabase.from('meetings').select('*').eq('group_id', groupId),
      supabase.from('study_notes').select('*').eq('group_id', groupId),
      supabase.from('week_focus').select('*').eq('group_id', groupId),
      supabase.from('schedule_events').select('*').eq('group_id', groupId),
      supabase.from('canvas_modules').select('*').eq('group_id', groupId),
      supabase.from('lesson_notes').select('*').eq('group_id', groupId),
      supabase.from('group_assignments').select('*').eq('group_id', groupId),
      supabase.from('group_meetings').select('*').eq('group_id', groupId),
      supabase.from('group_checklist').select('*').eq('group_id', groupId),
      supabase.from('group_activity').select('*').eq('group_id', groupId).order('timestamp', { ascending: false }).limit(200),
      supabase.from('member_availability').select('*').eq('group_id', groupId),
      supabase.from('study_pages').select('*').eq('group_id', groupId),
    ]);

    setCourses(coursesData?.map(rowToCourse) ?? []);
    setTasks(tasksData?.map(rowToTask) ?? []);
    setDocuments(docsData?.map(rowToDocument) ?? []);
    setExams(examsData?.map(rowToExam) ?? []);
    setMeetings(meetingsData?.map(rowToMeeting) ?? []);
    setNotes(notesData?.map(rowToStudyNote) ?? []);
    setWeekFocus(focusData?.map(rowToWeekFocus) ?? []);
    setScheduleEventsState(schedData?.map(rowToScheduleEvent) ?? []);
    setCanvasModules(modulesData?.map(rowToCanvasModule) ?? []);
    setLessonNotes(lessonNotesData?.map(rowToLessonNote) ?? []);
    setGroupAssignments(assignmentsData?.map(rowToGroupAssignment) ?? []);
    setGroupMeetings(grpMeetingsData?.map(rowToGroupMeeting) ?? []);
    setGroupChecklist(checklistData?.map(rowToChecklistItem) ?? []);
    setGroupActivity(activityData?.map(rowToActivityItem) ?? []);
    setMemberAvailabilityState(availData?.map(rowToMemberAvailability) ?? []);
    setStudyPages(studyPagesData?.map(rowToStudyPage) ?? []);
  }, [supabase]);

  const loadUserAndGroup = useCallback(async (sbUser: SupabaseUser) => {
    try {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', sbUser.id).single();
      if (!profile) { setLoading(false); return; }

      const user: User = { id: sbUser.id, name: profile.display_name, email: sbUser.email ?? '', groupId: profile.group_id ?? '' };
      setCurrentUser(user);

      if (!profile.group_id) { setLoading(false); return; }

      const { data: groupData } = await supabase.from('groups').select('*').eq('id', profile.group_id).single();
      if (!groupData) { setLoading(false); return; }

      const { data: memberProfiles } = await supabase.from('profiles').select('*').eq('group_id', profile.group_id);

      const group: Group = {
        id: groupData.id,
        name: groupData.name,
        program: groupData.education ?? '',
        school: groupData.institution ?? '',
        inviteCode: groupData.invite_code,
        memberIds: (memberProfiles ?? []).map((p: { id: string }) => p.id),
      };
      setCurrentGroup(group);
      setCourseMappingState(groupData.course_mapping ?? {});

      const members: User[] = (memberProfiles ?? []).map((p: { id: string; display_name: string; group_id: string }) => ({
        id: p.id, name: p.display_name, email: '', groupId: p.group_id ?? '',
      }));
      setGroupMembers(members);

      await loadGroupData(profile.group_id);
      setLoading(false);

      setupRealtime(profile.group_id);
    } catch (err) {
      console.error('[Auth] loadUserAndGroup failed:', err);
      setLoading(false);
    }
  }, [supabase, loadGroupData]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Realtime subscriptions ────────────────────────────────────────────────

  const setupRealtime = useCallback((groupId: string) => {
    realtimeChannelRef.current?.unsubscribe();

    const channel = supabase
      .channel(`group_${groupId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_assignments', filter: `group_id=eq.${groupId}` }, (payload) => {
        if (payload.eventType === 'INSERT') setGroupAssignments(prev => [...prev, rowToGroupAssignment(payload.new)]);
        else if (payload.eventType === 'UPDATE') setGroupAssignments(prev => prev.map(a => a.id === payload.new.id ? rowToGroupAssignment(payload.new) : a));
        else if (payload.eventType === 'DELETE') setGroupAssignments(prev => prev.filter(a => a.id !== payload.old.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_meetings', filter: `group_id=eq.${groupId}` }, (payload) => {
        if (payload.eventType === 'INSERT') setGroupMeetings(prev => [...prev, rowToGroupMeeting(payload.new)]);
        else if (payload.eventType === 'UPDATE') setGroupMeetings(prev => prev.map(m => m.id === payload.new.id ? rowToGroupMeeting(payload.new) : m));
        else if (payload.eventType === 'DELETE') setGroupMeetings(prev => prev.filter(m => m.id !== payload.old.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_checklist', filter: `group_id=eq.${groupId}` }, (payload) => {
        if (payload.eventType === 'INSERT') setGroupChecklist(prev => [...prev, rowToChecklistItem(payload.new)]);
        else if (payload.eventType === 'UPDATE') setGroupChecklist(prev => prev.map(i => i.id === payload.new.id ? rowToChecklistItem(payload.new) : i));
        else if (payload.eventType === 'DELETE') setGroupChecklist(prev => prev.filter(i => i.id !== payload.old.id));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_activity', filter: `group_id=eq.${groupId}` }, (payload) => {
        setGroupActivity(prev => [rowToActivityItem(payload.new), ...prev].slice(0, 200));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lesson_notes', filter: `group_id=eq.${groupId}` }, (payload) => {
        if (payload.eventType === 'INSERT') setLessonNotes(prev => [...prev, rowToLessonNote(payload.new)]);
        else if (payload.eventType === 'UPDATE') setLessonNotes(prev => prev.map(n => n.id === payload.new.id ? rowToLessonNote(payload.new) : n));
        else if (payload.eventType === 'DELETE') setLessonNotes(prev => prev.filter(n => n.id !== payload.old.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'member_availability', filter: `group_id=eq.${groupId}` }, (payload) => {
        if (payload.eventType === 'DELETE') setMemberAvailabilityState(prev => prev.filter(a => a.userId !== payload.old.user_id));
        else setMemberAvailabilityState(prev => { const filtered = prev.filter(a => a.userId !== payload.new.user_id); return [...filtered, rowToMemberAvailability(payload.new)]; });
      })
      .subscribe();

    realtimeChannelRef.current = channel;
  }, [supabase]);

  // ── Auth listener ─────────────────────────────────────────────────────────

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setSupabaseUser(session.user);
        await loadUserAndGroup(session.user);
      } else {
        setSupabaseUser(null);
        clearAllData();
        setLoading(false);
        realtimeChannelRef.current?.unsubscribe();
      }
    });

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setLoading(false);
    });

    // Safety timeout — never stay in loading state forever
    const timeout = setTimeout(() => setLoading(false), 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [supabase, loadUserAndGroup, clearAllData]);

  // ── Derived values ────────────────────────────────────────────────────────

  const groupConfig: GroupConfig | null = currentGroup ? {
    name: currentGroup.name,
    program: currentGroup.program,
    school: currentGroup.school,
    members: groupMembers.map(m => m.name),
  } : null;

  // ── Auth actions ──────────────────────────────────────────────────────────

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }, [supabase]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, [supabase]);

  const signup = useCallback(async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string; userId?: string }> => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { display_name: name } },
    });
    if (error) return { success: false, error: error.message };
    return { success: true, userId: data.user?.id };
  }, [supabase]);

  const createGroup = useCallback(async (userId: string, name: string, program: string, school: string): Promise<string> => {
    const inviteCode = generateInviteCode();
    const { data: groupData, error } = await supabase.from('groups').insert({
      name, institution: school, education: program, invite_code: inviteCode,
    }).select().single();
    if (error || !groupData) throw new Error(error?.message ?? 'Failed to create group');

    await supabase.from('profiles').update({ group_id: groupData.id }).eq('id', userId);

    const group: Group = { id: groupData.id, name, program, school, inviteCode, memberIds: [userId] };
    setCurrentGroup(group);
    setGroupMembers([currentUser!]);
    return inviteCode;
  }, [supabase, currentUser]);

  const joinGroup = useCallback(async (userId: string, inviteCode: string): Promise<{ success: boolean; error?: string }> => {
    const { data: groupData } = await supabase.from('groups').select('*').eq('invite_code', inviteCode.toUpperCase()).single();
    if (!groupData) return { success: false, error: 'Ugyldig invite-kode' };

    await supabase.from('profiles').update({ group_id: groupData.id }).eq('id', userId);

    const group: Group = { id: groupData.id, name: groupData.name, program: groupData.education ?? '', school: groupData.institution ?? '', inviteCode: groupData.invite_code, memberIds: [] };
    setCurrentGroup(group);
    setCourseMappingState(groupData.course_mapping ?? {});
    await loadGroupData(groupData.id);
    return { success: true };
  }, [supabase, loadGroupData]);

  const findGroupByCode = useCallback(async (code: string): Promise<Group | null> => {
    const { data } = await supabase.from('groups').select('*').eq('invite_code', code.toUpperCase()).single();
    if (!data) return null;
    return { id: data.id, name: data.name, program: data.education ?? '', school: data.institution ?? '', inviteCode: data.invite_code, memberIds: [] };
  }, [supabase]);

  // ── Helper: fire-and-forget Supabase write ────────────────────────────────

    function sb(table: string, op: 'insert' | 'update' | 'delete', data: any, matchId?: string) {
    const q = supabase.from(table);
    let promise;
    if (op === 'insert') promise = q.insert(data);
    else if (op === 'update') promise = (q.update(data) as ReturnType<typeof q.update>).eq('id', matchId!);
    else promise = (q.delete() as ReturnType<typeof q.delete>).eq('id', matchId!);
    promise.then(({ error }) => { if (error) console.error(`[Supabase] ${op} ${table}:`, error.message); });
  }

  const gid = currentGroup?.id;

  // ── Course actions ────────────────────────────────────────────────────────

  const getCourseById = useCallback((id: string) => courses.find(c => c.id === id), [courses]);

  const addCourse = useCallback((course: Omit<Course, 'id'>) => {
    const id = generateId();
    setCourses(prev => [...prev, { ...course, id }]);
    if (gid) sb('courses', 'insert', { id, group_id: gid, name: course.name, semester: course.semester, color: course.color, code: course.code });
  }, [gid]);

  const updateCourse = useCallback((id: string, updates: Partial<Omit<Course, 'id'>>) => {
    setCourses(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    if (gid) sb('courses', 'update', { name: updates.name, semester: updates.semester, color: updates.color, code: updates.code }, id);
  }, [gid]);

  const deleteCourse = useCallback((id: string) => {
    setCourses(prev => prev.filter(c => c.id !== id));
    sb('courses', 'delete', null, id);
  }, []);

  // ── Task actions ──────────────────────────────────────────────────────────

  const addTask = useCallback((task: Omit<Task, 'id'>) => {
    const id = generateId();
    setTasks(prev => [...prev, { ...task, id }]);
    if (gid) sb('tasks', 'insert', { id, group_id: gid, title: task.title, course_id: task.courseId || null, deadline: task.deadline, status: task.status, assigned_to: task.assignedTo, url: task.url });
  }, [gid]);

  const updateTask = useCallback((id: string, updates: Partial<Omit<Task, 'id'>>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    if (gid) sb('tasks', 'update', { title: updates.title, status: updates.status, assigned_to: updates.assignedTo, deadline: updates.deadline, url: updates.url }, id);
  }, [gid]);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    sb('tasks', 'delete', null, id);
  }, []);

  // ── Document actions ──────────────────────────────────────────────────────

  const addDocument = useCallback((doc: Omit<Document, 'id'>) => {
    const id = generateId();
    setDocuments(prev => [...prev, { ...doc, id }]);
    if (gid) sb('documents', 'insert', { id, group_id: gid, course_id: doc.courseId || null, title: doc.title, url: doc.url, tags: doc.tags, created_at: doc.createdAt });
  }, [gid]);

  const deleteDocument = useCallback((id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    sb('documents', 'delete', null, id);
  }, []);

  // ── Exam actions ──────────────────────────────────────────────────────────

  const addExam = useCallback((exam: Omit<Exam, 'id'>) => {
    const id = generateId();
    setExams(prev => [...prev, { ...exam, id }]);
    if (gid) sb('exams', 'insert', { id, group_id: gid, course_id: exam.courseId || null, course_name: exam.courseName, title: exam.title, date: exam.date, notes: exam.notes, topics: exam.topics ?? [] });
  }, [gid]);

  const updateExam = useCallback((id: string, updates: Partial<Omit<Exam, 'id'>>) => {
    setExams(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    if (gid) sb('exams', 'update', { title: updates.title, date: updates.date, notes: updates.notes, topics: updates.topics, course_name: updates.courseName }, id);
  }, [gid]);

  const deleteExam = useCallback((id: string) => {
    setExams(prev => prev.filter(e => e.id !== id));
    sb('exams', 'delete', null, id);
  }, []);

  // ── Meeting actions ───────────────────────────────────────────────────────

  const addMeeting = useCallback((meeting: Omit<Meeting, 'id'>) => {
    const id = generateId();
    setMeetings(prev => [...prev, { ...meeting, id }]);
    if (gid) sb('meetings', 'insert', { id, group_id: gid, title: meeting.title, date: meeting.date, location: meeting.location, agenda: meeting.agenda, decisions: meeting.decisions });
  }, [gid]);

  const updateMeeting = useCallback((id: string, updates: Partial<Omit<Meeting, 'id'>>) => {
    setMeetings(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    sb('meetings', 'update', { title: updates.title, date: updates.date, location: updates.location, agenda: updates.agenda, decisions: updates.decisions }, id);
  }, []);

  const deleteMeeting = useCallback((id: string) => {
    setMeetings(prev => prev.filter(m => m.id !== id));
    sb('meetings', 'delete', null, id);
  }, []);

  // ── Study note actions ────────────────────────────────────────────────────

  const addNote = useCallback((note: Omit<StudyNote, 'id'>) => {
    const id = generateId();
    setNotes(prev => [...prev, { ...note, id }]);
    if (gid) sb('study_notes', 'insert', { id, group_id: gid, course_id: note.courseId || null, title: note.title, week: note.week, format: note.format, url: note.url, source_type: note.sourceType, file_name: note.fileName, mime_type: note.mimeType, tags: note.tags, exam_relevant: note.examRelevant });
  }, [gid]);

  const updateNote = useCallback((id: string, updates: Partial<Omit<StudyNote, 'id'>>) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
    sb('study_notes', 'update', { title: updates.title, week: updates.week, url: updates.url, exam_relevant: updates.examRelevant }, id);
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    sb('study_notes', 'delete', null, id);
  }, []);

  // ── Week focus actions ────────────────────────────────────────────────────

  const addWeekFocus = useCallback((item: Omit<WeekFocus, 'id'>) => {
    const id = generateId();
    setWeekFocus(prev => [...prev, { ...item, id }]);
    if (gid) sb('week_focus', 'insert', { id, group_id: gid, course_id: item.courseId || null, week: item.week, text: item.text, done: item.done });
  }, [gid]);

  const updateWeekFocus = useCallback((id: string, updates: Partial<Omit<WeekFocus, 'id'>>) => {
    setWeekFocus(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    sb('week_focus', 'update', { text: updates.text, done: updates.done }, id);
  }, []);

  const deleteWeekFocus = useCallback((id: string) => {
    setWeekFocus(prev => prev.filter(f => f.id !== id));
    sb('week_focus', 'delete', null, id);
  }, []);

  // ── Schedule events ───────────────────────────────────────────────────────

  const setScheduleEvents = useCallback((events: ScheduleEvent[]) => {
    // Deduplicate by id — ICS recurring events can produce duplicate IDs with old parsers
    const deduped = Array.from(new Map(events.map(e => [e.id, e])).values());
    setScheduleEventsState(deduped);
    if (!gid) return;
    // Replace all schedule events for this group: delete then upsert
    supabase.from('schedule_events').delete().eq('group_id', gid).then(({ error: delErr }) => {
      if (delErr) { console.error('[Supabase] schedule_events delete:', delErr.message); return; }
      if (deduped.length === 0) return;
      supabase.from('schedule_events').upsert(
        deduped.map(e => ({ id: e.id, group_id: gid, title: e.title, start_time: e.start, end_time: e.end, location: e.location ?? null })),
        { onConflict: 'id' }
      ).then(({ error }) => { if (error) console.error('[Supabase] schedule_events upsert:', error.message); });
    });
  }, [gid, supabase]);

  // ── Canvas modules ────────────────────────────────────────────────────────

  const upsertModules = useCallback((incoming: CanvasModule[]) => {
    const mm = courseMergeMapRef.current;
    const rw = (id: string) => mm.get(id) ?? id;
    const rewritten = incoming.map(m => ({ ...m, courseId: rw(m.courseId) }));
    const courseIds = new Set(rewritten.map(m => m.courseId));
    setCanvasModules(prev => [...prev.filter(m => !courseIds.has(m.courseId)), ...rewritten]);
    if (!gid) return;
    // Delete existing modules for these courses then insert new
    supabase.from('canvas_modules').delete().eq('group_id', gid).in('course_id', Array.from(courseIds)).then(() => {
      if (rewritten.length === 0) return;
      supabase.from('canvas_modules').insert(
        rewritten.map(m => ({ id: m.id, group_id: gid, course_id: m.courseId, name: m.name, position: m.position, week: m.week, items: m.items }))
      ).then(({ error }) => { if (error) console.error('[Supabase] canvas_modules insert:', error.message); });
    });
  }, [gid, supabase]);

  // ── Upsert operations (Canvas sync) ──────────────────────────────────────

  const upsertCourses = useCallback((incoming: Course[]) => {
    // Auto-merge: match incoming canvas courses to existing courses using:
    // 1. Persisted merge map (courseMapping with _cm: prefix) — survives renames
    // 2. Fuzzy name matching as fallback
    const mergeMap = new Map<string, string>(); // canvas id → existing id
    setCourses(prev => {
      const map = new Map(prev.map(c => [c.id, c]));
      const allExisting = prev;

      const usedColors = new Set(prev.map(c => c.color).filter(Boolean));
      let colorIndex = 0;

      incoming.forEach(c => {
        let targetId = c.id;

        if (c.id.startsWith('canvas-')) {
          // 1. Check persisted merge map first (handles renamed courses)
          const persistedTarget = courseMapping[`_cm:${c.id}`];
          if (persistedTarget && map.has(persistedTarget)) {
            targetId = persistedTarget;
            mergeMap.set(c.id, persistedTarget);
            if (map.has(c.id) && c.id !== persistedTarget) map.delete(c.id);
          } else {
            // 2. Fuzzy name match against ALL existing courses (not just non-canvas)
            const norm = c.name.toLowerCase().trim();
            const match = allExisting.find(mc => {
              if (mc.id === c.id) return false; // skip self
              const mn = mc.name.toLowerCase().trim();
              if (mn === norm) return true;
              const shorter = mn.length < norm.length ? mn : norm;
              const longer = mn.length < norm.length ? norm : mn;
              return shorter.length >= 4 && longer.startsWith(shorter);
            });
            if (match) {
              targetId = match.id;
              mergeMap.set(c.id, match.id);
              if (map.has(c.id)) map.delete(c.id);
            }
          }
        }

        const existing = map.get(targetId);
        // Don't overwrite user-edited name with canvas name when merging
        const keepName = existing && mergeMap.has(c.id) ? existing.name : c.name;
        if (!existing?.color && !c.color) {
          const available = COURSE_COLORS.filter(col => !usedColors.has(col));
          const assignedColor = available[colorIndex % Math.max(available.length, 1)] ?? COURSE_COLORS[colorIndex % COURSE_COLORS.length];
          usedColors.add(assignedColor);
          colorIndex++;
          map.set(targetId, { ...existing, ...c, id: targetId, name: keepName, color: assignedColor });
        } else {
          map.set(targetId, { ...existing, ...c, id: targetId, name: keepName, color: existing?.color ?? c.color });
        }
      });
      return Array.from(map.values());
    });

    // Rewrite courseId references for auto-merged courses (canvas modules, tasks, docs)
    if (mergeMap.size > 0) {
      const rewrite = (id: string) => mergeMap.get(id) ?? id;
      setTasks(prev => prev.map(t => mergeMap.has(t.courseId) ? { ...t, courseId: rewrite(t.courseId) } : t));
      setDocuments(prev => prev.map(d => mergeMap.has(d.courseId) ? { ...d, courseId: rewrite(d.courseId) } : d));
      setCanvasModules(prev => prev.map(m => mergeMap.has(m.courseId) ? { ...m, courseId: rewrite(m.courseId) } : m));
      setExams(prev => prev.map(e => mergeMap.has(e.courseId) ? { ...e, courseId: rewrite(e.courseId) } : e));
      setNotes(prev => prev.map(n => mergeMap.has(n.courseId) ? { ...n, courseId: rewrite(n.courseId) } : n));
      setLessonNotes(prev => prev.map(n => mergeMap.has(n.courseId) ? { ...n, courseId: rewrite(n.courseId) } : n));
      setStudyPages(prev => prev.map(p => mergeMap.has(p.courseId) ? { ...p, courseId: rewrite(p.courseId) } : p));
      console.log('[AutoMerge] Merged canvas courses into existing:', Object.fromEntries(mergeMap));
      // Persist merge map so future syncs remember even after renames
      const mappingUpdates: Record<string, string> = {};
      mergeMap.forEach((targetId, canvasId) => { mappingUpdates[`_cm:${canvasId}`] = targetId; });
      setCourseMappingState(prev => {
        const updated = { ...prev, ...mappingUpdates };
        if (gid) supabase.from('groups').update({ course_mapping: updated }).eq('id', gid);
        return updated;
      });
    }
    // Store merge map so subsequent upsert calls (tasks, docs, modules) can rewrite courseIds
    courseMergeMapRef.current = mergeMap;

    if (!gid) return;
    // Upsert with the (possibly rewritten) ids
    const rewrite = (id: string) => mergeMap.get(id) ?? id;
    supabase.from('courses').upsert(
      incoming.map(c => ({ id: rewrite(c.id), group_id: gid, name: c.name, semester: c.semester, color: c.color, code: c.code })),
      { onConflict: 'id', ignoreDuplicates: false }
    ).then(({ error }) => { if (error) console.error('[Supabase] courses upsert:', error.message); });
    // Clean up orphaned canvas course rows that were merged
    if (mergeMap.size > 0) {
      const orphanIds = Array.from(mergeMap.keys());
      supabase.from('courses').delete().in('id', orphanIds)
        .then(({ error }) => { if (error) console.error('[Supabase] orphan course cleanup:', error.message); });
    }
  }, [gid, supabase, courseMapping]);

  const upsertTasks = useCallback((incoming: Task[]) => {
    const mm = courseMergeMapRef.current;
    const rw = (id: string) => mm.get(id) ?? id;
    setTasks(prev => {
      const map = new Map(prev.map(t => [t.id, t]));
      incoming.forEach(t => {
        const fixed = { ...t, courseId: rw(t.courseId) };
        const existing = map.get(t.id);
        map.set(t.id, existing ? { ...fixed, status: existing.status, assignedTo: existing.assignedTo } : fixed);
      });
      return Array.from(map.values());
    });
    if (!gid) return;
    supabase.from('tasks').upsert(
      incoming.map(t => ({ id: t.id, group_id: gid, course_id: rw(t.courseId) || null, title: t.title, deadline: t.deadline, status: t.status, assigned_to: t.assignedTo, url: t.url })),
      { onConflict: 'id', ignoreDuplicates: false }
    ).then(({ error }) => { if (error) console.error('[Supabase] tasks upsert:', error.message); });
  }, [gid, supabase]);

  const upsertDocuments = useCallback((incoming: Document[]) => {
    const mm = courseMergeMapRef.current;
    const rw = (id: string) => mm.get(id) ?? id;
    setDocuments(prev => {
      const map = new Map(prev.map(d => [d.id, d]));
      incoming.forEach(d => map.set(d.id, { ...map.get(d.id), ...d, courseId: rw(d.courseId) }));
      return Array.from(map.values());
    });
    if (!gid) return;
    supabase.from('documents').upsert(
      incoming.map(d => ({ id: d.id, group_id: gid, course_id: rw(d.courseId) || null, title: d.title, url: d.url, tags: d.tags, created_at: d.createdAt })),
      { onConflict: 'id', ignoreDuplicates: false }
    ).then(({ error }) => { if (error) console.error('[Supabase] documents upsert:', error.message); });
  }, [gid, supabase]);

  const pruneCanvasData = useCallback((keepCourseIds: string[]) => {
    const keepSet = new Set(keepCourseIds);
    setCourses(prev => prev.filter(c => !c.id.startsWith('canvas-') || keepSet.has(c.id)));
    setTasks(prev => prev.filter(t => !t.courseId.startsWith('canvas-') || keepSet.has(t.courseId)));
    setDocuments(prev => prev.filter(d => !d.courseId.startsWith('canvas-') || keepSet.has(d.courseId)));
    setCanvasModules(prev => prev.filter(m => !m.courseId.startsWith('canvas-') || keepSet.has(m.courseId)));
    if (!gid) return;
    // Delete canvas-prefixed courses not in keepSet
    supabase.from('courses').delete().eq('group_id', gid)
      .like('id', 'canvas-%')
      .not('id', 'in', `(${keepCourseIds.map(id => `'${id}'`).join(',') || "''"})`)
      .then(({ error }) => { if (error) console.error('[Supabase] pruneCanvasData:', error.message); });
  }, [gid, supabase]);

  const mergeCourses = useCallback((keepId: string, removeId: string, newName: string) => {
    setTasks(prev => prev.map(t => t.courseId === removeId ? { ...t, courseId: keepId } : t));
    setDocuments(prev => prev.map(d => d.courseId === removeId ? { ...d, courseId: keepId } : d));
    setCanvasModules(prev => prev.map(m => m.courseId === removeId ? { ...m, courseId: keepId } : m));
    setExams(prev => prev.map(e => {
      if (e.courseId === removeId) return { ...e, courseId: keepId, courseName: newName };
      if (e.courseId === keepId) return { ...e, courseName: newName };
      return e;
    }));
    setNotes(prev => prev.map(n => n.courseId === removeId ? { ...n, courseId: keepId } : n));
    setLessonNotes(prev => prev.map(n => n.courseId === removeId ? { ...n, courseId: keepId } : n));
    setStudyPages(prev => prev.map(p => p.courseId === removeId ? { ...p, courseId: keepId } : p));
    setCourses(prev => prev.filter(c => c.id !== removeId).map(c => c.id === keepId ? { ...c, name: newName } : c));
    // Persist canvas merge mapping so future syncs remember this merge
    if (removeId.startsWith('canvas-')) {
      setCourseMappingState(prev => {
        const updated = { ...prev, [`_cm:${removeId}`]: keepId };
        if (gid) supabase.from('groups').update({ course_mapping: updated }).eq('id', gid);
        return updated;
      });
    }
    // Supabase: update all references then delete the old course
    if (!gid) return;
    Promise.all([
      supabase.from('tasks').update({ course_id: keepId }).eq('group_id', gid).eq('course_id', removeId),
      supabase.from('documents').update({ course_id: keepId }).eq('group_id', gid).eq('course_id', removeId),
      supabase.from('canvas_modules').update({ course_id: keepId }).eq('group_id', gid).eq('course_id', removeId),
      supabase.from('exams').update({ course_id: keepId, course_name: newName }).eq('group_id', gid).eq('course_id', removeId),
      supabase.from('study_notes').update({ course_id: keepId }).eq('group_id', gid).eq('course_id', removeId),
      supabase.from('lesson_notes').update({ course_id: keepId }).eq('group_id', gid).eq('course_id', removeId),
      supabase.from('study_pages').update({ course_id: keepId }).eq('group_id', gid).eq('course_id', removeId),
      supabase.from('courses').update({ name: newName }).eq('id', keepId),
    ]).then(() => supabase.from('courses').delete().eq('id', removeId));
  }, [gid, supabase]);

  // ── Lesson notes ──────────────────────────────────────────────────────────

  const addLessonNote = useCallback((note: Omit<LessonNote, 'id' | 'createdAt' | 'updatedAt'>): string => {
    const id = generateId();
    const now = new Date().toISOString();
    setLessonNotes(prev => [...prev, { ...note, id, createdAt: now, updatedAt: now }]);
    if (gid) sb('lesson_notes', 'insert', { id, group_id: gid, course_id: note.courseId || null, module_id: note.moduleId, lesson_title: note.lessonTitle, content: note.content, author_id: note.authorId || null, author_name: note.authorName, created_at: now, updated_at: now });
    return id;
  }, [gid]);

  const updateLessonNote = useCallback((id: string, content: string) => {
    const now = new Date().toISOString();
    setLessonNotes(prev => prev.map(n => n.id === id ? { ...n, content, updatedAt: now } : n));
    sb('lesson_notes', 'update', { content, updated_at: now }, id);
  }, []);

  const deleteLessonNote = useCallback((id: string) => {
    setLessonNotes(prev => prev.filter(n => n.id !== id));
    sb('lesson_notes', 'delete', null, id);
  }, []);

  // ── Course mapping ────────────────────────────────────────────────────────

  const updateCourseMapping = useCallback((key: string, courseId: string) => {
    setCourseMappingState(prev => {
      const updated = { ...prev };
      if (!courseId) delete updated[key];
      else updated[key] = courseId;
      if (gid) supabase.from('groups').update({ course_mapping: updated }).eq('id', gid).then(({ error }) => { if (error) console.error('[Supabase] course_mapping:', error.message); });
      return updated;
    });
  }, [gid, supabase]);

  // ── Export / Import ───────────────────────────────────────────────────────

  const exportData = useCallback(() => {
    const data = { version: 1, exportedAt: new Date().toISOString(), courses, tasks, documents, exams, meetings, notes, weekFocus, scheduleEvents };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `studiegruppe-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
  }, [courses, tasks, documents, exams, meetings, notes, weekFocus, scheduleEvents]);

  const importData = useCallback((json: string): { success: boolean; error?: string } => {
    try {
      const data = JSON.parse(json) as Record<string, unknown>;
      if (data.version !== 1 || !Array.isArray(data.courses)) return { success: false, error: 'Ugyldigt filformat' };
      upsertCourses(data.courses as Course[]);
      if (Array.isArray(data.tasks)) upsertTasks(data.tasks as Task[]);
      if (Array.isArray(data.documents)) upsertDocuments(data.documents as Document[]);
      if (Array.isArray(data.exams)) (data.exams as Exam[]).forEach(e => addExam(e));
      if (Array.isArray(data.scheduleEvents)) setScheduleEvents(data.scheduleEvents as ScheduleEvent[]);
      return { success: true };
    } catch { return { success: false, error: 'Kunne ikke læse filen' }; }
  }, [upsertCourses, upsertTasks, upsertDocuments, addExam, setScheduleEvents]);

  // ── Group system ──────────────────────────────────────────────────────────

  const logGroupActivity = useCallback((item: Omit<GroupActivityItem, 'id' | 'timestamp'>) => {
    const id = generateId();
    const timestamp = new Date().toISOString();
    const newItem: GroupActivityItem = { ...item, id, timestamp };
    setGroupActivity(prev => [newItem, ...prev].slice(0, 200));
    if (gid) sb('group_activity', 'insert', { id, group_id: gid, type: item.type, message: item.message, user_id: item.userId, user_name: item.userName, assignment_id: item.assignmentId, meeting_id: item.meetingId, timestamp });
  }, [gid]);

  const getGroupMembers = useCallback((): User[] => groupMembers, [groupMembers]);

  // ── Study pages ────────────────────────────────────────────────────────────

  const addStudyPage = useCallback((page: Omit<StudyPage, 'id' | 'createdAt' | 'updatedAt'>): string => {
    const id = generateId();
    const now = new Date().toISOString();
    setStudyPages(prev => [...prev, { ...page, id, createdAt: now, updatedAt: now }]);
    if (gid) supabase.from('study_pages').insert({
      id, group_id: gid, course_id: page.courseId || null, module_id: page.moduleId,
      module_name: page.moduleName, week_number: page.weekNumber ?? null,
      title: page.title, html_content: page.htmlContent,
      created_by: page.createdById || null, created_by_name: page.createdByName,
      created_at: now, updated_at: now,
    }).then(({ error }) => { if (error) console.error('[Supabase] study_pages insert:', error.message); });
    return id;
  }, [gid, supabase]);

  const updateStudyPage = useCallback((id: string, updates: Partial<Pick<StudyPage, 'title' | 'htmlContent'>>) => {
    const now = new Date().toISOString();
    setStudyPages(prev => prev.map(p => p.id === id ? { ...p, ...updates, updatedAt: now } : p));
    if (gid) supabase.from('study_pages').update({
      title: updates.title, html_content: updates.htmlContent, updated_at: now,
    }).eq('id', id).then(({ error }) => { if (error) console.error('[Supabase] study_pages update:', error.message); });
  }, [gid, supabase]);

  const deleteStudyPage = useCallback((id: string) => {
    setStudyPages(prev => prev.filter(p => p.id !== id));
    supabase.from('study_pages').delete().eq('id', id).then(({ error }) => { if (error) console.error('[Supabase] study_pages delete:', error.message); });
  }, [supabase]);

  const addGroupAssignment = useCallback((a: Omit<GroupAssignment, 'id' | 'createdAt' | 'tasks' | 'files' | 'comments' | 'meetingNotes' | 'status'>): string => {
    const id = generateId();
    const now = new Date().toISOString();
    const newAssignment: GroupAssignment = { ...a, id, createdAt: now, tasks: [], files: [], comments: [], meetingNotes: [], status: 'active' };
    setGroupAssignments(prev => [...prev, newAssignment]);
    if (gid) sb('group_assignments', 'insert', { id, group_id: gid, course_id: a.courseId || null, course_name: a.courseName, title: a.title, description: a.description, deadline: a.deadline, created_by: a.createdById || null, created_at: now, tasks: [], files: [], comments: [], meeting_notes: [] });
    logGroupActivity({ type: 'assignment_created', message: `${groupMembers.find(u => u.id === a.createdById)?.name ?? 'Nogen'} oprettede aflevering "${a.title}"`, userId: a.createdById, userName: groupMembers.find(u => u.id === a.createdById)?.name ?? '', assignmentId: id });
    return id;
  }, [gid, logGroupActivity, groupMembers]);

  const updateGroupAssignment = useCallback((id: string, updates: Partial<Pick<GroupAssignment, 'title' | 'courseId' | 'courseName' | 'deadline' | 'description' | 'status'>>) => {
    setGroupAssignments(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    sb('group_assignments', 'update', { title: updates.title, course_id: updates.courseId, course_name: updates.courseName, deadline: updates.deadline, description: updates.description, status: updates.status }, id);
  }, []);

  const deleteGroupAssignment = useCallback((id: string) => {
    setGroupAssignments(prev => prev.filter(a => a.id !== id));
    sb('group_assignments', 'delete', null, id);
  }, []);

  // Helper: update assignment JSONB field in Supabase
  const syncAssignment = useCallback((assignment: GroupAssignment) => {
    sb('group_assignments', 'update', { tasks: assignment.tasks, files: assignment.files, comments: assignment.comments, meeting_notes: assignment.meetingNotes }, assignment.id);
  }, []);

  const addGroupTask = useCallback((assignmentId: string, task: Omit<GroupTask, 'id' | 'createdAt'>) => {
    const id = generateId();
    const now = new Date().toISOString();
    let updated: GroupAssignment | undefined;
    setGroupAssignments(prev => prev.map(a => {
      if (a.id !== assignmentId) return a;
      updated = { ...a, tasks: [...a.tasks, { ...task, id, createdAt: now }] };
      return updated;
    }));
    if (updated) syncAssignment(updated);
    logGroupActivity({ type: 'task_created', message: `${task.assigneeName} fik tildelt "${task.title}"`, userId: task.assigneeId, userName: task.assigneeName, assignmentId });
  }, [syncAssignment, logGroupActivity]);

  const updateGroupTask = useCallback((assignmentId: string, taskId: string, updates: Partial<Omit<GroupTask, 'id' | 'createdAt'>>) => {
    let updated: GroupAssignment | undefined;
    let task: GroupTask | undefined;
    setGroupAssignments(prev => prev.map(a => {
      if (a.id !== assignmentId) return a;
      task = a.tasks.find(t => t.id === taskId);
      updated = { ...a, tasks: a.tasks.map(t => t.id !== taskId ? t : { ...t, ...updates }) };
      return updated;
    }));
    if (updated) syncAssignment(updated);
    if (updates.status === 'done' && task) {
      logGroupActivity({ type: 'task_done', message: `${task.assigneeName} markerede "${task.title}" som færdig`, userId: task.assigneeId, userName: task.assigneeName, assignmentId });
    }
  }, [syncAssignment, logGroupActivity]);

  const deleteGroupTask = useCallback((assignmentId: string, taskId: string) => {
    let updated: GroupAssignment | undefined;
    setGroupAssignments(prev => prev.map(a => { if (a.id !== assignmentId) return a; updated = { ...a, tasks: a.tasks.filter(t => t.id !== taskId) }; return updated!; }));
    if (updated) syncAssignment(updated);
  }, [syncAssignment]);

  const addAssignmentFile = useCallback((assignmentId: string, file: Omit<AssignmentFile, 'id' | 'addedAt'>) => {
    const id = generateId(); const now = new Date().toISOString();
    let updated: GroupAssignment | undefined;
    setGroupAssignments(prev => prev.map(a => { if (a.id !== assignmentId) return a; updated = { ...a, files: [...a.files, { ...file, id, addedAt: now }] }; return updated!; }));
    if (updated) syncAssignment(updated);
    logGroupActivity({ type: 'file_added', message: `${file.addedByName} tilføjede "${file.title}"`, userId: file.addedById, userName: file.addedByName, assignmentId });
  }, [syncAssignment, logGroupActivity]);

  const deleteAssignmentFile = useCallback((assignmentId: string, fileId: string) => {
    let updated: GroupAssignment | undefined;
    setGroupAssignments(prev => prev.map(a => { if (a.id !== assignmentId) return a; updated = { ...a, files: a.files.filter(f => f.id !== fileId) }; return updated!; }));
    if (updated) syncAssignment(updated);
  }, [syncAssignment]);

  const addAssignmentComment = useCallback((assignmentId: string, comment: Omit<AssignmentComment, 'id' | 'createdAt'>) => {
    const id = generateId(); const now = new Date().toISOString();
    let updated: GroupAssignment | undefined;
    setGroupAssignments(prev => prev.map(a => { if (a.id !== assignmentId) return a; updated = { ...a, comments: [...a.comments, { ...comment, id, createdAt: now }] }; return updated!; }));
    if (updated) syncAssignment(updated);
    logGroupActivity({ type: 'comment_added', message: `${comment.authorName} kommenterede`, userId: comment.authorId, userName: comment.authorName, assignmentId });
  }, [syncAssignment, logGroupActivity]);

  const deleteAssignmentComment = useCallback((assignmentId: string, commentId: string) => {
    let updated: GroupAssignment | undefined;
    setGroupAssignments(prev => prev.map(a => { if (a.id !== assignmentId) return a; updated = { ...a, comments: a.comments.filter(c => c.id !== commentId) }; return updated!; }));
    if (updated) syncAssignment(updated);
  }, [syncAssignment]);

  const addAssignmentMeetingNote = useCallback((assignmentId: string, note: Omit<AssignmentMeetingNote, 'id' | 'createdAt'>) => {
    const id = generateId(); const now = new Date().toISOString();
    let updated: GroupAssignment | undefined;
    setGroupAssignments(prev => prev.map(a => { if (a.id !== assignmentId) return a; updated = { ...a, meetingNotes: [...a.meetingNotes, { ...note, id, createdAt: now }] }; return updated!; }));
    if (updated) syncAssignment(updated);
    logGroupActivity({ type: 'meeting_note_added', message: `${note.authorName} tilføjede mødenoter`, userId: note.authorId, userName: note.authorName, assignmentId });
  }, [syncAssignment, logGroupActivity]);

  const deleteAssignmentMeetingNote = useCallback((assignmentId: string, noteId: string) => {
    let updated: GroupAssignment | undefined;
    setGroupAssignments(prev => prev.map(a => { if (a.id !== assignmentId) return a; updated = { ...a, meetingNotes: a.meetingNotes.filter(n => n.id !== noteId) }; return updated!; }));
    if (updated) syncAssignment(updated);
  }, [syncAssignment]);

  const addGroupMeeting = useCallback((meeting: Omit<GroupMeeting, 'id' | 'createdAt' | 'notes' | 'status'>): string => {
    const id = generateId(); const now = new Date().toISOString();
    const creatorName = groupMembers.find(u => u.id === meeting.createdById)?.name ?? '';
    setGroupMeetings(prev => [...prev, { ...meeting, id, createdAt: now, notes: '', status: 'planned' }]);
    if (gid) sb('group_meetings', 'insert', { id, group_id: gid, title: meeting.title, date: meeting.date || null, start_time: meeting.startTime, end_time: meeting.endTime, location: meeting.location, assignment_id: meeting.assignmentId || null, description: meeting.description, notes: '', time_poll: meeting.timePoll, status: 'planned', created_by: meeting.createdById || null, created_at: now });
    logGroupActivity({ type: 'meeting_added', message: `${creatorName} planlagde møde "${meeting.title}"`, userId: meeting.createdById, userName: creatorName, meetingId: id });
    return id;
  }, [gid, logGroupActivity, groupMembers]);

  const updateGroupMeeting = useCallback((id: string, updates: Partial<Omit<GroupMeeting, 'id' | 'createdAt'>>) => {
    setGroupMeetings(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    sb('group_meetings', 'update', { title: updates.title, date: updates.date || null, start_time: updates.startTime, end_time: updates.endTime, location: updates.location, description: updates.description, notes: updates.notes, time_poll: updates.timePoll, status: updates.status, assignment_id: updates.assignmentId || null }, id);
  }, []);

  const deleteGroupMeeting = useCallback((id: string) => {
    setGroupMeetings(prev => prev.filter(m => m.id !== id));
    sb('group_meetings', 'delete', null, id);
  }, []);

  const voteTimePoll = useCallback((meetingId: string, slotId: string, userId: string) => {
    let updated: GroupMeeting | undefined;
    setGroupMeetings(prev => prev.map(m => {
      if (m.id !== meetingId || !m.timePoll) return m;
      const timePoll = m.timePoll.map(s => {
        if (s.id !== slotId) return s;
        const hasVoted = s.votes.includes(userId);
        return { ...s, votes: hasVoted ? s.votes.filter(v => v !== userId) : [...s.votes, userId] };
      });
      updated = { ...m, timePoll };
      return updated;
    }));
    if (updated) sb('group_meetings', 'update', { time_poll: updated.timePoll }, meetingId);
  }, []);

  const confirmTimePoll = useCallback((meetingId: string, slotId: string) => {
    let updated: GroupMeeting | undefined;
    setGroupMeetings(prev => prev.map(m => {
      if (m.id !== meetingId || !m.timePoll) return m;
      const slot = m.timePoll.find(s => s.id === slotId);
      if (!slot) return m;
      updated = { ...m, date: slot.date, startTime: slot.startTime, endTime: slot.endTime, timePoll: undefined };
      return updated;
    }));
    if (updated) sb('group_meetings', 'update', { date: updated.date, start_time: updated.startTime, end_time: updated.endTime, time_poll: null }, meetingId);
  }, []);

  const addGroupChecklistItem = useCallback((item: Omit<GroupChecklistItem, 'id' | 'addedAt'>) => {
    const id = generateId(); const addedAt = new Date().toISOString();
    setGroupChecklist(prev => [...prev, { ...item, id, addedAt }]);
    if (gid) sb('group_checklist', 'insert', { id, group_id: gid, text: item.text, done: item.done, added_by_id: item.addedById || null, added_by_name: item.addedByName, added_at: addedAt });
  }, [gid]);

  const toggleGroupChecklistItem = useCallback((id: string) => {
    let newDone = false;
    setGroupChecklist(prev => prev.map(i => { if (i.id !== id) return i; newDone = !i.done; return { ...i, done: newDone }; }));
    sb('group_checklist', 'update', { done: newDone }, id);
  }, []);

  const deleteGroupChecklistItem = useCallback((id: string) => {
    setGroupChecklist(prev => prev.filter(i => i.id !== id));
    sb('group_checklist', 'delete', null, id);
  }, []);

  const setMemberAvailability = useCallback((userId: string, text: string) => {
    const updatedAt = new Date().toISOString();
    setMemberAvailabilityState(prev => { const filtered = prev.filter(a => a.userId !== userId); return [...filtered, { userId, text, updatedAt }]; });
    if (gid) {
      supabase.from('member_availability').upsert({ group_id: gid, user_id: userId, text, updated_at: updatedAt }, { onConflict: 'group_id,user_id' })
        .then(({ error }) => { if (error) console.error('[Supabase] member_availability:', error.message); });
    }
  }, [gid, supabase]);

  // ── Provide ───────────────────────────────────────────────────────────────

  // Suppress unused supabaseUser warning — it triggers loadUserAndGroup via auth state change
  void supabaseUser;

  return (
    <AppContext.Provider value={{
      currentUser, currentGroup, groupConfig, loading,
      login, logout, signup, createGroup, joinGroup, findGroupByCode,
      courses, tasks, documents, exams, meetings, notes, weekFocus,
      scheduleEvents, canvasModules, lessonNotes, courseMapping,
      getCourseById, addCourse, updateCourse, deleteCourse,
      addTask, updateTask, deleteTask,
      addDocument, deleteDocument,
      addExam, updateExam, deleteExam,
      addMeeting, updateMeeting, deleteMeeting,
      addNote, updateNote, deleteNote,
      addWeekFocus, updateWeekFocus, deleteWeekFocus,
      setScheduleEvents, upsertModules, upsertCourses, upsertTasks, upsertDocuments,
      pruneCanvasData, mergeCourses,
      addLessonNote, updateLessonNote, deleteLessonNote,
      updateCourseMapping, exportData, importData,
      groupAssignments, groupMeetings, groupChecklist, groupActivity, memberAvailability,
      addGroupAssignment, updateGroupAssignment, deleteGroupAssignment,
      addGroupTask, updateGroupTask, deleteGroupTask,
      addAssignmentFile, deleteAssignmentFile,
      addAssignmentComment, deleteAssignmentComment,
      addAssignmentMeetingNote, deleteAssignmentMeetingNote,
      addGroupMeeting, updateGroupMeeting, deleteGroupMeeting,
      voteTimePoll, confirmTimePoll,
      addGroupChecklistItem, toggleGroupChecklistItem, deleteGroupChecklistItem,
      setMemberAvailability, getGroupMembers,
      studyPages, addStudyPage, updateStudyPage, deleteStudyPage,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
