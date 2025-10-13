# Security Quick Start Guide - ctsinformationhub.com

## 🚀 5-Minute Security Setup

### Step 1: Deploy Updated Security Headers
```bash
# Your vercel.json has been updated with security headers
# Deploy to apply changes:
git add vercel.json
git commit -m "Add enhanced security headers"
git push
```

### Step 2: Domain Registrar Security (WHERE YOU BOUGHT THE DOMAIN)
1. Log into your domain registrar (GoDaddy, Namecheap, Google Domains, etc.)
2. Find **ctsinformationhub.com**
3. Enable:
   - ✅ **Domain Lock** (prevents unauthorized transfers)
   - ✅ **Two-Factor Authentication** on your account
   - ✅ **Domain Privacy/WHOIS Protection**

### Step 3: Add CAA DNS Records
**Where**: Vercel Dashboard or your DNS provider

Add these 4 DNS records:
```
Type: CAA | Name: @ | Value: 0 issue "letsencrypt.org"
Type: CAA | Name: @ | Value: 0 issue "pki.goog"
Type: CAA | Name: @ | Value: 0 issuewild ";"
Type: CAA | Name: @ | Value: 0 iodef "mailto:admin@ctsinformationhub.com"
```

### Step 4: Supabase Security Settings
**Where**: https://supabase.com/dashboard/project/pioubcszuayewepdawzt

1. **Authentication → Rate Limits**
   - Set: 60 requests/hour per IP for auth endpoints
   
2. **Authentication → URL Configuration**
   - Add to "Allowed Redirect URLs":
     - `https://www.ctsinformationhub.com/*`
     - `https://ctsinformationhub.com/*`
   
3. **Authentication → Email Templates**
   - Enable: "Confirm email" (prevents fake signups)
   
4. **Database → Backups**
   - Enable daily automatic backups

### Step 5: Test Your Security
Run these tests:

1. **SSL/TLS Test**: https://www.ssllabs.com/ssltest/analyze.html?d=www.ctsinformationhub.com
   - Target: A or A+ rating

2. **Security Headers Test**: https://securityheaders.com/?q=www.ctsinformationhub.com
   - Target: A or A+ rating

3. **HSTS Preload**: https://hstspreload.org/
   - Submit your domain after passing the checks

## 🔥 Critical Security Issues (Fix Immediately)

### Issue #1: Exposed Credentials in Source Code
**Risk**: Medium (anon key is meant to be public, but shouldn't be in version control)

**Fix**: Use environment variables only
```javascript
// In Vercel Dashboard → Settings → Environment Variables
// Add:
SUPABASE_URL=https://pioubcszuayewepdawzt.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Issue #2: No Rate Limiting on Frontend
**Risk**: High (vulnerable to brute force attacks)

**Status**: Mitigated by Supabase rate limiting (configure in Step 4)

### Issue #3: No Account Lockout
**Risk**: Medium (allows unlimited login attempts)

**Status**: Partially mitigated by max login attempts (5) in config.js
**Next**: Implement lockout mechanism after 5 failed attempts

## 📊 Security Status Dashboard

### ✅ Already Implemented
- HTTPS (automatic via Vercel)
- Security headers (X-Frame-Options, HSTS, etc.)
- Session management
- Row Level Security (RLS) in Supabase
- Input validation (basic)
- Authentication system

### ⚠️ Needs Configuration (This Week)
- [ ] Domain lock
- [ ] 2FA on registrar
- [ ] CAA DNS records
- [ ] Supabase rate limiting
- [ ] HSTS preload submission

### 🔜 Coming Soon (This Month)
- [ ] Advanced rate limiting
- [ ] CAPTCHA on login
- [ ] Security monitoring
- [ ] Automated backups
- [ ] Incident response plan

## 🆘 Emergency Contacts

### If Your Site Is Compromised:
1. **Disable the domain** (at registrar)
2. **Revoke all Supabase API keys** (regenerate in dashboard)
3. **Reset all user passwords** (via Supabase dashboard)
4. **Review logs** (Vercel + Supabase)
5. **Contact Vercel support**: https://vercel.com/support
6. **Contact Supabase support**: support@supabase.io

### Security Incident Checklist:
- [ ] Identify the breach
- [ ] Contain the damage
- [ ] Assess the impact
- [ ] Notify affected users (if required by law)
- [ ] Document the incident
- [ ] Implement fixes
- [ ] Post-mortem analysis

## 📈 Monthly Security Tasks

### Week 1: Review
- Check failed login attempts
- Review unusual activity
- Check SSL certificate expiration

### Week 2: Update
- Update dependencies (`npm audit fix`)
- Review user permissions
- Check for security advisories

### Week 3: Test
- Test backup restoration
- Verify security headers
- Check monitoring alerts

### Week 4: Plan
- Review security incidents
- Update security documentation
- Plan next month's improvements

## 🎯 Security Goals

### This Month
- ✅ Deploy security headers
- ⬜ Achieve SSL Labs A+ rating
- ⬜ Set up monitoring
- ⬜ Enable all Supabase security features

### This Quarter
- ⬜ Security audit complete
- ⬜ Incident response plan documented
- ⬜ Automated backups running
- ⬜ CAPTCHA implemented

### This Year
- ⬜ Zero security incidents
- ⬜ 99.9% uptime
- ⬜ Security certifications (if applicable)
- ⬜ Regular penetration testing

---

**Need Help?** See full details in `SECURITY_GUIDE.md`

