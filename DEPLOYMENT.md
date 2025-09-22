# 🚀 Information Hub - Deployment Guide

## Quick Start

### Option 1: GitHub Pages (Recommended - Free)
1. Create a GitHub repository
2. Run `npm install` and then `npm run build` locally
3. Upload the `dist/` folder contents to the repository root
4. Go to Settings → Pages
5. Select "Deploy from a branch" → `main`
6. Your site will be live at: `https://yourusername.github.io/information-hub`

### Option 2: Netlify (Professional - Free)
1. Go to [netlify.com](https://netlify.com)
2. Drag and drop the `dist/` folder
3. Get instant deployment with custom domain option

### Option 3: Vercel (Fast - Free)
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Set output directory to `dist/`
4. Deploy automatically

## Files Structure
```
information-hub/
├── auth.html              # Login page
├── index.html             # Main hub dashboard
├── styles.css             # Complete styling
├── auth-script.js         # Authentication system
├── hub-script.js          # Main application logic
├── section-script.js      # Section page functionality
├── database.js            # IndexedDB database system
├── excel-export.js        # Excel export functionality
├── logo.svg               # Company logo
├── package.json           # Project configuration
├── README.md              # Documentation
└── DEPLOYMENT.md          # This file
└── dist/                  # Build output (minified)
```

## Features
- ✅ User Authentication & Role Management
- ✅ 8 Functional Sections (Costing, Supply Planning, Operations, Quality, HR, IT, Sales, Compliance)
- ✅ Database Storage (IndexedDB)
- ✅ Excel Export Functionality
- ✅ Admin Panel with User Management
- ✅ Audit Logging
- ✅ Responsive Design
- ✅ Custom Logo Integration

## Default Login Credentials
- **Admin**: `admin` / `admin123`
- **Manager**: `manager` / `manager123`
- **User**: `user` / `user123`

## Requirements
- Modern web browser (Chrome, Firefox, Safari, Edge)
- No server-side requirements (static files only)
- HTTPS recommended for production

## Build & Deploy
1. Install dependencies: `npm install`
2. Build optimized output: `npm run build`
3. Preview locally: `npm run serve:dist`
4. Deploy: upload the `dist/` folder to your hosting provider

## Customization
- Edit `logo.svg` to change the logo
- Modify `styles.css` for custom styling
- Update user accounts in `auth-script.js`
- Add new sections in `hub-script.js`

## Support
This is a complete, production-ready application. All source code is available for modification and customization.

