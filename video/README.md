# How the demo video was made

Watch it: https://youtu.be/4DXQQ04w0ao (2:55). The file is `kovenra-demo.mp4`, captions in `kovenra-demo.srt`, transcript in [TRANSCRIPT.md](TRANSCRIPT.md).

Every shot is the real site, recorded in a browser, not a mockup.

| Step | File | What it does |
|---|---|---|
| Script | `script.json` | 12 scenes: the narration line and the page actions for each |
| Voice | `tts.py` | Generates the narration with a Nigerian English neural voice (edge-tts, `en-NG-EzinneNeural`) and keeps per-sentence timings for captions |
| Recording | `record.py` | Drives the site with Playwright and records each scene with a Chrome DevTools screencast at 1920×1080 |
| Title cards | `cards/` | The intro and outro cards |
| Editing | `assemble.py` | Joins scenes with fades and slides, burns in captions, mixes the voice, and encodes with ffmpeg (H.264, AAC 48 kHz) |

To rebuild after a change, run the steps in that order against a local copy of the app with clean demo data.
