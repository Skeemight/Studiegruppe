'use client';

import { use, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/store/AppContext';
import {
  ArrowLeft, Plus, Trash2, Check, ChevronRight, ChevronLeft,
  X, ExternalLink, Pencil, FileText, Link2, MessageSquare,
  NotebookText, Clock,
} from 'lucide-react';
import type { GroupTask, GroupTaskStatus, User } from '@/types';

// ── Constants ─────────────────────────────────────────────────────────────────

const MEMBER_COLORS = [
  { bg: 'bg-blue-400', light: 'bg-blue-50', text: 'text-blue-600' },
  { bg: 'bg-emerald-400', light: 'bg-emerald-50', text: 'text-emerald-600' },
  { bg: 'bg-violet-400', light: 'bg-violet-50', text: 'text-violet-600' },
  { bg: 'bg-amber-400', light: 'bg-amber-50', text: 'text-amber-600' },
  { bg: 'bg-pink-400', light: 'bg-pink-50', text: 'text-pink-600' },
];

const STATUS_LABELS: Record<GroupTaskStatus, string> = {
  todo: 'Ikke startet',
  in_progress: 'I gang',
  done: 'Færdig',
};
const STATUS_ORDER: GroupTaskStatus[] = ['todo', 'in_progress', 'done'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function memberColor(index: number) { return MEMBER_COLORS[index % MEMBER_COLORS.length]; }

function memberIdx(userId: string, members: User[]) {
  return members.findIndex((m) => m.id === userId);
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

function daysUntil(isoDate: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(isoDate + 'T12:00:00'); d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function fmtDate(isoDate: string): string {
  return new Date(isoDate + 'T12:00:00').toLocaleDateString('da-DK', { day: 'numeric', month: 'short' });
}

function deadlineLabel(isoDate: string): { label: string; cls: string } {
  const d = daysUntil(isoDate);
  if (d < 0) return { label: `${Math.abs(d)}d over`, cls: 'text-red-500' };
  if (d === 0) return { label: 'I dag', cls: 'text-orange-500' };
  if (d === 1) return { label: 'I morgen', cls: 'text-amber-500' };
  if (d <= 7) return { label: `Om ${d} dage`, cls: 'text-gray-600' };
  return { label: fmtDate(isoDate), cls: 'text-gray-400' };
}

function relTime(iso: string): string {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diffMin < 1) return 'lige nu';
  if (diffMin < 60) return `${diffMin}m siden`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `${h}t siden`;
  return new Date(iso).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' });
}

// ── Member avatar ─────────────────────────────────────────────────────────────

function MemberAvatar({ name, idx, size = 'sm' }: { name: string; idx: number; size?: 'sm' | 'md' }) {
  const col = memberColor(idx);
  const cls = size === 'md' ? 'w-8 h-8 text-xs' : 'w-6 h-6 text-[10px]';
  return (
    <div title={name} className={`${cls} ${col.bg} rounded-full flex items-center justify-center text-white font-bold shrink-0`}>
      {initials(name)}
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full bg-emerald-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Task card ─────────────────────────────────────────────────────────────────

function TaskCard({
  task, members, assignmentId, onStatusChange, onDelete,
}: {
  task: GroupTask;
  members: User[];
  assignmentId: string;
  onStatusChange: (status: GroupTaskStatus) => void;
  onDelete: () => void;
}) {
  const idx = memberIdx(task.assigneeId, members);
  const col = idx >= 0 ? memberColor(idx) : { bg: 'bg-gray-300', light: 'bg-gray-50', text: 'text-gray-500' };
  const currentIdx = STATUS_ORDER.indexOf(task.status);
  const canBack = currentIdx > 0;
  const canForward = currentIdx < STATUS_ORDER.length - 1;

  return (
    <div className={`bg-white border border-gray-100 rounded-xl p-3 space-y-2 group/task ${task.status === 'done' ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-2">
        {idx >= 0 ? <MemberAvatar name={members[idx].name} idx={idx} /> : <div className="w-6 h-6 rounded-full bg-gray-200 shrink-0" />}
        <p className={`text-xs font-medium flex-1 leading-snug ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
          {task.title}
        </p>
        <button onClick={onDelete}
          className="opacity-0 group-hover/task:opacity-100 p-0.5 text-gray-300 hover:text-red-400 transition-all shrink-0">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      {task.deadline && (
        <p className={`text-[10px] tabular-nums pl-8 ${deadlineLabel(task.deadline).cls}`}>
          {deadlineLabel(task.deadline).label}
        </p>
      )}
      <div className="flex items-center justify-between pl-8">
        <span className={`text-[10px] font-medium ${col.text}`}>{idx >= 0 ? members[idx].name : 'Ukendt'}</span>
        <div className="flex items-center gap-0.5">
          {canBack && (
            <button onClick={() => onStatusChange(STATUS_ORDER[currentIdx - 1])}
              className="p-1 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="w-3 h-3" />
            </button>
          )}
          {canForward && (
            <button onClick={() => onStatusChange(STATUS_ORDER[currentIdx + 1])}
              className={`p-1 rounded-lg transition-colors ${task.status === 'in_progress' ? 'text-emerald-400 hover:bg-emerald-50' : 'text-gray-300 hover:text-gray-600 hover:bg-gray-100'}`}>
              {task.status === 'in_progress' ? <Check className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const {
    groupAssignments, updateGroupAssignment, deleteGroupAssignment,
    addGroupTask, updateGroupTask, deleteGroupTask,
    addAssignmentFile, deleteAssignmentFile,
    addAssignmentComment, deleteAssignmentComment,
    addAssignmentMeetingNote, deleteAssignmentMeetingNote,
    getGroupMembers, currentUser, courses,
  } = useApp();

  const members = useMemo(() => getGroupMembers(), [getGroupMembers]);
  const assignment = groupAssignments.find((a) => a.id === id);

  // Task creation state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);

  // File addition
  const [newFileTitle, setNewFileTitle] = useState('');
  const [newFileUrl, setNewFileUrl] = useState('');
  const [showAddFile, setShowAddFile] = useState(false);

  // Comment
  const [newComment, setNewComment] = useState('');

  // Meeting note
  const [newMeetingNote, setNewMeetingNote] = useState('');
  const [showAddNote, setShowAddNote] = useState(false);

  // Editing
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');

  if (!assignment) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <p className="text-sm text-gray-400">Afleveringen blev ikke fundet.</p>
        <button onClick={() => router.push('/studiegruppe')}
          className="mt-3 text-sm text-blue-500 hover:text-blue-700">Tilbage</button>
      </div>
    );
  }

  const doneTasks = assignment.tasks.filter((t) => t.status === 'done').length;
  const totalTasks = assignment.tasks.length;
  const dl = deadlineLabel(assignment.deadline);

  function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    const assignee = members.find((m) => m.id === newTaskAssignee) ?? members[0];
    if (!newTaskTitle.trim() || !assignee) return;
    addGroupTask(assignment!.id, {
      title: newTaskTitle.trim(),
      assigneeId: assignee.id,
      assigneeName: assignee.name,
      status: 'todo',
      deadline: newTaskDeadline || undefined,
    });
    setNewTaskTitle(''); setNewTaskDeadline(''); setShowAddTask(false);
  }

  function handleAddFile(e: React.FormEvent) {
    e.preventDefault();
    if (!newFileUrl.trim() || !currentUser) return;
    addAssignmentFile(assignment!.id, {
      title: newFileTitle.trim() || newFileUrl,
      url: newFileUrl.trim(),
      addedById: currentUser.id,
      addedByName: currentUser.name,
    });
    setNewFileTitle(''); setNewFileUrl(''); setShowAddFile(false);
  }

  function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim() || !currentUser) return;
    addAssignmentComment(assignment!.id, { content: newComment.trim(), authorId: currentUser.id, authorName: currentUser.name });
    setNewComment('');
  }

  function handleAddMeetingNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newMeetingNote.trim() || !currentUser) return;
    addAssignmentMeetingNote(assignment!.id, { content: newMeetingNote.trim(), authorId: currentUser.id, authorName: currentUser.name });
    setNewMeetingNote(''); setShowAddNote(false);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back + header */}
      <div>
        <button onClick={() => router.push('/studiegruppe')}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Studiegruppe
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <input type="text" value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="text-2xl font-bold text-gray-900 border-b-2 border-blue-300 focus:outline-none bg-transparent flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { updateGroupAssignment(assignment.id, { title: editTitle }); setEditingTitle(false); }
                    if (e.key === 'Escape') setEditingTitle(false);
                  }}
                  autoFocus
                />
                <button onClick={() => { updateGroupAssignment(assignment.id, { title: editTitle }); setEditingTitle(false); }}
                  className="text-blue-500 hover:text-blue-700">
                  <Check className="w-5 h-5" />
                </button>
                <button onClick={() => setEditingTitle(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group/title">
                <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
                <button onClick={() => { setEditingTitle(true); setEditTitle(assignment.title); }}
                  className="opacity-0 group-hover/title:opacity-100 p-1 text-gray-300 hover:text-gray-600 transition-all">
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {assignment.courseName && (
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {assignment.courseName}
                </span>
              )}
              <span className={`text-sm font-semibold tabular-nums ${dl.cls}`}>{dl.label}</span>
              {assignment.status === 'completed' && (
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" /> Færdig
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {assignment.status === 'active' ? (
              <button onClick={() => updateGroupAssignment(assignment.id, { status: 'completed' })}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-colors">
                <Check className="w-3.5 h-3.5" /> Marker færdig
              </button>
            ) : (
              <button onClick={() => updateGroupAssignment(assignment.id, { status: 'active' })}
                className="text-xs text-gray-400 hover:text-gray-700 transition-colors px-3 py-1.5 border border-gray-200 rounded-xl">
                Genåbn
              </button>
            )}
            <button onClick={() => { deleteGroupAssignment(assignment.id); router.push('/studiegruppe'); }}
              className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-xl transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Overall progress */}
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium">
              {totalTasks === 0 ? 'Ingen dele oprettet endnu' : `${doneTasks} af ${totalTasks} dele færdige`}
            </span>
            {totalTasks > 0 && <span className="text-gray-400 tabular-nums">{Math.round((doneTasks / totalTasks) * 100)}%</span>}
          </div>
          {totalTasks > 0 && <ProgressBar done={doneTasks} total={totalTasks} />}
        </div>
      </div>

      {/* Per-member breakdown */}
      {members.length > 0 && totalTasks > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Ansvarsfordeling</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {members.map((m, idx) => {
              const myTasks = assignment.tasks.filter((t) => t.assigneeId === m.id);
              const myDone = myTasks.filter((t) => t.status === 'done').length;
              const col = memberColor(idx);
              return (
                <div key={m.id} className={`${col.light} rounded-xl p-3`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-6 h-6 ${col.bg} rounded-full flex items-center justify-center text-[9px] font-bold text-white`}>
                      {initials(m.name)}
                    </div>
                    <span className="text-xs font-semibold text-gray-700 truncate">{m.name}</span>
                  </div>
                  <div className="space-y-1">
                    <ProgressBar done={myDone} total={myTasks.length} />
                    <p className="text-[10px] text-gray-500 tabular-nums">{myDone}/{myTasks.length} dele</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dele (parts board) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Dele</h2>
            <p className="text-[10px] text-gray-300 mt-0.5">Opdel afleveringen i dele og tildel ansvar</p>
          </div>
          <button onClick={() => setShowAddTask((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-700 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Tilføj del
          </button>
        </div>

        {/* Add part form */}
        {showAddTask && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
            <p className="text-xs font-semibold text-gray-700 mb-3">Ny del af afleveringen</p>
            <form onSubmit={handleAddTask} className="space-y-3">
              <input type="text" placeholder="Navn på del, f.eks. Indledning eller Analyse *" value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-300" />
              <div className="grid grid-cols-2 gap-3">
                <select value={newTaskAssignee}
                  onChange={(e) => setNewTaskAssignee(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-300 bg-white">
                  <option value="">Ansvarlig person</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <input type="date" value={newTaskDeadline}
                  onChange={(e) => setNewTaskDeadline(e.target.value)}
                  placeholder="Intern deadline"
                  className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-300" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddTask(false)}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-700">Annuller</button>
                <button type="submit" disabled={!newTaskTitle.trim()}
                  className="px-4 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-xl disabled:opacity-40 hover:bg-gray-800">
                  Tilføj del
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STATUS_ORDER.map((status) => {
            const col = status === 'todo' ? 'bg-gray-50' : status === 'in_progress' ? 'bg-blue-50/50' : 'bg-emerald-50/50';
            const tasks = assignment.tasks.filter((t) => t.status === status);
            return (
              <div key={status} className={`${col} rounded-2xl p-3 space-y-2`}>
                <div className="flex items-center justify-between px-1 py-1">
                  <span className="text-xs font-semibold text-gray-600">{STATUS_LABELS[status]}</span>
                  <span className="text-xs text-gray-400 tabular-nums">{tasks.length}</span>
                </div>
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    members={members}
                    assignmentId={assignment.id}
                    onStatusChange={(s) => updateGroupTask(assignment.id, task.id, { status: s })}
                    onDelete={() => deleteGroupTask(assignment.id, task.id)}
                  />
                ))}
                {tasks.length === 0 && (
                  <p className="text-center text-[10px] text-gray-300 py-4">Ingen dele</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Links og dokumenter */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-gray-400" /> Links og dokumenter
            {assignment.files.length > 0 && <span className="text-xs text-gray-400">· {assignment.files.length}</span>}
          </h2>
          <button onClick={() => setShowAddFile((v) => !v)}
            className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Tilføj link
          </button>
        </div>

        {showAddFile && (
          <form onSubmit={handleAddFile} className="flex gap-2 mb-3 items-start">
            <input type="text" placeholder="Navn (valgfrit)" value={newFileTitle}
              onChange={(e) => setNewFileTitle(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-300" />
            <input type="url" placeholder="URL *" value={newFileUrl}
              onChange={(e) => setNewFileUrl(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-300" />
            <div className="flex gap-1.5 shrink-0">
              <button type="button" onClick={() => { setShowAddFile(false); setNewFileUrl(''); setNewFileTitle(''); }}
                className="px-2.5 py-2 text-xs text-gray-400 hover:text-gray-700 transition-colors">Annuller</button>
              <button type="submit" disabled={!newFileUrl.trim()}
                className="px-3 py-2 bg-gray-900 text-white text-xs rounded-xl disabled:opacity-40 hover:bg-gray-800 transition-colors">Gem</button>
            </div>
          </form>
        )}

        {assignment.files.length === 0 ? (
          <p className="text-xs text-gray-300 italic">Ingen links endnu — tilføj f.eks. jeres Google Docs, datasæt eller relevante artikler</p>
        ) : (
          <div className="space-y-1">
            {assignment.files.map((f) => (
              <div key={f.id} className="flex items-center gap-2 group/file py-1">
                <Link2 className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                <a href={f.url} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 truncate flex-1 flex items-center gap-1">
                  {f.title}
                  <ExternalLink className="w-3 h-3 text-gray-300 shrink-0" />
                </a>
                <span className="text-[10px] text-gray-300">{f.addedByName}</span>
                <button onClick={() => deleteAssignmentFile(assignment.id, f.id)}
                  className="opacity-0 group-hover/file:opacity-100 text-gray-300 hover:text-red-400 transition-all">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Meeting notes */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <NotebookText className="w-4 h-4 text-gray-400" /> Mødenoter
            {assignment.meetingNotes.length > 0 && <span className="text-xs text-gray-400">· {assignment.meetingNotes.length}</span>}
          </h2>
          <button onClick={() => setShowAddNote((v) => !v)}
            className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Tilføj
          </button>
        </div>

        {showAddNote && (
          <form onSubmit={handleAddMeetingNote} className="space-y-2 mb-3">
            <textarea placeholder="Hvad blev aftalt? Hvem gør hvad til næste gang?" value={newMeetingNote}
              onChange={(e) => setNewMeetingNote(e.target.value)} rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-300 resize-none" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowAddNote(false)}
                className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1">Annuller</button>
              <button type="submit" disabled={!newMeetingNote.trim()}
                className="px-3 py-1.5 bg-gray-900 text-white text-xs rounded-xl disabled:opacity-40 hover:bg-gray-800">Gem note</button>
            </div>
          </form>
        )}

        {assignment.meetingNotes.length === 0 ? (
          <p className="text-xs text-gray-300 italic">Ingen mødenoter endnu</p>
        ) : (
          <div className="space-y-3 divide-y divide-gray-50">
            {[...assignment.meetingNotes].reverse().map((note) => {
              const idx = memberIdx(note.authorId, members);
              const col = idx >= 0 ? memberColor(idx) : null;
              return (
                <div key={note.id} className="pt-3 first:pt-0 group/note">
                  <div className="flex items-center gap-2 mb-1.5">
                    {idx >= 0 && col ? (
                      <div className={`w-5 h-5 ${col.bg} rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0`}>
                        {initials(note.authorName)}
                      </div>
                    ) : <div className="w-5 h-5 rounded-full bg-gray-200 shrink-0" />}
                    <span className="text-xs font-semibold text-gray-700">{note.authorName}</span>
                    <span className="text-[10px] text-gray-300">{relTime(note.createdAt)}</span>
                    <button onClick={() => deleteAssignmentMeetingNote(assignment.id, note.id)}
                      className="ml-auto opacity-0 group-hover/note:opacity-100 text-gray-300 hover:text-red-400 transition-all">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed pl-7">{note.content}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Comments */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
          <MessageSquare className="w-4 h-4 text-gray-400" /> Kommentarer
          {assignment.comments.length > 0 && <span className="text-xs text-gray-400">· {assignment.comments.length}</span>}
        </h2>

        {/* Comment thread */}
        {assignment.comments.length > 0 && (
          <div className="space-y-3 divide-y divide-gray-50 mb-4">
            {assignment.comments.map((c) => {
              const idx = memberIdx(c.authorId, members);
              const col = idx >= 0 ? memberColor(idx) : null;
              const isOwn = c.authorId === currentUser?.id;
              return (
                <div key={c.id} className="pt-3 first:pt-0 flex gap-2.5 group/comment">
                  {idx >= 0 && col ? (
                    <div className={`w-6 h-6 ${col.bg} rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5`}>
                      {initials(c.authorName)}
                    </div>
                  ) : <div className="w-6 h-6 rounded-full bg-gray-200 shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-700">{c.authorName}</span>
                      <span className="text-[10px] text-gray-300">{relTime(c.createdAt)}</span>
                      {isOwn && (
                        <button onClick={() => deleteAssignmentComment(assignment.id, c.id)}
                          className="ml-auto opacity-0 group-hover/comment:opacity-100 text-gray-300 hover:text-red-400 transition-all">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 leading-snug">{c.content}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add comment */}
        {currentUser && (
          <form onSubmit={handleAddComment} className="flex gap-2 items-end">
            <div className={`w-6 h-6 ${memberColor(memberIdx(currentUser.id, members)).bg} rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 mb-1`}>
              {initials(currentUser.name)}
            </div>
            <textarea placeholder="Skriv en kommentar…" value={newComment}
              onChange={(e) => setNewComment(e.target.value)} rows={2}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-300 resize-none"
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleAddComment(e as unknown as React.FormEvent);
              }}
            />
            <button type="submit" disabled={!newComment.trim()}
              className="px-3 py-2 bg-gray-900 text-white text-xs font-medium rounded-xl disabled:opacity-40 hover:bg-gray-800 transition-colors">
              Send
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
