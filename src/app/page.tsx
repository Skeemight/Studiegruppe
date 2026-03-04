'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/store/AppContext';
import { GROUP_PROFILE } from '@/config/group';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { UpcomingTasks } from '@/components/dashboard/UpcomingTasks';
import { NextExam } from '@/components/dashboard/NextExam';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { MeetingForm } from '@/components/meetings/MeetingForm';
import {
  CheckSquare,
  Clock,
  BookOpen,
  FileText,
  Users,
  ArrowRight,
  CalendarClock,
  ShieldAlert,
  Plus,
} from 'lucide-react';

const QUICK_LINKS = [
  { href: '/fag', label: 'Fag' },
  { href: '/tasks', label: 'Opgaver' },
  { href: '/focus', label: 'Ugefokus' },
  { href: '/calendar', label: 'Tidslinje' },
  { href: '/meetings', label: 'Møder' },
  { href: '/notes', label: 'Noter' },
  { href: '/documents', label: 'Dokumenter' },
  { href: '/exams', label: 'Eksamener' },
];

function getNextMonday(): Date {
  const d = new Date();
  d.setHours(10, 0, 0, 0);
  const day = d.getDay();
  const daysUntil = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
  d.setDate(d.getDate() + daysUntil);
  return d;
}

export default function DashboardPage() {
  const { tasks, exams, documents, courses, meetings, addMeeting } = useApp();
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const members = GROUP_PROFILE.members;

  const now = new Date();
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === 'done').length;
  const openTasks = tasks.filter((t) => t.status !== 'done').length;
  const upcomingExams = exams.filter((e) => new Date(e.date) >= now).length;
  const overdueTasks = tasks.filter(
    (task) => task.status !== 'done' && new Date(task.deadline) < now
  ).length;

  const sevenDaysAhead = new Date(now);
  sevenDaysAhead.setDate(sevenDaysAhead.getDate() + 7);

  const nextSevenDaysTasks = tasks
    .filter((task) => {
      if (task.status === 'done') return false;
      const deadline = new Date(task.deadline);
      return deadline >= now && deadline <= sevenDaysAhead;
    })
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 6);

  const loadByMember = members.map((member) => ({
    member,
    count: tasks.filter((task) => task.status !== 'done' && task.assignedTo === member).length,
  }));

  const unassignedCount = tasks.filter((task) => task.status !== 'done' && !task.assignedTo).length;

  const coursesWithoutDocuments = courses.filter(
    (course) => !documents.some((doc) => doc.courseId === course.id)
  ).length;

  const coursesWithoutFolderLink = courses.filter((course) => {
    const courseDocs = documents.filter((doc) => doc.courseId === course.id);
    return !courseDocs.some((doc) => doc.tags.some((tag) => tag.toLowerCase() === 'mappe'));
  }).length;

  const docsWithoutTags = documents.filter((doc) => doc.tags.length === 0).length;

  const nextMeeting = meetings
    .filter((meeting) => new Date(meeting.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  const lastLocation = [...meetings]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.location ?? '';

  const meetingDefaults = {
    id: '',
    title: 'Ugentligt gruppemøde',
    date: getNextMonday().toISOString(),
    location: lastLocation,
    agenda: [],
    decisions: [],
  };

  const meetingAgenda = [
    ...(nextMeeting?.agenda ?? []),
    ...(overdueTasks > 0 ? [`Gennemgå ${overdueTasks} overskredne opgaver`] : []),
    ...(unassignedCount > 0 ? [`Fordel ${unassignedCount} ikke-tildelte opgaver`] : []),
  ].slice(0, 5);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{GROUP_PROFILE.name}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Centralt overblik for {GROUP_PROFILE.program} med {members.length} medlemmer.
          </p>
        </div>
        <Card className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">Dagens fokus</p>
              <p className="text-xs text-gray-500 mt-1">
                Fordel opgaver, hold deadlines og saml alle dokumenter ét sted.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {QUICK_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Opgaver færdige"
          value={`${doneTasks} / ${totalTasks}`}
          icon={<CheckSquare className="w-5 h-5" />}
          color="green"
          href="/tasks"
        />
        <StatsCard
          label="Åbne opgaver"
          value={openTasks}
          icon={<Clock className="w-5 h-5" />}
          color="blue"
          href="/tasks"
        />
        <StatsCard
          label="Kommende eksamener"
          value={upcomingExams}
          icon={<BookOpen className="w-5 h-5" />}
          color="purple"
          href="/exams"
        />
        <StatsCard
          label="Dokumenter"
          value={documents.length}
          icon={<FileText className="w-5 h-5" />}
          color="orange"
          href="/documents"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <UpcomingTasks />
        </div>
        <div>
          <NextExam />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900 text-sm">Arbejdsfordeling</h2>
            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
              <Users className="w-3.5 h-3.5" />
              {members.length} medlemmer
            </span>
          </div>
          <ul className="divide-y divide-gray-50">
            {loadByMember.map(({ member, count }) => (
              <li key={member} className="px-5 py-3 flex items-center justify-between text-sm">
                <span className="text-gray-700">{member}</span>
                <span className="font-semibold text-gray-900">{count}</span>
              </li>
            ))}
            <li className="px-5 py-3 flex items-center justify-between text-sm bg-gray-50/60">
              <span className="text-gray-700">Ikke tildelt</span>
              <span className="font-semibold text-gray-900">{unassignedCount}</span>
            </li>
          </ul>
        </Card>

        <Card>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900 text-sm">Næste 7 dage</h2>
            <Link
              href="/tasks"
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
            >
              Se opgaver <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-5">
            {nextSevenDaysTasks.length === 0 ? (
              <p className="text-sm text-gray-500">Ingen deadlines de næste 7 dage.</p>
            ) : (
              <ul className="space-y-2.5">
                {nextSevenDaysTasks.map((task) => (
                  <li key={task.id} className="text-sm flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {task.url ? (
                        <a href={task.url} target="_blank" rel="noopener noreferrer" className="text-gray-800 font-medium truncate block hover:text-blue-600 hover:underline">
                          {task.title}
                        </a>
                      ) : (
                        <p className="text-gray-800 font-medium truncate">{task.title}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-0.5">{task.assignedTo || 'Ikke tildelt'}</p>
                    </div>
                    <span className="text-xs text-gray-500 shrink-0">
                      {new Date(task.deadline).toLocaleDateString('da-DK', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {overdueTasks > 0 && (
              <p className="mt-4 text-xs font-medium text-red-600">
                {overdueTasks} opgave(r) har overskredet deadline.
              </p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900 text-sm">Ugens mødepanel</h2>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <CalendarClock className="w-3.5 h-3.5" />
                {nextMeeting
                  ? new Date(nextMeeting.date).toLocaleDateString('da-DK', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })
                  : 'Ikke planlagt'}
              </span>
              {nextMeeting ? (
                <Link href="/meetings" className="text-xs font-medium text-blue-600 hover:text-blue-700">
                  Redigér
                </Link>
              ) : (
                <button
                  onClick={() => setShowMeetingForm(true)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Planlæg
                </button>
              )}
            </div>
          </div>
          <div className="p-5 space-y-4">
            {nextMeeting ? (
              <>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{nextMeeting.title}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(nextMeeting.date).toLocaleString('da-DK', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    · {nextMeeting.location}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">Agenda</p>
                  <ul className="space-y-1.5 text-sm text-gray-700">
                    {meetingAgenda.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
                {nextMeeting.decisions.length > 0 && (
                  <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                    Seneste beslutning: {nextMeeting.decisions[0]}
                  </p>
                )}
              </>
            ) : (
              <div className="text-center py-4 space-y-3">
                <p className="text-sm text-gray-500">Ingen møder planlagt endnu.</p>
                <Button size="sm" onClick={() => setShowMeetingForm(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Planlæg møde
                </Button>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900 text-sm">Dashboard health</h2>
            <ShieldAlert className="w-4 h-4 text-gray-400" />
          </div>
          <ul className="divide-y divide-gray-50 text-sm">
            {[
              { label: 'Ikke-tildelte opgaver', value: unassignedCount, href: '/tasks', highlight: false },
              { label: 'Overskredne deadlines', value: overdueTasks, href: '/tasks', highlight: overdueTasks > 0 },
              { label: 'Fag uden dokumenter', value: coursesWithoutDocuments, href: '/documents', highlight: false },
              { label: 'Fag uden mappe-link', value: coursesWithoutFolderLink, href: '/documents', highlight: false },
              { label: 'Dokumenter uden tags', value: docsWithoutTags, href: '/documents', highlight: false },
            ].map(({ label, value, href, highlight }) => (
              <li key={label}>
                <Link href={href} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <span className="text-gray-700">{label}</span>
                  <span className={`font-semibold ${highlight ? 'text-red-600' : 'text-gray-900'}`}>{value}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Modal open={showMeetingForm} onClose={() => setShowMeetingForm(false)} title="Planlæg møde">
        <MeetingForm
          initialMeeting={meetingDefaults}
          submitLabel="Opret møde"
          onSubmit={(meeting) => { addMeeting(meeting); setShowMeetingForm(false); }}
          onCancel={() => setShowMeetingForm(false)}
        />
      </Modal>
    </div>
  );
}
