# Midland Y — Lane Swim schedule

Small public data source powering an iOS (Scriptable) widget and a Mac
(SwiftBar) menu bar item that show the next few upcoming lane swim times at
the Midland YMCA.

`schedule.json` is parsed from the YMCA of Simcoe/Muskoka's official Fall
2026 PDF program schedule (word-position-based parsing of the PDF, not OCR
guesswork — see `scripts_parse.js`). It covers the recurring weekly pattern,
valid September 7 – January 4 per that PDF. Re-run the parser against the
next season's PDF when it's published and push the update.

Served as a static file via GitHub Pages so the iPhone/Mac widgets can fetch
it from anywhere, not just on the home network.
