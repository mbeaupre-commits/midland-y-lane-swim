// Midland YMCA — Lane Swim widget (Scriptable)
// Install the free "Scriptable" app from the App Store, paste this whole
// file in as a new script named e.g. "Midland Lane Swim", then long-press
// your home screen -> Add Widget -> Scriptable -> pick this script's name
// as the widget's parameter. Small or medium widget size both work.

const SCHEDULE_URL = "https://mbeaupre-commits.github.io/midland-y-lane-swim/schedule.json";

async function getSchedule() {
  const req = new Request(SCHEDULE_URL);
  return await req.loadJSON();
}

const DAY_NAMES = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

function minsLabel(mins) {
  let h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h >= 12 ? "pm" : "am";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, "0")}${period}`;
}

// Walks forward from right now (today + up to 6 more days) collecting
// upcoming sessions until we have `count`, so it never comes back empty
// even late at night with nothing left today.
function upcomingSessions(schedule, now, count) {
  const results = [];
  const nowMins = now.getHours() * 60 + now.getMinutes();

  for (let offset = 0; offset < 8 && results.length < count; offset++) {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    const dayName = DAY_NAMES[d.getDay()];
    const sessions = schedule[dayName] || [];
    for (const s of sessions) {
      if (offset === 0 && s.endMins <= nowMins) continue; // already over today
      results.push({
        ...s,
        dayLabel: offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : d.toLocaleDateString("en-US", { weekday: "short" }),
      });
      if (results.length >= count) break;
    }
  }
  return results;
}

async function createWidget() {
  const widget = new ListWidget();
  widget.backgroundColor = new Color("#0b3d91");
  widget.setPadding(12, 14, 12, 14);

  const title = widget.addText("Midland Y — Lane Swim");
  title.textColor = Color.white();
  title.font = Font.boldSystemFont(13);
  widget.addSpacer(6);

  try {
    const schedule = await getSchedule();
    const upcoming = upcomingSessions(schedule, new Date(), 3);

    if (upcoming.length === 0) {
      const none = widget.addText("No sessions found.");
      none.textColor = Color.white();
      none.font = Font.systemFont(12);
    }

    for (const s of upcoming) {
      const row = widget.addStack();
      row.centerAlignContent();

      const when = row.addText(`${s.dayLabel}  `);
      when.textColor = new Color("#9fc2ff");
      when.font = Font.mediumSystemFont(13);

      const time = row.addText(`${s.start}–${s.end}`);
      time.textColor = Color.white();
      time.font = Font.boldSystemFont(13);

      if (s.shared) {
        row.addSpacer(4);
        const tag = row.addText("(shared)");
        tag.textColor = new Color("#9fc2ff");
        tag.font = Font.systemFont(10);
      }
      widget.addSpacer(4);
    }
  } catch (e) {
    const err = widget.addText("Couldn't load schedule.");
    err.textColor = Color.white();
    err.font = Font.systemFont(12);
  }

  widget.addSpacer();
  const footer = widget.addText("Fall 2026 schedule");
  footer.textColor = new Color("#6f93c9");
  footer.font = Font.systemFont(9);

  return widget;
}

const widget = await createWidget();
if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentSmall();
}
Script.complete();
