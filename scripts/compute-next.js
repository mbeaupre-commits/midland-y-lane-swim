// Runs on a GitHub Actions schedule (see .github/workflows/update-next.yml).
// Computes "what's the next lane swim session, right now" in the pool's own
// timezone and writes it as both plain text and JSON, so watch-side tools
// (Watchsmith, a one-action Shortcut, anything that can just GET a URL) never
// have to do date math themselves — they just display whatever this says.
const fs = require('fs');
const path = require('path');

const TIMEZONE = 'America/Toronto';
const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

const schedule = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'schedule.json'), 'utf8'));

function nowInTimezone() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);

  const get = (type) => parts.find((p) => p.type === type).value;
  const weekday = get('weekday').toUpperCase();
  const hour = Number(get('hour'));
  const minute = Number(get('minute'));
  return { weekday, minsOfDay: hour * 60 + minute };
}

function upcomingSessions(count) {
  const { weekday, minsOfDay } = nowInTimezone();
  const todayIndex = DAY_NAMES.indexOf(weekday);
  const results = [];

  for (let offset = 0; offset < 8 && results.length < count; offset++) {
    const dayName = DAY_NAMES[(todayIndex + offset) % 7];
    const sessions = schedule[dayName] || [];
    for (const s of sessions) {
      if (offset === 0 && s.endMins <= minsOfDay) continue;
      results.push({
        dayLabel: offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : dayName.slice(0, 1) + dayName.slice(1).toLowerCase().slice(0, 2),
        start: s.start,
        end: s.end,
        shared: Boolean(s.shared),
      });
      if (results.length >= count) break;
    }
  }
  return results;
}

const upcoming = upcomingSessions(5);
const outDir = path.join(__dirname, '..');

const text = upcoming.length
  ? upcoming
      .map((s) => `${s.dayLabel} ${s.start}–${s.end}${s.shared ? ' (shared)' : ''}`)
      .join('\n')
  : 'No sessions found';

fs.writeFileSync(path.join(outDir, 'next.txt'), text + '\n');
fs.writeFileSync(
  path.join(outDir, 'next.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), upcoming }, null, 2) + '\n'
);

console.log('next.txt:', text);
