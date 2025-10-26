# Information Hub

> **📚 For complete documentation, see [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) - our living master document.**

A modern, responsive web application for managing organizational resources and information across different functional areas. Built with vanilla JavaScript and Supabase.

---

## 🚀 Quick Start

### For Users
**Live Site:** https://information-hub-cts.vercel.app

1. Login with your credentials
2. Browse sections from the dashboard
3. Search and access resources
4. Contact creators if you need help

### For Developers

**5-Minute Setup:**
```bash
# 1. Clone repository
git clone [repository-url]
cd playbook-hub

# 2. Configure Supabase credentials in config.js
# (Get credentials from Supabase dashboard)

# 3. Run local server
npx serve
# or
python -m http.server 8000

# 4. Open browser
http://localhost:8000
```

**Deploy to Vercel:**
```bash
vercel --prod
```

**Deploy to Supabase:**
- Run `sql/00_all_in_one_setup.sql` in SQL Editor

---

## 📋 What's Included

### Features
- ✅ **Multi-Section Dashboard** - 6 functional areas
- ✅ **Resource Management** - Playbooks, dashboards, links
- ✅ **Authentication** - Secure JWT-based login
- ✅ **Role-Based Permissions** - 5 user roles
- ✅ **Global Search** - Search across all sections
- ✅ **Contact Creator** - Direct email to resource owners
- ✅ **Real-Time Updates** - Instant count updates
- ✅ **Mobile Responsive** - Works on all devices

### Tech Stack
- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **Backend:** Supabase (PostgreSQL + Auth)
- **Deployment:** Vercel (Serverless + CDN)
- **Cost:** ~$300/year

---

## 📚 Documentation

We maintain **ONE living document** that's continuously updated:

### 🌟 [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) - **START HERE**
*Complete project documentation - continuously updated*
- Quick start guide
- Architecture overview
- Database schema
- Deployment instructions
- Security best practices
- Troubleshooting guide
- **Changelog** - All updates and fixes

### Additional Reference Docs:

- **[TRANSITION_GUIDE.md](TRANSITION_GUIDE.md)** - For project handoffs
- **[TECHNICAL_FUNCTIONALITY_SUMMARY.md](TECHNICAL_FUNCTIONALITY_SUMMARY.md)** - Detailed technical reference
- **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - Project structure overview
- **[SECURITY_GUIDE.md](SECURITY_GUIDE.md)** - Security details
- **[LICENSE](LICENSE)** - MIT License

---

## 🏗️ Project Structure

```
playbook-hub/
├── 📄 Core Application
│   ├── index.html              # Dashboard
│   ├── section.html            # Section pages
│   ├── auth.html               # Login
│   ├── styles.css              # All styles
│   └── config.js               # Configuration
│
├── 💻 JavaScript
│   ├── hub-script.js           # Dashboard logic
│   ├── section-script.js       # Section logic
│   ├── auth-script.js          # Authentication
│   ├── database-supabase.js    # Database layer
│   └── excel-export.js         # Export feature
│
├── 🗄️ Database
│   └── sql/
│       ├── 00_all_in_one_setup.sql    # Complete schema
│       ├── complete-schema-final.sql   # Clean schema
│       └── [migration files]
│
└── 📚 Documentation
    ├── PROJECT_DOCUMENTATION.md        # 🌟 Main living document
    ├── README.md (this file)           # Quick start
    ├── TRANSITION_GUIDE.md             # Handoff guide
    └── [reference docs]
```

---

## 🎯 Key Information

### Current Status
- ✅ **Production-Ready**
- ✅ **Active Users:** 50-100+ employees
- ✅ **Uptime:** 99.9%+
- ✅ **Latest Version:** 2.1 (October 2025)

### Latest Updates (October 2025)
- ✅ Fixed section page loading issues (timeout protection)
- ✅ Fixed contact creator email formatting
- ✅ Improved loading performance
- ✅ Enhanced error handling

