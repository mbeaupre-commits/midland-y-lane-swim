#!/usr/bin/env python3
"""
Midland YMCA — Lane Swim, for SwiftBar (https://swiftbar.app).

Setup:
1. Install SwiftBar (brew install --cask swiftbar), point it at any plugin
   folder.
2. Copy this file into that folder, keep the ".5m.py" suffix (that's how
   SwiftBar reads the 5-minute refresh interval) and `chmod +x` it.
3. Edit SCHEDULE_URL below.

Uses only the Python 3 standard library that ships with macOS — nothing to
pip install.
"""

import json
import urllib.request
from datetime import datetime, timedelta

SCHEDULE_URL = "https://mbeaupre-commits.github.io/midland-y-lane-swim/schedule.json"

DAY_NAMES = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]


def mins_label(mins: int) -> str:
    h, m = divmod(mins, 60)
    period = "pm" if h >= 12 else "am"
    h = h % 12 or 12
    return f"{h}:{m:02d}{period}"


def upcoming_sessions(schedule, now, count=3):
    results = []
    now_mins = now.hour * 60 + now.minute

    for offset in range(8):
        if len(results) >= count:
            break
        d = now + timedelta(days=offset)
        day_name = DAY_NAMES[d.weekday()]
        for s in schedule.get(day_name, []):
            if offset == 0 and s["endMins"] <= now_mins:
                continue
            label = "Today" if offset == 0 else "Tomorrow" if offset == 1 else d.strftime("%a")
            results.append((label, s))
            if len(results) >= count:
                break
    return results


def main():
    try:
        with urllib.request.urlopen(SCHEDULE_URL, timeout=10) as resp:
            schedule = json.loads(resp.read())
    except Exception as e:
        print("Lane Swim: error")
        print("---")
        print(f"Couldn't load schedule: {e}")
        return

    upcoming = upcoming_sessions(schedule, datetime.now())

    if not upcoming:
        print("🏊 no sessions found")
        return

    label, first = upcoming[0]
    print(f"🏊 {label} {first['start']}–{first['end']}")
    print("---")
    print("Midland Y — Lane Swim")
    print("---")
    for label, s in upcoming:
        shared = "  (shared)" if s.get("shared") else ""
        print(f"{label}: {s['start']}–{s['end']}{shared}")


if __name__ == "__main__":
    main()
