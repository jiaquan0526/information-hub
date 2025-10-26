# Information Hub - Complete Project Documentation

**Last Updated:** October 26, 2025  
**Version:** 2.1  
**Status:** Production-Ready  

> **This is the master living document for the Information Hub project.**  
> All updates, fixes, and improvements should be documented here.

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Key Features](#key-features)
5. [Database Schema](#database-schema)
6. [Deployment](#deployment)
7. [Security](#security)
8. [Maintenance](#maintenance)
9. [Troubleshooting](#troubleshooting)
10. [Changelog](#changelog)

---

## Project Overview

### What Is This?
A web-based departmental resource management system providing:
- Centralized dashboard for 6 functional areas (Costing, Supply Planning, Operations, Quality, HR, IT)
- Resource management (playbooks, dashboards, Box links)
- User authentication with role-based permissions
- Real-time search and resource discovery
- Contact creator feature for self-service support

### Tech Stack
- **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3
- **Backend:** Supabase (PostgreSQL 15+ with authentication)
- **Deployment:** Vercel (serverless + global CDN)
- **Cost:** ~$300/year (vs. $6,900-$35,000 for enterprise alternatives)

### Key Statistics
- **Users:** 50-100+ employees
- **Sections:** 6 departments
- **Resources:** 100s of playbooks and links
- **Uptime:** 99.9%+
- **Load Time:** < 3 seconds

---

## Quick Start

### For Users
1. Navigate to: https://information-hub-cts.vercel.app
2. Login with your credentials
3. Browse sections from the dashboard
4. Search resources globally or within sections
5. Contact resource creators if you have issues

### For Developers

**Local Setup:**
```bash
# Clone repository
git clone [repository-url]
cd playbook-hub

# Run local server
npx serve
# or
python -m http.server 8000

# Open browser
http://localhost:8000
```

**Configuration:**
- Edit `config.js` with your Supabase credentials
- Supabase URL: `https://pioubcszuayewepdawzt.supabase.co`
- Get API key from Supabase dashboard

**Deploy to Vercel:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

---

## Architecture

### System Design

```
User Browser
    ↓
[auth.html] → Supabase Auth → JWT Token
    ↓
[index.html] → Dashboard with Section Cards
    ↓
[section.html] → Individual Section with Tabs & Resources
    ↓
Supabase Database (PostgreSQL)
```

### Core Files

| File | Lines | Purpose |
|------|-------|---------|
| `config.js` | 79 | Configuration & credentials |
| `database-supabase.js` | 1,357 | Database layer |
| `hub-script.js` | ~3,500 | Dashboard logic |
| `section-script.js` | 2,832 | Section page logic |
| `auth-script.js` | ~800 | Authentication |
| `styles.css` | ~2,000 | All styling |

### Data Flow

**Authentication:**
1. User enters credentials → `auth.html`
2. Supabase validates → Returns JWT tokens
3. Tokens stored in localStorage
4. Redirect to dashboard

**Navigation (Hub → Section):**
1. User clicks section card → `hub-script.js:navigateToSection()`
2. URL includes access tokens: `section.html?section=costing&access_token=...`
3. Section page restores session from URL tokens
4. URL cleaned for security
5. Resources loaded and displayed

**Resource Management:**
1. User clicks "Add Resource" → Modal opens
2. Form submission → `section-script.js:createResource()`
3. Data saved to Supabase → Includes creator email
4. BroadcastChannel notifies hub → Counts updated
5. UI refreshes

---

## Key Features

### 1. Multi-Section Dashboard
- Dynamic section cards with real-time resource counts
- Configurable colors, icons, and backgrounds per section
- Permission-based visibility (users see only their sections)
- Mobile responsive layout

### 2. Section Pages with Tabs
- Customizable tab structure per section
- Resource types: Playbooks, Dashboards, Box Links (extensible)
- Search and filter within section
- Category-based organization

### 3. Authentication & Permissions
- JWT-based authentication via Supabase
- 5 user roles: Admin, Editor, Manager, Member, Guest
- Section-level permissions (JSONB in database)
- Row Level Security (RLS) policies

### 4. Global Search
- Search across all accessible sections
- Real-time filtering
- Highlights matching text
- Results grouped by section
- Direct navigation to resources

### 5. Contact Creator
- Every resource captures creator's email
- Pre-filled email template for issue reporting
- Self-service support reduces IT tickets
- Email format: `mailto:creator@company.com?subject=...&body=...`

### 6. Activity Logging
- All user actions logged to `activities` table
- Create, update, delete resource events
- Login/logout tracking
- Audit trail for compliance

### 7. Real-Time Sync
- BroadcastChannel API for cross-tab communication
- Resource changes update counts immediately
- No page refresh needed

---

## Database Schema

### Core Tables (6)

#### 1. profiles
```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users,
    username TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Permissions Structure:**
```json
{
  "sections": ["costing", "operations", "quality"],
  "canViewAllSections": false,
  "canEditAllSections": false,
  "canManageUsers": false,
  "canExportData": true
}
```

#### 2. sections
```sql
CREATE TABLE sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Config Structure:**
```json
{
  "types": [
    {"id": "playbooks", "name": "Playbooks", "icon": "fas fa-book"},
    {"id": "dashboards", "name": "Dashboards", "icon": "fas fa-chart-line"}
  ],
  "categories": ["Process", "Template", "Guide"]
}
```

#### 3. resources
```sql
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id TEXT NOT NULL REFERENCES sections(section_id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    extra JSONB DEFAULT '{}',
    creator_email TEXT,
    created_by_name TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 4. activities
```sql
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id),
    username TEXT,
    action TEXT NOT NULL,
    section_id TEXT,
    resource_id UUID,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP DEFAULT NOW()
);
```

#### 5. site_settings
```sql
CREATE TABLE site_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 6. section_backgrounds
```sql
CREATE TABLE section_backgrounds (
    section_id TEXT PRIMARY KEY REFERENCES sections(section_id),
    image_url TEXT NOT NULL,
    assigned_at TIMESTAMP DEFAULT NOW()
);
```

### Indexes
```sql
CREATE INDEX idx_resources_section ON resources(section_id);
CREATE INDEX idx_resources_type ON resources(type);
CREATE INDEX idx_resources_creator_email ON resources(creator_email);
CREATE INDEX idx_activities_section ON activities(section_id);
CREATE INDEX idx_activities_timestamp ON activities(timestamp DESC);
```

---

## Deployment

### Supabase Setup

**1. Create Project:**
- Go to https://supabase.com
- Create new project
- Save credentials

**2. Run Database Schema:**
```bash
# Run this SQL file in Supabase SQL Editor
sql/00_all_in_one_setup.sql
```

**3. Create Admin User:**
- Go to Authentication → Users
- Add user with your email
- Run this SQL (replace USER_ID and EMAIL):

```sql
INSERT INTO profiles (id, username, email, role, permissions)
VALUES (
  'YOUR_USER_ID',
  'admin',
  'your-email@example.com',
  'admin',
  '{"sections": ["costing", "supply-planning", "operations", "quality", "hr", "it"], "canViewAllSections": true, "canEditAllSections": true, "canManageUsers": true, "canExportData": true}'::jsonb
);
```

### Vercel Deployment

**1. Connect Repository:**
- Go to https://vercel.com
- Import your GitHub repository

**2. Configure:**
- Framework: Other
- Build Command: (empty)
- Output Directory: (empty)

**3. Environment Variables:**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

**4. Deploy:**
- Click "Deploy"
- Wait 1-2 minutes
- Your site is live!

---

## Security

### Authentication
- **JWT tokens:** 1 hour validity (auto-refresh)
- **Storage:** Secure localStorage
- **Token passing:** URL parameters for navigation (cleaned after use)

### Row Level Security (RLS)
All tables have RLS enabled:

```sql
-- Users see only their profile
CREATE POLICY "Users view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Resources visible based on permissions
CREATE POLICY "Users view resources" ON resources
    FOR SELECT USING (
        section_id IN (
            SELECT unnest((permissions->'sections')::text[])
            FROM profiles WHERE id = auth.uid()
        )
    );

-- Only admins/editors can delete
CREATE POLICY "Admins delete resources" ON resources
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'editor')
        )
    );
```

### Input Validation
- All user inputs HTML-escaped
- URLs validated before saving
- SQL injection prevented (parameterized queries)
- XSS prevented (CSP headers)

### Best Practices
✅ No credentials in code (use environment variables)  
✅ RLS policies on all tables  
✅ Regular security audits  
✅ Monitor authentication logs  
✅ Rotate API keys periodically  

---

## Maintenance

### Daily Tasks
- [ ] Check Supabase dashboard for errors
- [ ] Review user activity logs
- [ ] Verify automatic backups

### Weekly Tasks
- [ ] Review user feedback
- [ ] Check for broken links
- [ ] Update documentation as needed

### Monthly Tasks
- [ ] Review user permissions
- [ ] Security audit (RLS policies)
- [ ] Feature backlog review
- [ ] Cost analysis

### Backup Procedures

**Database:**
- Automatic daily backups (Supabase)
- Manual export: Supabase Dashboard → Database → Backups

**Code:**
```bash
# PowerShell
npm run backup

# Creates timestamped zip file
```

---

## Troubleshooting

### Common Issues

#### Issue: Can't Login
**Symptoms:** "Invalid credentials" or redirect loop  
**Solutions:**
1. Verify user exists in `auth.users` AND `profiles` tables
2. Check RLS policies on profiles table
3. Reset password in Supabase dashboard
4. Clear browser localStorage

#### Issue: Section Page Won't Load
**Symptoms:** Stuck on loading screen  
**Fixed:** October 25, 2025 (timeout protection added)  
**Solutions:**
1. Check browser console for errors
2. Verify auth tokens in URL
3. Check Supabase database connectivity
4. All queries now have 2-5s timeouts

#### Issue: Resources Not Showing
**Symptoms:** Empty section  
**Solutions:**
1. Check user has section in permissions
2. Verify `section_id` matches exactly
3. Check resource `type` matches tab ID
4. Review RLS policies

#### Issue: Email Formatting Wrong
**Symptoms:** `\n\n` shown instead of line breaks  
**Fixed:** October 25, 2025 (CRLF conversion added)  
**Solution:** Already fixed in code

### Monitoring

**Supabase Dashboard:**
- https://app.supabase.com/project/pioubcszuayewepdawzt
- Database metrics, API usage, errors

**Vercel Dashboard:**
- https://vercel.com
- Deployment logs, function logs, analytics

**Browser Console:**
- Client-side errors
- Network requests
- Performance timing

---

## Changelog

### Version 2.1 (October 25, 2025)

#### 🐛 Critical Fixes

**Section Page Loading Hang Fix**
- **Problem:** Section pages hung indefinitely on loading screen
- **Root Causes:**
  1. Auth tokens not passed from hub to section
  2. Database queries had no timeout protection
  3. Background image queries could block forever
- **Solutions:**
  - Added timeout protection (2-5s) to all blocking queries
  - Fixed token passing in navigation (`hub-script.js` line 1466)
  - Added session restoration from URL tokens (`section-script.js` lines 632-717)
  - Graceful degradation if optional features fail
- **Files Changed:**
  - `index.html` (lines 1466-1503)
  - `section-script.js` (lines 367, 443, 488, 514, 632-717, 907, 937)

**Contact Creator Email Line Breaks Fix**
- **Problem:** Email body showed `\n\n` instead of actual line breaks
- **Root Cause:** Incorrect string escaping, missing CRLF conversion
- **Solution:** Changed `'\\n'` to `'\n'` and added `.replace(/%0A/g, '%0D%0A')`
- **Files Changed:**
  - `hub-script.js` (line 3207)
  - `section-script.js` (line 1004)

#### ✨ Improvements
- Loading screen now has 2.5s maximum display time
- Better error logging for debugging
- Improved URL cleanup after session restoration

---

### Version 2.0 (October 2025)

#### 🎉 New Features
- **Contact Creator Feature:** Direct email to resource creators
- **Global Search:** Search across all sections from dashboard
- **Background Images:** Optional custom backgrounds per section
- **Custom Categories:** Configurable resource categories
- **Activity Logging:** Comprehensive audit trail

#### 🔧 Enhancements
- Improved mobile responsiveness
- Better error handling
- Performance optimizations
- Real-time count updates

---

### Version 1.5 (September 2025)

#### 🎉 New Features
- **User Management Panel:** Admin panel for managing users
- **Excel Export:** Export resources to Excel
- **Role-Based Permissions:** 5 user roles with granular permissions
- **Section Customization:** Admins can customize section tabs

---

### Version 1.0 (August 2025)

#### 🎉 Initial Release
- Multi-section dashboard
- Resource management (CRUD)
- Authentication with Supabase
- Responsive design
- Basic search functionality

---

## Future Roadmap

### Planned Features

**Q1 2026:**
- [ ] File upload capability (not just links)
- [ ] Offline mode with sync
- [ ] Push notifications
- [ ] Mobile native app (React Native)

**Q2 2026:**
- [ ] Advanced analytics dashboard
- [ ] Resource versioning
- [ ] Comments system
- [ ] Approval workflows

**Q3 2026:**
- [ ] API endpoints for integrations
- [ ] Slack bot integration
- [ ] Microsoft Teams integration
- [ ] SSO/SAML authentication

**Q4 2026:**
- [ ] AI-powered search
- [ ] Resource recommendations
- [ ] Automated link checking
- [ ] Advanced field-level permissions

---

## Support & Contact

### Documentation
- **This file** - Complete project documentation
- **README.md** - Quick start guide
- **sql/** - Database schema files

### Technical Support
- **Supabase:** https://supabase.com/docs
- **Vercel:** https://vercel.com/docs
- **Repository:** [Your GitHub repo]

### Emergency Contacts
- **Development Team:** [Email]
- **Project Manager:** [Email]
- **Stakeholders:** [Email]

---

## Contributing

### Making Changes

1. **Create a branch:**
```bash
git checkout -b feature/your-feature-name
```

2. **Make changes and test locally:**
```bash
npx serve
# Test thoroughly at localhost:8000
```

3. **Commit with clear message:**
```bash
git add .
git commit -m "Add: brief description of change"
```

4. **Push and create pull request:**
```bash
git push origin feature/your-feature-name
```

5. **After merge, update this documentation:**
- Add to Changelog
- Update relevant sections
- Document any new features

### Documentation Standards
- Update this file for any significant change
- Include code examples
- Explain WHY, not just WHAT
- Keep changelog current
- Test all procedures

---

## Quick Reference

### Important URLs
- **Live Site:** https://information-hub-cts.vercel.app
- **Supabase:** https://app.supabase.com/project/pioubcszuayewepdawzt
- **Vercel:** https://vercel.com/dashboard

### Important Files
- `config.js` - Configuration
- `database-supabase.js` - Database operations
- `hub-script.js` - Dashboard logic
- `section-script.js` - Section logic
- `sql/00_all_in_one_setup.sql` - Complete schema

### Important Commands
```bash
# Local development
npx serve

# Deploy
vercel --prod

# Backup
npm run backup
```

---

**Document Version:** 2.1  
**Last Updated:** October 26, 2025  
**Maintained By:** Information Hub Development Team  
**Status:** Living Document - Update with each change

---

**Made with ❤️ for better information management**

