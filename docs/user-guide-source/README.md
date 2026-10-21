# User guide source

`guide.html` is the source of `../FaceTrack-User-Guide.pdf`. The PNGs are real
screenshots of the application (1380×880 at 2× scale) running on the seeded
demonstration data (`npm run seed -- --demo`).

To edit the guide, change `guide.html`, then re-render it to PDF with headless
Chrome:

```bash
# from the project root, with Google Chrome installed
node docs/user-guide-source/render.mjs
# Chrome somewhere else?  CHROME_PATH=/path/to/chrome node docs/user-guide-source/render.mjs
```

Or print it by hand: open `guide.html` in Chrome, press ⌘P, choose
**Save as PDF**, paper size **A4**, margins **Custom (17/16/20/16 mm)**, and
tick **Background graphics**.
