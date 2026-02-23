# D2L Grading Helper — Browser Extension (Multi-file)

A Chrome/Edge extension that adds a floating **Grading Helper** panel to D2L evaluation pages at **sd63.onlinelearningbc.com**.

---

## File structure

```
d2l-grading-helper/
├── manifest.json          ← extension config: matches, permissions, file load order
├── content/
│   ├── utils.js           ← pure helpers: uuid, escapeHtml, formatToday, findInAllShadowRoots
│   ├── config.js          ← global state, localStorage persistence, data migration, getters
│   ├── tinymce.js         ← locating TinyMCE iframes and writing HTML into Overall Feedback
│   ├── detection.js       ← auto-detect course/assignment from page title; get student name
│   ├── csv.js             ← master CSV export, import, parse, and merge/replace logic
│   ├── modals.js          ← reusable modals: signature config, generic list editor
│   └── panel.js           ← floating panel UI, all event wiring, feedback/email builders
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

Content scripts share a single isolated scope — they run sequentially in the order
listed in `manifest.json`, so later files can call functions defined in earlier ones.
No bundler or build step is required.

---

## Installation

### Chrome / Edge (Developer Mode)

1. **Download** this repo:
   - Click **Code → Download ZIP** and unzip, or
   - `git clone https://github.com/YOUR_USERNAME/d2l-grading-helper.git`

2. Open **chrome://extensions** (or **edge://extensions**)

3. Toggle **Developer mode** on (top-right)

4. Click **Load unpacked** → select the `d2l-grading-helper` folder

5. Navigate to any D2L evaluation page — the panel will appear.

### Updating after a `git pull`

Click the **↻ reload** icon on the extension card at chrome://extensions.

---

## Pushing to GitHub (first time)

```bash
cd d2l-grading-helper
git init
git add .
git commit -m "Initial commit: D2L Grading Helper v3.5.0"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/d2l-grading-helper.git
git push -u origin main
```

### Future updates

```bash
git add .
git commit -m "Describe what changed"
git push
```

---

## Data & Privacy

Everything is stored in `localStorage` for the `sd63.onlinelearningbc.com` origin only.
Nothing is transmitted externally.
