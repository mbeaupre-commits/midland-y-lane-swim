const fs = require('fs');

const html = fs.readFileSync(process.argv[2], 'utf8');

// crude but sufficient page splitter — pdftotext -bbox wraps each page in <page ...>...</page>
const pageBlocks = html.split(/<page /).slice(1).map(s => '<page ' + s);

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

function parseWords(block) {
  const words = [];
  const re = /<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g;
  let m;
  while ((m = re.exec(block))) {
    words.push({
      xMin: +m[1], yMin: +m[2], xMax: +m[3], yMax: +m[4],
      text: m[5].replace(/&amp;/g, '&'),
    });
  }
  return words;
}

function to24h(hour, minute, period) {
  let h = hour % 12;
  if (period === 'pm') h += 12;
  return h * 60 + minute;
}

function parseTimeRangeToken(token) {
  // e.g. "6:15-9:00am" or "11:15-12:15pm"
  const m = token.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})(am|pm)$/i);
  if (!m) return null;
  const [, sh, sm, eh, em, endPeriod] = m;
  const startHour = +sh, startMin = +sm, endHour = +eh, endMin = +em;
  const period = endPeriod.toLowerCase();

  // Try same period as end first, then the other, keep whichever gives a
  // sane (0, 4h] duration — handles the unmarked start time correctly
  // whether or not it crosses noon.
  for (const startPeriod of [period, period === 'am' ? 'pm' : 'am']) {
    const startMins = to24h(startHour, startMin, startPeriod);
    let endMins = to24h(endHour, endMin, period);
    const duration = endMins - startMins;
    if (duration > 0 && duration <= 4 * 60) {
      return { startMins, endMins, startPeriod, endPeriod: period };
    }
  }
  return null;
}

function minsToLabel(mins) {
  let h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h >= 12 ? 'pm' : 'am';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')}${period}`;
}

const schedule = {};

for (const block of pageBlocks) {
  const words = parseWords(block);
  const dayWord = words.find(w => DAYS.includes(w.text));
  if (!dayWord) continue;
  const day = dayWord.text;

  const laneSwimLabels = [];
  for (let i = 0; i < words.length; i++) {
    if (words[i].text === 'Lane') {
      const next = words[i + 1];
      if (next && next.text === 'Swim' && Math.abs(next.yMin - words[i].yMin) < 1 && next.xMin > words[i].xMax) {
        laneSwimLabels.push({
          xCenter: (words[i].xMin + next.xMax) / 2,
          yBottom: next.yMax,
          shared: false,
        });
      }
    }
    if (words[i].text === 'Lane/Leisure') {
      const label = words[i];
      const labelCenter = (label.xMin + label.xMax) / 2;
      const swimBelow = words.find(w =>
        w.text === 'Swim' &&
        w.yMin > label.yMax - 1 && w.yMin < label.yMax + 8 &&
        Math.abs((w.xMin + w.xMax) / 2 - labelCenter) < 20
      );
      if (swimBelow) {
        laneSwimLabels.push({
          xCenter: (label.xMin + label.xMax) / 2,
          yBottom: swimBelow.yMax,
          shared: true,
        });
      }
    }
  }

  const timeTokens = words
    .map(w => ({ ...w, parsed: parseTimeRangeToken(w.text) }))
    .filter(w => w.parsed);

  const sessions = [];
  for (const label of laneSwimLabels) {
    let best = null;
    let bestDist = Infinity;
    for (const t of timeTokens) {
      const tCenter = (t.xMin + t.xMax) / 2;
      if (Math.abs(tCenter - label.xCenter) > 20) continue;
      if (t.yMin < label.yBottom) continue;
      const dist = t.yMin - label.yBottom;
      if (dist < bestDist) { bestDist = dist; best = t; }
    }
    if (best && bestDist < 20) {
      sessions.push({
        start: minsToLabel(best.parsed.startMins),
        end: minsToLabel(best.parsed.endMins),
        startMins: best.parsed.startMins,
        endMins: best.parsed.endMins,
        shared: label.shared,
      });
    }
  }

  // de-dupe identical sessions (safety net, shouldn't normally trigger) and sort by start time
  const seen = new Set();
  schedule[day] = sessions
    .filter(s => {
      const key = `${s.startMins}-${s.endMins}-${s.shared}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.startMins - b.startMins);
}

console.log(JSON.stringify(schedule, null, 2));
