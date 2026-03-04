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
