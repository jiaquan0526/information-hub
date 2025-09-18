# Playbook Hub (GitHub Pages Package)

This folder contains a drop-in, static build of your Playbook Hub ready for GitHub Pages.

## Quick Publish (GitHub Pages)
1) Create a new, empty repository on GitHub (e.g., playbook-hub).
2) Upload all files from this github-upload/ folder to the repo root.
3) In your repo: Settings  Pages 
   - Source: Deploy from a branch
   - Branch: main
   - Folder: / (root)
4) Save. After 12 minutes your site will be live at:
   - Project site: https://<your-username>.github.io/<repo-name>/
   - Or user site (if repo is <your-username>.github.io): https://<your-username>.github.io/

## Files Included
- index.html (hub)
- uth.html (login)
- section.html (section view)
- styles.css
- hub-script.js, section-script.js, uth-script.js
- database.js (IndexedDB helpers)
- excel-export.js (XLSX exports)
- logo.svg
- edirect.html, start.html
- .nojekyll (disables Jekyll)
- sample-data.json (optional seed)

## Using Your Sample Data
- Replace sample-data.json with your exported JSON.
- On first load (when the site has no prior data) the app imports:
  - sectionOrder, informationHub, hubUsers, hubActivities
- You can force re-import at any time by visiting:
  - https://<your-username>.github.io/<repo-name>/?forceSample=true

## Local Development
- Open index.html directly in your browser. No build step needed.
- Data persists in your browser via IndexedDB/localStorage.

## Troubleshooting
- 404 or blank page: ensure Pages source is main and folder is / (root); wait 12 minutes and hard refresh.
- Styles/scripts not loading: filenames are case-sensitive on GitHub; keep names exactly as included here.
- Sample data not appearing: confirm sample-data.json exists in the repo root and use ?forceSample=true once.
- Export/Backup not downloading: try in a desktop browser; some mobile browsers block automatic downloads.

## Notes
- This package is static and privacy-friendly: no server required; all data stays in the browser.
- You can safely delete this README.md from your public repo if you dont want to expose these instructions.
