import type { ScheduleEvent } from '@/types';

function parseICSDate(value: string): string {
  const v = value.trim();
  // DATE-only: YYYYMMDD
  if (v.length === 8) {
    return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}T00:00:00`;
  }
  // DATETIME: YYYYMMDDTHHMMSS[Z]
  const isUTC = v.endsWith('Z');
  const dt = v.replace('Z', '');
  const iso = `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}T${dt.slice(9, 11)}:${dt.slice(11, 13)}:${dt.slice(13, 15)}${isUTC ? 'Z' : ''}`;
  return iso;
}

interface RawProp {
  name: string;
  value: string;
}

function parseProps(block: string): Map<string, string> {
  const map = new Map<string, string>();
  // Unfold continuation lines
  const unfolded = block.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  for (const line of unfolded.split(/\r?\n/)) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const rawName = line.slice(0, colon).toUpperCase();
    const value = line.slice(colon + 1).trim();
    // Strip parameters (e.g. DTSTART;TZID=...) — use base name only
    const name = rawName.split(';')[0];
    if (!map.has(name)) map.set(name, value);
  }
  return map;
}

export function parseICS(text: string): ScheduleEvent[] {
  const events: ScheduleEvent[] = [];
  // Split into VEVENT blocks
  const veventRegex = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g;
  let match: RegExpExecArray | null;

  while ((match = veventRegex.exec(text)) !== null) {
    const props = parseProps(match[1]);
    const summary = props.get('SUMMARY') ?? '';
    const dtstart = props.get('DTSTART');
    const dtend = props.get('DTEND') ?? props.get('DTSTART');
    const location = props.get('LOCATION');
    const uid = props.get('UID') ?? `ics-${Math.random().toString(36).slice(2)}`;

    if (!dtstart || !summary) continue;

    try {
      events.push({
        id: `ics-${uid}`,
        title: summary,
        start: parseICSDate(dtstart),
        end: parseICSDate(dtend!),
        ...(location ? { location } : {}),
      });
    } catch {
      // Skip unparseable events
    }
  }

  return events.sort((a, b) => a.start.localeCompare(b.start));
}
