# 🚀 GitHub Pages Deployment Guide

## Quick Steps to Deploy Your Information Hub

### 1. Create GitHub Repository
- Go to `https://github.com/new`
- Click "+" → "New repository"
- Name: `YOUR_REPO_NAME` (e.g., `playbook-hub`)
- Make it **Public**
- Don't initialize with README
- Click "Create repository"

### 2. Build and Upload Files
- On your machine, run:
```bash
npm install
npm run build
```
- Upload the contents of the `dist/` folder to your repository root (so that `index.html` sits at repo root)

**Required items now come from `dist/`:**
```
index.html
styles.css
auth.html
section.html
auth-script.js
hub-script.js
section-script.js
database.js
excel-export.js
logo.svg
redirect.html
start.html
background-pic/            # images and manifest.json
```

### 3. Enable GitHub Pages
- Go to your repository on GitHub
- Click "Settings" tab → "Pages"
- Source: "Deploy from a branch"
- Branch: `main`
- Folder: `/` (root)
- Click "Save"

### 4. Access Your Live Site
Your site will be available at:
`https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`

## Default Login Credentials
- **Admin**: `admin` / `admin123`
- **Manager**: `manager` / `manager123`
- **User**: `user` / `user123`

## Features Included
✅ Custom architectural logo
✅ Database functionality (IndexedDB)
✅ Excel export capabilities (loaded on demand)
✅ Role-based access control
✅ 8 functional sections
✅ Admin panel
✅ Responsive design
✅ Security features

## Troubleshooting
- If site doesn't load immediately, wait 5-10 minutes for GitHub Pages to deploy
- Ensure `index.html` is in the repository root (from `dist/`)
- Clear browser cache if needed

## Custom Domain (Optional)
To use a custom domain like `yourcompany.com`:
1. Add a file named `CNAME` with your domain name
2. Configure DNS settings with your domain provider
3. Update GitHub Pages settings with custom domain

