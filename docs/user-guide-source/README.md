# User guide source

`guide.html` is the source of `../FaceTrack-User-Guide.pdf`. The PNGs are real
screenshots captured from the live deployment.

To edit the guide, change `guide.html`, then re-render it to PDF with headless
Chrome:

```bash
# from the project root, with Chrome installed
npx playwright@1.62.1 install-deps 2>/dev/null   # not needed on macOS
node docs/user-guide-source/render.mjs
```

Or print it by hand: open `guide.html` in Chrome, press ⌘P, choose
**Save as PDF**, paper size **A4**, margins **Custom (17/16/20/16 mm)**, and
tick **Background graphics**.
