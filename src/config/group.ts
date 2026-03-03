export const GROUP_PROFILE = {
  name: 'HA(it) Studiegruppe',
  program: 'HA(it) på CBS',
  members: ['Kasper', 'Hjalte', 'Hubert', 'Magnus'],
} as const;

export const MEMBER_OPTIONS = [...GROUP_PROFILE.members];

export const STANDARD_DOCUMENT_TAGS = ['mappe', 'slides', 'noter', 'aflevering', 'eksamen'] as const;

export const MEETING_DEFAULTS = {
  title: 'Ugentligt gruppemøde',
  weekday: 2, // tirsdag
  hour: 16,
  minute: 0,
  location: 'CBS Library',
} as const;