**See [PROJECT_DOCUMENTATION.md - Changelog](PROJECT_DOCUMENTATION.md#changelog) for complete update history.**

### Important Links
- **Live Site:** https://information-hub-cts.vercel.app
- **Supabase Dashboard:** https://app.supabase.com/project/pioubcszuayewepdawzt
- **Vercel Dashboard:** https://vercel.com

### Credentials
- **Supabase URL:** `https://pioubcszuayewepdawzt.supabase.co`
- **API Key:** See `config.js` or Vercel environment variables

---

## 🛠️ Common Tasks

### Add a User
```bash
# Via Admin Panel (easiest)
1. Login to site as admin
2. Go to Admin Panel → Users
3. Click "Add User"

# Via Supabase Dashboard
1. Go to Authentication → Users
2. Add user
3. Add profile entry in SQL Editor
```

### Deploy a Change
```bash
git add .
git commit -m "Description of change"
git push origin main
# Vercel auto-deploys
```

### Backup Database
```bash
# Via Supabase Dashboard
Database → Backups → Create Backup

# Via Code
npm run backup
```

### Add a New Section
```sql
-- In Supabase SQL Editor
INSERT INTO sections (section_id, name, icon, color, config)
VALUES (
    'new-section',
    'New Section',
    'fas fa-icon',
    '#color',
    '{"types": [{"id": "playbooks", "name": "Playbooks", "icon": "fas fa-book"}]}'::jsonb
);
```

---

## 🆘 Troubleshooting

### Quick Fixes

**Can't Login?**
- Check user exists in both `auth.users` and `profiles` tables
- Try password reset in Supabase dashboard

**Section Won't Load?**
- Check browser console for errors
- Verify Supabase database is running
- Clear browser cache

**Resources Not Showing?**
- Verify user has section in permissions
- Check resource `type` matches tab ID

**For detailed troubleshooting:** See [PROJECT_DOCUMENTATION.md - Troubleshooting](PROJECT_DOCUMENTATION.md#troubleshooting)

---

## 📞 Support

### Documentation
- **Primary:** [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) ← Check here first!
- **Handoff:** [TRANSITION_GUIDE.md](TRANSITION_GUIDE.md)
- **Technical:** [TECHNICAL_FUNCTIONALITY_SUMMARY.md](TECHNICAL_FUNCTIONALITY_SUMMARY.md)

### External Resources
- **Supabase Docs:** https://supabase.com/docs
- **Vercel Docs:** https://vercel.com/docs

### Contacts
- **Development Team:** [Email]
- **Emergency:** [Contact]

---

## 🎉 Why This Project?

### Cost Savings
- **This Solution:** ~$300/year
- **Enterprise Alternatives:** $6,900-$35,000/year
- **Savings:** 70-95%

### Benefits
✅ **Full Control** - Complete customization  
✅ **Data Ownership** - Your data, your infrastructure  
✅ **Simple Architecture** - Easy to maintain  
✅ **Well Documented** - Comprehensive guides  
✅ **Production-Proven** - Used daily by real teams  
✅ **Active Development** - Continuously improved  

---

## 📝 Contributing

### Making Changes

1. **Read the documentation** - [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md)
2. **Create a branch** - `git checkout -b feature/your-feature`
3. **Make changes** - Test locally first!
4. **Update docs** - Add to PROJECT_DOCUMENTATION.md changelog
5. **Submit PR** - Clear description of changes

### Documentation Standards
- ✅ Update [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) for any significant change
- ✅ Add entry to Changelog section
- ✅ Include code examples
- ✅ Explain WHY, not just WHAT

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🎊 Ready to Start?

### New to the project?
1. Read this README (you're here!)
2. Read [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) (15 minutes)
3. Run locally following Quick Start above
4. Explore the live site

### Taking over the project?
1. Read [TRANSITION_GUIDE.md](TRANSITION_GUIDE.md) (30 minutes)
2. Follow the handoff checklist
3. Set up your local environment
4. Make a test change and deploy

### Need technical details?
1. See [TECHNICAL_FUNCTIONALITY_SUMMARY.md](TECHNICAL_FUNCTIONALITY_SUMMARY.md)
2. Review database schema in `sql/` directory
3. Explore the code with documentation as reference

---

**Questions?** Check [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) first - it's our living master document! 📚

**Made with ❤️ for better information management**
