Place these image files here (in `public/`) before deploying — they're referenced by the app
but weren't part of the uploaded index.html (which linked to them as external relative files):

- logo.png              — site logo / PWA icon / exam-screen watermark image
- tanujoy.png           — mentor photo (Tanujoy Mallick)
- prakash.png           — mentor photo (Prakash Sarkar)
- maharup.png           — mentor photo (Maharup Tarafder)
- pranab.png            — mentor photo (Pranab Sadhukhan)

If a mentor photo is missing, the UI falls back to a gold initial-letter avatar automatically
— nothing breaks either way. If logo.png is missing, the exam-screen watermark falls back to a
plain "TCE" text mark (see .watermark-wrap.wm-fallback in src/styles/index.css).
