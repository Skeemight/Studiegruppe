export interface Course {
  id: string;
  name: string;
  code?: string;
  semester: string;
  color?: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Task {
  id: string;
  title: string;
  courseId: string;
  deadline: string;
  status: TaskStatus;
  assignedTo: string;
  url?: string;
}

export interface Document {
  id: string;
  title: string;
  courseId: string;
  url: string;
  tags: string[];
  createdAt?: string; // ISO date string, set from Canvas
}

export interface Exam {
  id: string;
  courseId: string;
  courseName?: string;
  title?: string;
  date: string;
  notes: string;
  topics?: { id: string; text: string; done: boolean }[];
}

export interface ScheduleEvent {
  id: string;
  title: string;
  start: string;    // ISO datetime
  end: string;      // ISO datetime
  location?: string;
}

export interface WeekFocus {
  id: string;
  week: string;      // ISO-uge-nøgle: "2026-10"
  courseId: string;
  text: string;
  done: boolean;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  location: string;
  agenda: string[];
  decisions: string[];
}

export interface CanvasModuleItem {
  id: string;
  title: string;
  type: string; // 'File' | 'Page' | 'Assignment' | 'ExternalUrl' | 'SubHeader' | 'Discussion'
  url: string;  // html_url from Canvas
}

export interface CanvasModule {
  id: string;
  courseId: string;
  name: string;
  week?: number;    // parsed from module name, e.g. "Uge 10 - ..." → 10
  position: number;
  items: CanvasModuleItem[];
}

export interface LessonNote {
  id: string;
  courseId: string;
  moduleId: string;       // Canvas module ID (or '__flat_docs__' for flat)
  lessonTitle: string;    // e.g. "Lektion 3 · mandag 9. mar."
  content: string;        // markdown
  authorId: string;
  authorName: string;
  createdAt: string;      // ISO
  updatedAt: string;      // ISO
}

export interface ActivityItem {
  id: string;
  type: 'new_file' | 'new_module' | 'sync_complete';
  courseId: string;
  courseName: string;
  title: string;
  url?: string;
  timestamp: string; // ISO
  seen: boolean;
}

export interface GroupConfig {
  name: string;
  program: string;
  school: string;
  members: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  groupId: string;
}

export interface Group {
  id: string;
  name: string;
  program: string;
  school: string;
  inviteCode: string;
  memberIds: string[];
}

export type NoteFormat = 'pdf' | 'docx' | 'pptx' | 'xlsx' | 'txt' | 'link' | 'andet';

export interface StudyNote {
  id: string;
  title: string;
  courseId: string;
  week: string;
  format: NoteFormat;
  url: string;
  sourceType: 'link' | 'upload';
  fileName?: string;
  mimeType?: string;
  tags: string[];
  examRelevant: boolean;
}

// ── Group / Studiegruppe types ─────────────────────────────────────────────

export type GroupTaskStatus = 'todo' | 'in_progress' | 'done';

export interface GroupTask {
  id: string;
  title: string;
  assigneeId: string;
  assigneeName: string;
  status: GroupTaskStatus;
  deadline?: string; // YYYY-MM-DD
  createdAt: string;
}

export interface AssignmentFile {
  id: string;
  title: string;
  url: string;
  addedById: string;
  addedByName: string;
  addedAt: string;
}

export interface AssignmentComment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export interface AssignmentMeetingNote {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export interface GroupAssignment {
  id: string;
  title: string;
  courseId: string;      // '' if not tied to a course
  courseName: string;
  deadline: string;      // YYYY-MM-DD
  description?: string;
  tasks: GroupTask[];
  files: AssignmentFile[];
  comments: AssignmentComment[];
  meetingNotes: AssignmentMeetingNote[];
  status: 'active' | 'completed';
  createdAt: string;
  createdById: string;
}

export interface TimePollSlot {
  id: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:mm
  endTime: string;    // HH:mm
  votes: string[];    // userId[]
}

export interface GroupMeeting {
  id: string;
  title: string;
  date: string;        // YYYY-MM-DD
  startTime: string;   // HH:mm
  endTime: string;     // HH:mm
  location: string;
  assignmentId?: string;
  description?: string;
  notes: string;
  timePoll?: TimePollSlot[];
  status: 'planned' | 'completed';
  createdAt: string;
  createdById: string;
}

export interface GroupChecklistItem {
  id: string;
  text: string;
  done: boolean;
  addedById: string;
  addedByName: string;
  addedAt: string;
}

export interface GroupActivityItem {
  id: string;
  type: 'task_done' | 'task_created' | 'meeting_added' | 'assignment_created' | 'comment_added' | 'file_added' | 'meeting_note_added' | 'task_updated' | 'assignment_completed';
  message: string;
  userId: string;
  userName: string;
  timestamp: string;
  assignmentId?: string;
  meetingId?: string;
}

export interface MemberAvailability {
  userId: string;
  text: string;
  updatedAt: string;
}

export interface StudyPage {
  id: string;
  courseId: string;
  moduleId: string;       // canvas module ID
  moduleName: string;
  weekNumber?: number;
  title: string;
  htmlContent: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}
