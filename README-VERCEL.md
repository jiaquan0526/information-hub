# Information Hub - Vercel Deployment

## 🚀 Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/playbook-hub)

## 📋 Prerequisites

1. **Supabase Project** - Set up your database
2. **GitHub Repository** - Push your code
3. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)

## 🛠️ Setup Instructions

### 1. **Prepare Your Supabase Database**

Run the complete schema in your Supabase SQL Editor:
```sql
-- Copy and paste the contents of complete-schema-fixed.sql
```

### 2. **Configure Environment Variables**

In your Vercel dashboard, add these environment variables:

```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. **Deploy to Vercel**

#### Option A: Deploy from GitHub
1. Push your code to GitHub
2. Connect your GitHub repo to Vercel
3. Vercel will auto-deploy

#### Option B: Deploy with Vercel CLI
```bash
npm i -g vercel
vercel login
vercel --prod
```

## 🔧 Configuration

### **Supabase Integration**
- Update `auth.html` with your Supabase credentials
- Update `hub-script.js` with your Supabase credentials
- Update `database.js` with your Supabase credentials

### **Custom Domain** (Optional)
1. Go to Vercel Dashboard → Project Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

## 📁 Project Structure

```
playbook-hub/
├── index.html              # Main hub page
├── auth.html              # Authentication page
├── section.html           # Section detail page
├── test-rls.html          # RLS testing dashboard
├── database.js            # Supabase database client
├── hub-script.js          # Main application logic
├── auth-script.js         # Authentication logic
├── section-script.js      # Section management
├── styles.css             # Application styles
├── vercel.json           # Vercel configuration
└── complete-schema-fixed.sql # Database schema
```

## 🧪 Testing

1. **Test RLS Policies**: Visit `/test-rls` after deployment
2. **Test Authentication**: Try signing up/in
3. **Test Database**: Verify data persistence

## 🔒 Security Features

- Row Level Security (RLS) enabled
- User authentication via Supabase Auth
- Role-based access control
- Secure API endpoints

## 📊 Monitoring

- **Vercel Analytics**: Built-in performance monitoring
- **Supabase Dashboard**: Database monitoring
- **Error Tracking**: Vercel Functions logs

## 🚀 Performance

- **Static Site Generation**: Fast loading
- **CDN Distribution**: Global edge caching
- **Optimized Assets**: Minified CSS/JS
- **Image Optimization**: Automatic image optimization

## 🔄 Updates

To update your deployment:
1. Push changes to GitHub
2. Vercel auto-deploys
3. Or run `vercel --prod` locally

## 🆘 Troubleshooting

### Common Issues:

1. **Supabase Connection Failed**
   - Check environment variables
   - Verify Supabase URL and key

2. **RLS Policies Not Working**
   - Run the complete schema
   - Test with `/test-rls` page

3. **Authentication Issues**
   - Check Supabase Auth settings
   - Verify redirect URLs

4. **Build Failures**
   - Check Vercel build logs
   - Ensure all files are committed

## 📞 Support

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Project Issues**: GitHub Issues tab
