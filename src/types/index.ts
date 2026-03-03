export interface Course {
  id: string;
  name: string;
  semester: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Task {
  id: string;
  title: string;
  courseId: string;
  deadline: string;
  status: TaskStatus;
  assignedTo: string;
}

export interface Document {
  id: string;
  title: string;
  courseId: string;
  url: string;
  tags: string[];
}

export interface Exam {
  id: string;
  courseId: string;
  date: string;
  notes: string;
}
