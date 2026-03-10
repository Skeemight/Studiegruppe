'use client';

import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useApp } from '@/store/AppContext';
import {
  Plus, Check, Trash2, ChevronRight, Clock, MapPin, Users,
  CheckSquare, Calendar, X, Copy, ExternalLink, ChevronDown, ChevronUp,
  Pencil, Vote, UserCheck,
} from 'lucide-react';
import type { GroupAssignment, GroupMeeting, User } from '@/types';

// ── Constants ─────────────────────────────────────────────────────────────────

const MEMBER_COLORS = [
  { bg: 'bg-blue-400', light: 'bg-blue-50', text: 'text-blue-700', hex: '#60a5fa' },
  { bg: 'bg-emerald-400', light: 'bg-emerald-50', text: 'text-emerald-700', hex: '#34d399' },
  { bg: 'bg-violet-400', light: 'bg-violet-50', text: 'text-violet-700', hex: '#a78bfa' },
  { bg: 'bg-amber-400', light: 'bg-amber-50', text: 'text-amber-700', hex: '#fbbf24' },
  { bg: 'bg-pink-400', light: 'bg-pink-50', text: 'text-pink-700', hex: '#f472b6' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function memberColor(index: number) { return MEMBER_COLORS[index % MEMBER_COLORS.length]; }

function memberIndex(userId: string, members: User[]): number {
  return members.findIndex((m) => m.id === userId);
}

function initials(name: string): string {
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

function fmtDateLong(isoDate: string): string {
  return new Date(isoDate + 'T12:00:00').toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' });
}

function deadlineLabel(isoDate: string): { label: string; cls: string } {
  const d = daysUntil(isoDate);
  if (d < 0) return { label: `${Math.abs(d)}d over`, cls: 'text-red-500' };
  if (d === 0) return { label: 'I dag', cls: 'text-orange-500' };
  if (d === 1) return { label: 'I morgen', cls: 'text-amber-500' };
  if (d <= 7) return { label: `Om ${d} dage`, cls: 'text-gray-500' };
  return { label: fmtDate(isoDate), cls: 'text-gray-400' };
}

function meetingDatetime(m: GroupMeeting): Date {
  return new Date(`${m.date}T${m.startTime}:00`);
}

function fmtMeetingTime(m: GroupMeeting): string {
  return `${m.startTime}–${m.endTime}`;
}

// ── Member avatar ─────────────────────────────────────────────────────────────

function MemberAvatar({ name, idx, size = 'sm', title }: { name: string; idx: number; size?: 'sm' | 'md' | 'lg'; title?: string }) {
  const col = memberColor(idx);
  const cls = size === 'lg' ? 'w-10 h-10 text-sm' : size === 'md' ? 'w-8 h-8 text-xs' : 'w-6 h-6 text-[10px]';
  return (
    <div title={title ?? name} className={`${cls} ${col.bg} rounded-full flex items-center justify-center text-white font-bold shrink-0`}>
      {initials(name)}
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ done, total, className }: { done: number; total: number; className?: string }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className={`h-1.5 bg-gray-100 rounded-full overflow-hidden ${className ?? ''}`}>
      <div
        className="h-full bg-emerald-400 rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Assignment card (Overblik + Afleveringer list) ────────────────────────────

function AssignmentCard({ assignment, members }: { assignment: GroupAssignment; members: User[] }) {
  const done = assignment.tasks.filter((t) => t.status === 'done').length;
  const total = assignment.tasks.length;
  const dl = deadlineLabel(assignment.deadline);

  return (
    <Link href={`/studiegruppe/${assignment.id}`}
      className="block bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm transition-shadow group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
            {assignment.title}
          </p>
          {assignment.courseName && (
            <p className="text-xs text-gray-400 mt-0.5">{assignment.courseName}</p>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 shrink-0 mt-0.5 transition-colors" />
      </div>

      <div className="flex items-center justify-between text-xs mb-2">
        <span className={`font-semibold tabular-nums ${dl.cls}`}>{dl.label}</span>
        <span className="text-gray-400 tabular-nums">{done}/{total} {total === 1 ? 'del' : 'dele'}</span>
      </div>

      <ProgressBar done={done} total={total} className="mb-3" />

      {/* Member task completion dots */}
      {members.length > 0 && total > 0 && (
        <div className="flex items-center gap-1.5">
          {members.map((m, idx) => {
            const myTasks = assignment.tasks.filter((t) => t.assigneeId === m.id);
            const myDone = myTasks.filter((t) => t.status === 'done').length;
            const allDone = myTasks.length > 0 && myDone === myTasks.length;
            const col = memberColor(idx);
            return (
              <div key={m.id} title={`${m.name}: ${myDone}/${myTasks.length}`}
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white
                  ${allDone ? col.bg : myTasks.length === 0 ? 'bg-gray-100' : 'bg-gray-200'}`}>
                {allDone ? <Check className="w-2.5 h-2.5" /> : initials(m.name)}
              </div>
            );
          })}
        </div>
      )}
    </Link>
  );
}

// ── Meeting card ──────────────────────────────────────────────────────────────

function MeetingCard({ meeting, members, onClick }: { meeting: GroupMeeting; members: User[]; onClick: () => void }) {
  const isPoll = !!meeting.timePoll;
  const isPast = new Date(`${meeting.date}T${meeting.endTime}:00`) < new Date();
  return (
    <button onClick={onClick}
      className="w-full text-left bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm transition-shadow group">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            {isPoll ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-md">
                <Vote className="w-2.5 h-2.5" /> Afstemning
              </span>
            ) : isPast ? (
              <span className="text-[10px] font-semibold text-gray-300 bg-gray-50 px-1.5 py-0.5 rounded-md">Afholdt</span>
            ) : (
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">Planlagt</span>
            )}
          </div>
          <p className="text-sm font-semibold text-gray-900 truncate">{meeting.title}</p>
          {isPoll ? (
            <p className="text-xs text-gray-400 mt-0.5">{meeting.timePoll!.length} tidspunkter til afstemning</p>
          ) : (
            <p className="text-xs text-gray-400 mt-0.5 capitalize">{fmtDateLong(meeting.date)} · {fmtMeetingTime(meeting)}</p>
          )}
          {meeting.location && (
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3 text-gray-300 shrink-0" />
              <span className="text-xs text-gray-400">{meeting.location}</span>
            </div>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 shrink-0 mt-1 transition-colors" />
      </div>
    </button>
  );
}

// ── ── ── ── SECTIONS ── ── ── ────────────────────────────────────────────────

// ── Overblik ─────────────────────────────────────────────────────────────────

function OverblikSection({ members }: { members: User[] }) {
  const {
    groupAssignments, groupMeetings, groupChecklist,
    groupActivity, addGroupChecklistItem, toggleGroupChecklistItem,
    deleteGroupChecklistItem, currentUser,
  } = useApp();

  const [newItem, setNewItem] = useState('');

  const activeAssignments = useMemo(
    () => groupAssignments.filter((a) => a.status === 'active').sort((a, b) => a.deadline.localeCompare(b.deadline)),
    [groupAssignments]
  );

  const nextMeeting = useMemo(() => {
    const now = new Date();
    return groupMeetings
      .filter((m) => new Date(`${m.date}T${m.endTime}:00`) > now)
      .sort((a, b) => meetingDatetime(a).getTime() - meetingDatetime(b).getTime())[0] ?? null;
  }, [groupMeetings]);

  function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItem.trim() || !currentUser) return;
    addGroupChecklistItem({ text: newItem.trim(), done: false, addedById: currentUser.id, addedByName: currentUser.name });
    setNewItem('');
  }

  const recentActivity = groupActivity.slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Active assignments */}
      {activeAssignments.length > 0 ? (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Aktive afleveringer</h2>
            <Link href="/studiegruppe?tab=afleveringer" className="text-xs text-blue-500 hover:text-blue-700">Se alle</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {activeAssignments.map((a) => <AssignmentCard key={a.id} assignment={a} members={members} />)}
          </div>
        </section>
      ) : (
        <section>
          <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Aktive afleveringer</h2>
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 px-5 py-8 text-center">
            <p className="text-sm text-gray-400">Ingen aktive afleveringer</p>
            <Link href="/studiegruppe?tab=afleveringer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700">
              <Plus className="w-3 h-3" /> Opret aflevering
            </Link>
          </div>
        </section>
      )}

      {/* Next meeting + huskeliste */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Next meeting */}
        <section>
          <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Næste møde</h2>
          {nextMeeting ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-indigo-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{nextMeeting.title}</p>
                  {nextMeeting.timePoll ? (
                    <p className="text-xs text-violet-600 mt-0.5">Afstemning igangværende</p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-0.5 capitalize">{fmtDateLong(nextMeeting.date)}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    {!nextMeeting.timePoll && <span className="tabular-nums">{fmtMeetingTime(nextMeeting)}</span>}
                    {nextMeeting.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />{nextMeeting.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {/* Pre-meeting task completion */}
              {nextMeeting.assignmentId && (() => {
                const assignment = groupAssignments.find((a) => a.id === nextMeeting.assignmentId);
                if (!assignment) return null;
                return (
                  <div className="border-t border-gray-50 pt-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Forberedelse inden mødet</p>
                    <div className="space-y-1.5">
                      {members.map((m, idx) => {
                        const myTasks = assignment.tasks.filter((t) => t.assigneeId === m.id);
                        const myDone = myTasks.filter((t) => t.status === 'done').length;
                        const allDone = myTasks.length > 0 && myDone === myTasks.length;
                        const col = memberColor(idx);
                        return (
                          <div key={m.id} className="flex items-center gap-2">
                            <MemberAvatar name={m.name} idx={idx} />
                            <span className="text-xs text-gray-700 flex-1">{m.name}</span>
                            {myTasks.length === 0 ? (
                              <span className="text-[10px] text-gray-300">Ingen opgaver</span>
                            ) : allDone ? (
                              <span className={`flex items-center gap-1 text-[10px] font-semibold ${col.text}`}>
                                <Check className="w-3 h-3" /> Klar
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-400 tabular-nums">{myDone}/{myTasks.length}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              <Link href="/studiegruppe?tab=moeder"
                className="mt-3 flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700">
                Se alle møder <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 px-5 py-8 text-center">
              <p className="text-sm text-gray-400">Ingen kommende møder</p>
              <Link href="/studiegruppe?tab=moeder"
                className="mt-2 inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700">
                <Plus className="w-3 h-3" /> Planlæg møde
              </Link>
            </div>
          )}
        </section>

        {/* Huskeliste */}
        <section>
          <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Huskeliste</h2>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="space-y-1 mb-3 max-h-52 overflow-y-auto">
              {groupChecklist.length === 0 && (
                <p className="text-xs text-gray-300 py-1">Ingen punkter — tilføj noget her</p>
              )}
              {groupChecklist.map((item) => (
                <div key={item.id} className="flex items-center gap-2 group/item py-0.5">
                  <button onClick={() => toggleGroupChecklistItem(item.id)}
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      item.done ? 'bg-emerald-400 border-emerald-400' : 'border-gray-300 hover:border-emerald-400'
                    }`}>
                    {item.done && <Check className="w-2.5 h-2.5 text-white" />}
                  </button>
                  <span className={`text-xs flex-1 leading-snug ${item.done ? 'line-through text-gray-300' : 'text-gray-700'}`}>
                    {item.text}
                  </span>
                  <button onClick={() => deleteGroupChecklistItem(item.id)}
                    className="opacity-0 group-hover/item:opacity-100 p-0.5 text-gray-300 hover:text-red-400 transition-all">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <form onSubmit={handleAddItem} className="flex gap-2">
              <input
                type="text"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder="Tilføj et punkt…"
                className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-300 placeholder:text-gray-300"
              />
              <button type="submit" disabled={!newItem.trim()}
                className="px-2.5 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium disabled:opacity-40 hover:bg-gray-800 transition-colors">
                <Plus className="w-3 h-3" />
              </button>
            </form>
          </div>
        </section>
      </div>

      {/* Recent activity */}
      {recentActivity.length > 0 && (
        <section>
          <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Seneste aktivitet</h2>
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {recentActivity.map((item) => {
              const idx = memberIndex(item.userId, members);
              return (
                <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                  {idx >= 0 ? (
                    <MemberAvatar name={item.userName} idx={idx} />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-100 shrink-0" />
                  )}
                  <p className="text-xs text-gray-600 flex-1 leading-snug">{item.message}</p>
                  <span className="text-[10px] text-gray-300 tabular-nums shrink-0">
                    {new Date(item.timestamp).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Afleveringer ──────────────────────────────────────────────────────────────

function AfleveringerSection({ members }: { members: User[] }) {
  const { groupAssignments, addGroupAssignment, updateGroupAssignment, courses, currentUser } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [filterCourse, setFilterCourse] = useState('');
  const [showArchive, setShowArchive] = useState(false);
  const [form, setForm] = useState({ title: '', courseId: '', deadline: '', description: '' });

  const active = useMemo(
    () => groupAssignments
      .filter((a) => a.status === 'active' && (!filterCourse || a.courseId === filterCourse))
      .sort((a, b) => a.deadline.localeCompare(b.deadline)),
    [groupAssignments, filterCourse]
  );

  const completed = useMemo(
    () => groupAssignments.filter((a) => a.status === 'completed').sort((a, b) => b.deadline.localeCompare(a.deadline)),
    [groupAssignments]
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.deadline || !currentUser) return;
    const course = courses.find((c) => c.id === form.courseId);
    addGroupAssignment({
      title: form.title.trim(),
      courseId: form.courseId,
      courseName: course?.name ?? '',
      deadline: form.deadline,
      description: form.description.trim() || undefined,
      createdById: currentUser.id,
    });
    setForm({ title: '', courseId: '', deadline: '', description: '' });
    setShowForm(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          Afleveringer · {active.length} aktive
        </h2>
        <button onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-xl hover:bg-gray-800 transition-colors">
          <Plus className="w-3 h-3" /> Ny aflevering
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Ny gruppeaflevering</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input type="text" placeholder="Titel *" value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-300" />
            <div className="grid grid-cols-2 gap-3">
              <select value={form.courseId} onChange={(e) => setForm((f) => ({ ...f, courseId: e.target.value }))}
                className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-300 bg-white">
                <option value="">Intet fag</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input type="date" value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-300" />
            </div>
            <textarea placeholder="Beskrivelse (valgfrit)" value={form.description} rows={2}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-300 resize-none" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors">Annuller</button>
              <button type="submit" disabled={!form.title.trim() || !form.deadline}
                className="px-4 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-xl disabled:opacity-40 hover:bg-gray-800 transition-colors">
                Opret
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Course filter */}
      {courses.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setFilterCourse('')}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${!filterCourse ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-500 hover:border-gray-400'}`}>
            Alle
          </button>
          {courses.map((c) => (
            <button key={c.id} onClick={() => setFilterCourse(c.id === filterCourse ? '' : c.id)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${filterCourse === c.id ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-500 hover:border-gray-400'}`}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Active list */}
      {active.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 px-5 py-10 text-center">
          <p className="text-sm text-gray-400">Ingen aktive afleveringer</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {active.map((a) => (
            <div key={a.id} className="relative group/card">
              <AssignmentCard assignment={a} members={members} />
              <button
                onClick={() => updateGroupAssignment(a.id, { status: 'completed' })}
                title="Marker som færdig"
                className="absolute top-3 right-8 opacity-0 group-hover/card:opacity-100 p-1 rounded-lg text-gray-300 hover:text-emerald-500 hover:bg-emerald-50 transition-all">
                <CheckSquare className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Archive */}
      {completed.length > 0 && (
        <div>
          <button onClick={() => setShowArchive((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-2">
            {showArchive ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            Arkiv · {completed.length} færdige
          </button>
          {showArchive && (
            <div className="space-y-2">
              {completed.map((a) => {
                const dl = deadlineLabel(a.deadline);
                return (
                  <div key={a.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-2.5 opacity-60">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-600 truncate">{a.title}</p>
                      {a.courseName && <p className="text-xs text-gray-400">{a.courseName}</p>}
                    </div>
                    <span className={`text-xs tabular-nums ${dl.cls}`}>{dl.label}</span>
                    <button onClick={() => updateGroupAssignment(a.id, { status: 'active' })}
                      className="text-xs text-gray-300 hover:text-gray-600 transition-colors ml-2">
                      Genåbn
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Møder ─────────────────────────────────────────────────────────────────────

function MoederSection({ members }: { members: User[] }) {
  const { groupMeetings, groupAssignments, addGroupMeeting, updateGroupMeeting, deleteGroupMeeting, voteTimePoll, confirmTimePoll, currentUser } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<GroupMeeting | null>(null);
  const [usePoll, setUsePoll] = useState(false);
  const [pollSlots, setPollSlots] = useState([{ date: '', startTime: '', endTime: '' }]);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [form, setForm] = useState({
    title: '', date: '', startTime: '10:00', endTime: '12:00',
    location: '', assignmentId: '', description: '',
  });

  const upcoming = useMemo(
    () => groupMeetings.filter((m) => new Date(`${m.date}T${m.endTime}:00`) >= new Date())
      .sort((a, b) => meetingDatetime(a).getTime() - meetingDatetime(b).getTime()),
    [groupMeetings]
  );
  const past = useMemo(
    () => groupMeetings.filter((m) => new Date(`${m.date}T${m.endTime}:00`) < new Date())
      .sort((a, b) => meetingDatetime(b).getTime() - meetingDatetime(a).getTime()),
    [groupMeetings]
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !currentUser) return;
    if (!usePoll && !form.date) return;
    const slots = pollSlots.filter((s) => s.date && s.startTime && s.endTime);
    const firstSlot = usePoll ? slots[0] : null;
    addGroupMeeting({
      title: form.title.trim(),
      date: usePoll ? (firstSlot?.date ?? '') : form.date,
      startTime: usePoll ? (firstSlot?.startTime ?? '00:00') : form.startTime,
      endTime: usePoll ? (firstSlot?.endTime ?? '00:00') : form.endTime,
      location: form.location.trim(),
      assignmentId: form.assignmentId || undefined,
      description: form.description.trim() || undefined,
      timePoll: usePoll && slots.length > 0 ? slots.map((s) => ({ id: Math.random().toString(36).slice(2), ...s, votes: [] })) : undefined,
      createdById: currentUser.id,
    });
    setForm({ title: '', date: '', startTime: '10:00', endTime: '12:00', location: '', assignmentId: '', description: '' });
    setPollSlots([{ date: '', startTime: '', endTime: '' }]);
    setUsePoll(false);
    setShowForm(false);
  }

  // Keep selectedMeeting in sync with state
  const liveSelected = selectedMeeting ? (groupMeetings.find((m) => m.id === selectedMeeting.id) ?? null) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Møder · {upcoming.length} kommende</h2>
        <button onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-xl hover:bg-gray-800 transition-colors">
          <Plus className="w-3 h-3" /> Planlæg møde
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Planlæg møde</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input type="text" placeholder="Mødets navn *" value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-300" />

            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={usePoll} onChange={(e) => setUsePoll(e.target.checked)}
                className="rounded text-blue-500" />
              Foreslå tidspunkter til afstemning
            </label>

            {usePoll ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-medium">Tidspunktsforslag</p>
                {pollSlots.map((slot, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2 items-center">
                    <input type="date" value={slot.date}
                      onChange={(e) => setPollSlots((prev) => prev.map((s, j) => j === i ? { ...s, date: e.target.value } : s))}
                      className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-blue-300" />
                    <input type="time" value={slot.startTime}
                      onChange={(e) => setPollSlots((prev) => prev.map((s, j) => j === i ? { ...s, startTime: e.target.value } : s))}
                      className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-blue-300" />
                    <div className="flex gap-1">
                      <input type="time" value={slot.endTime}
                        onChange={(e) => setPollSlots((prev) => prev.map((s, j) => j === i ? { ...s, endTime: e.target.value } : s))}
                        className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-blue-300" />
                      {i > 0 && (
                        <button type="button" onClick={() => setPollSlots((prev) => prev.filter((_, j) => j !== i))}
                          className="text-gray-300 hover:text-red-400">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {pollSlots.length < 3 && (
                  <button type="button" onClick={() => setPollSlots((prev) => [...prev, { date: '', startTime: '10:00', endTime: '12:00' }])}
                    className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700">
                    <Plus className="w-3 h-3" /> Tilføj tidspunkt
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <input type="date" value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-300" />
                <div className="flex gap-2 items-center">
                  <input type="time" value={form.startTime}
                    onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                    className="flex-1 px-2.5 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-300" />
                  <span className="text-gray-400 text-sm">–</span>
                  <input type="time" value={form.endTime}
                    onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                    className="flex-1 px-2.5 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-300" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <input type="text" placeholder="Lokale / Zoom / Adresse" value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-300" />
              <select value={form.assignmentId} onChange={(e) => setForm((f) => ({ ...f, assignmentId: e.target.value }))}
                className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-300 bg-white">
                <option value="">Ingen tilknyttet aflevering</option>
                {groupAssignments.filter((a) => a.status === 'active').map((a) => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
            </div>
            <textarea placeholder="Dagsorden / beskrivelse (valgfrit)" value={form.description} rows={2}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-300 resize-none" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setShowForm(false); setUsePoll(false); }}
                className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors">Annuller</button>
              <button type="submit" disabled={!form.title.trim()}
                className="px-4 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-xl disabled:opacity-40 hover:bg-gray-800 transition-colors">
                Opret
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Meeting list + detail panel */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 space-y-2">
          {upcoming.length === 0 && past.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 px-5 py-10 text-center">
              <p className="text-sm text-gray-400">Ingen møder planlagt</p>
            </div>
          )}
          {upcoming.map((m) => (
            <MeetingCard key={m.id} meeting={m} members={members}
              onClick={() => setSelectedMeeting(m)} />
          ))}
          {past.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-300 uppercase tracking-wide mb-2 mt-3">Afholdte</p>
              {past.map((m) => (
                <MeetingCard key={m.id} meeting={m} members={members}
                  onClick={() => setSelectedMeeting(m)} />
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {liveSelected && (
          <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Mødedetaljer</p>
                <h3 className="text-base font-bold text-gray-900 mt-0.5">{liveSelected.title}</h3>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => { deleteGroupMeeting(liveSelected.id); setSelectedMeeting(null); }}
                  className="p-1.5 text-gray-300 hover:text-red-400 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setSelectedMeeting(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Time poll or confirmed time */}
            {liveSelected.timePoll ? (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Afstemning om tidspunkt</p>
                <div className="space-y-2">
                  {liveSelected.timePoll.map((slot) => {
                    const hasVoted = currentUser ? slot.votes.includes(currentUser.id) : false;
                    const isCreator = currentUser?.id === liveSelected.createdById;
                    return (
                      <div key={slot.id} className="border border-gray-100 rounded-xl px-3 py-2.5">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-xs font-semibold text-gray-800 capitalize">{fmtDateLong(slot.date)}</p>
                            <p className="text-xs text-gray-400 tabular-nums">{slot.startTime}–{slot.endTime}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {isCreator && (
                              <button onClick={() => confirmTimePoll(liveSelected.id, slot.id)}
                                className="text-xs px-2 py-1 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
                                Bekræft
                              </button>
                            )}
                            {currentUser && (
                              <button onClick={() => voteTimePoll(liveSelected.id, slot.id, currentUser.id)}
                                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-colors ${hasVoted ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-500 hover:border-blue-200'}`}>
                                {hasVoted ? <Check className="w-3 h-3" /> : <Vote className="w-3 h-3" />}
                                Kan jeg
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {members.map((m, idx) => {
                            const voted = slot.votes.includes(m.id);
                            return (
                              <div key={m.id} title={`${m.name}: ${voted ? 'kan' : 'ikke svaret'}`}
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white transition-opacity ${voted ? memberColor(idx).bg : 'bg-gray-200 opacity-40'}`}>
                                {initials(m.name)}
                              </div>
                            );
                          })}
                          <span className="text-xs text-gray-400 ml-1">{slot.votes.length}/{members.length}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-300" />
                  <span className="capitalize">{fmtDateLong(liveSelected.date)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-gray-300" />
                  <span className="tabular-nums">{fmtMeetingTime(liveSelected)}</span>
                </div>
                {liveSelected.location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-gray-300" />
                    <span>{liveSelected.location}</span>
                  </div>
                )}
              </div>
            )}

            {/* Linked assignment task status */}
            {liveSelected.assignmentId && (() => {
              const a = groupAssignments.find((x) => x.id === liveSelected.assignmentId);
              if (!a) return null;
              return (
                <div className="border border-gray-100 rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Tilknyttet: {a.title}
                  </p>
                  <div className="space-y-1.5">
                    {members.map((m, idx) => {
                      const myTasks = a.tasks.filter((t) => t.assigneeId === m.id);
                      const myDone = myTasks.filter((t) => t.status === 'done').length;
                      const col = memberColor(idx);
                      return (
                        <div key={m.id} className="flex items-center gap-2">
                          <MemberAvatar name={m.name} idx={idx} />
                          <span className="text-xs text-gray-700 flex-1">{m.name}</span>
                          {myTasks.length === 0 ? (
                            <span className="text-[10px] text-gray-300">Ingen opgaver</span>
                          ) : myDone === myTasks.length ? (
                            <span className={`text-[10px] font-semibold ${col.text} flex items-center gap-1`}>
                              <Check className="w-3 h-3" /> Klar
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400 tabular-nums">{myDone}/{myTasks.length} opgaver</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Description */}
            {liveSelected.description && (
              <p className="text-sm text-gray-600 leading-relaxed">{liveSelected.description}</p>
            )}

            {/* Meeting notes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Mødenoter</p>
                <button onClick={() => { setEditingNotes(true); setNotesText(liveSelected.notes); }}
                  className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1">
                  <Pencil className="w-3 h-3" /> Rediger
                </button>
              </div>
              {editingNotes ? (
                <div className="space-y-2">
                  <textarea value={notesText} onChange={(e) => setNotesText(e.target.value)} rows={4}
                    placeholder="Hvad blev aftalt? Hvem gør hvad?"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-300 resize-none" />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingNotes(false)}
                      className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5">Annuller</button>
                    <button onClick={() => { updateGroupMeeting(liveSelected.id, { notes: notesText }); setEditingNotes(false); }}
                      className="px-3 py-1.5 bg-gray-900 text-white text-xs rounded-xl hover:bg-gray-800">Gem</button>
                  </div>
                </div>
              ) : liveSelected.notes ? (
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{liveSelected.notes}</p>
              ) : (
                <p className="text-xs text-gray-300 italic">Ingen noter endnu — klik &quot;Rediger&quot; for at tilføje</p>
              )}
            </div>

            {/* Mark as complete */}
            {liveSelected.status === 'planned' && (
              <button onClick={() => updateGroupMeeting(liveSelected.id, { status: 'completed' })}
                className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-800 transition-colors">
                <Check className="w-3.5 h-3.5" /> Marker møde som afholdt
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Medlemmer ─────────────────────────────────────────────────────────────────

function MedlemmerSection({ members }: { members: User[] }) {
  const { groupAssignments, memberAvailability, setMemberAvailability, currentGroup, currentUser } = useApp();
  const [copied, setCopied] = useState(false);
  const [editingAvailability, setEditingAvailability] = useState(false);
  const [availText, setAvailText] = useState('');

  function copyInviteCode() {
    if (!currentGroup?.inviteCode) return;
    navigator.clipboard.writeText(currentGroup.inviteCode).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-6">
      <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
        Gruppemedlemmer · {members.length}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {members.map((m, idx) => {
          const col = memberColor(idx);
          const myTasks = groupAssignments.flatMap((a) => a.tasks.filter((t) => t.assigneeId === m.id));
          const done = myTasks.filter((t) => t.status === 'done').length;
          const active = myTasks.filter((t) => t.status !== 'done').length;
          const avail = memberAvailability.find((a) => a.userId === m.id);
          const isMe = currentUser?.id === m.id;

          return (
            <div key={m.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center gap-3 mb-3">
                <MemberAvatar name={m.name} idx={idx} size="lg" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{m.name} {isMe && <span className="text-xs text-gray-400">(dig)</span>}</p>
                  {m.email && <p className="text-xs text-gray-400 truncate">{m.email}</p>}
                </div>
              </div>

              {/* Workload */}
              <div className="flex items-center gap-4 mb-3">
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">{active}</p>
                  <p className="text-[10px] text-gray-400">aktive</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-emerald-500">{done}</p>
                  <p className="text-[10px] text-gray-400">færdige</p>
                </div>
                {myTasks.length > 0 && (
                  <div className="flex-1">
                    <ProgressBar done={done} total={myTasks.length} />
                    <p className="text-[10px] text-gray-400 mt-1 text-right tabular-nums">{done}/{myTasks.length}</p>
                  </div>
                )}
              </div>

              {/* Availability */}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Tilgængelighed</p>
                {isMe && editingAvailability ? (
                  <div className="space-y-1.5">
                    <input type="text" value={availText}
                      onChange={(e) => setAvailText(e.target.value)}
                      placeholder="f.eks. Man–ons eftermiddag, fre hele dagen"
                      className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-300" />
                    <div className="flex gap-2">
                      <button onClick={() => setEditingAvailability(false)} className="text-xs text-gray-400 hover:text-gray-600">Annuller</button>
                      <button onClick={() => { setMemberAvailability(m.id, availText); setEditingAvailability(false); }}
                        className="text-xs text-blue-500 hover:text-blue-700 font-medium">Gem</button>
                    </div>
                  </div>
                ) : avail?.text ? (
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-gray-600">{avail.text}</p>
                    {isMe && (
                      <button onClick={() => { setEditingAvailability(true); setAvailText(avail.text); }}
                        className="text-gray-300 hover:text-gray-500 shrink-0">
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ) : (
                  isMe ? (
                    <button onClick={() => { setEditingAvailability(true); setAvailText(''); }}
                      className="text-xs text-blue-500 hover:text-blue-700">
                      + Tilføj tilgængelighed
                    </button>
                  ) : (
                    <p className="text-xs text-gray-300 italic">Ikke angivet</p>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Invite code */}
      {currentGroup?.inviteCode && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-2">
            <UserCheck className="w-4 h-4 text-gray-400" />
            <p className="text-sm font-semibold text-gray-900">Inviter til gruppen</p>
          </div>
          <p className="text-xs text-gray-500 mb-3">Del denne kode med dine gruppemedlemmer:</p>
          <div className="flex items-center gap-3">
            <span className="font-mono text-2xl font-bold tracking-widest text-gray-900 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
              {currentGroup.inviteCode}
            </span>
            <button onClick={copyInviteCode}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${copied ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Kopieret!' : 'Kopiér'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = 'overblik' | 'afleveringer' | 'moeder' | 'medlemmer';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overblik', label: 'Overblik' },
  { id: 'afleveringer', label: 'Afleveringer' },
  { id: 'moeder', label: 'Møder' },
  { id: 'medlemmer', label: 'Medlemmer' },
];

export default function StudiegruppePage() {
  const { getGroupMembers, groupAssignments } = useApp();
  const [tab, setTab] = useState<Tab>('overblik');
  const members = useMemo(() => getGroupMembers(), [getGroupMembers]);

  // Support ?tab=xxx from navigation links
  if (typeof window !== 'undefined') {
    const urlTab = new URLSearchParams(window.location.search).get('tab') as Tab | null;
    if (urlTab && TABS.some((t) => t.id === urlTab) && urlTab !== tab) {
      setTab(urlTab);
    }
  }

  return (
    <div className="max-w-[780px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-[32px] leading-tight" style={{ color: 'var(--text-primary)' }}>Studiegruppe</h1>
        <p className="font-mono text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          {members.length} medlemmer · {groupAssignments.filter((a) => a.status === 'active').length} aktive afleveringer
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Section content */}
      {tab === 'overblik' && <OverblikSection members={members} />}
      {tab === 'afleveringer' && <AfleveringerSection members={members} />}
      {tab === 'moeder' && <MoederSection members={members} />}
      {tab === 'medlemmer' && <MedlemmerSection members={members} />}
    </div>
  );
}
