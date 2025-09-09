# 🚀 Vercel Deployment Checklist

## ✅ Pre-Deployment Setup Complete

This checklist documents the Vercel deployment preparation for this Next.js + Supabase application.

### 🔐 Environment Variables Required in Vercel

Set these environment variables in your Vercel project settings:

#### **Public Variables (Client-side)**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
NEXT_PUBLIC_SITE_URL=https://[your-vercel-app].vercel.app
```

#### **Private Variables (Server-only)**
```bash
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
AVSTACK_BASE_URL=http://api.aviationstack.com/v1
AVSTACK_ACCESS_KEY=[your-aviationstack-api-key]
```

### 🗄️ Supabase Configuration

#### **1. Authentication Settings**
In your Supabase project dashboard → Authentication → URL Configuration:

**Site URL:**
```
https://[your-vercel-app].vercel.app
```

**Redirect URLs (add all of these):**
```
https://[your-vercel-app].vercel.app/login
https://[your-vercel-app].vercel.app/invite/accept
https://[your-vercel-app].vercel.app/c
https://[your-vercel-app].vercel.app/a
https://[your-vercel-app].vercel.app/admin
```

**For Vercel Preview Deployments, also add:**
```
https://*-[your-vercel-project].vercel.app
https://*-[your-vercel-project].vercel.app/login
https://*-[your-vercel-project].vercel.app/invite/accept
```

#### **2. Storage CORS Settings**
In your Supabase project dashboard → Storage → Settings → CORS:

Add your production and preview domains:
```
https://[your-vercel-app].vercel.app
https://*-[your-vercel-project].vercel.app
```

### 🔄 Dynamic Pages Configuration

The following pages have been marked as `dynamic = "force-dynamic"` to prevent caching of auth-sensitive content:

- ✅ `/app/page.tsx` - Root page with auth redirects
- ✅ `/app/login/page.tsx` - Login page  
- ✅ `/app/logout/route.ts` - Logout route
- ✅ `/app/invite/accept/page.tsx` - Invite acceptance
- ✅ `/app/(client)/layout.tsx` - Client portal layout
- ✅ `/app/(employee)/layout.tsx` - Employee portal layout
- ✅ `/app/(admin)/layout.tsx` - Admin portal layout

### 🛡️ Security Configuration

#### **Environment Variables Security:**
- ✅ **No server secrets in client bundle** - All sensitive keys are server-only
- ✅ **Aviationstack API key protected** - Only exposed via `/api/flight` proxy
- ✅ **Supabase service role key secure** - Server-only usage

#### **CSP Headers:**
Current CSP configuration in `next.config.ts` allows:
- Supabase connections (`https://*.supabase.co`, `wss://*.supabase.co`)
- Self-hosted resources
- Inline scripts/styles for development

### 🔌 API Routes Status

#### **Health Check:**
- ✅ `/api/health` - Returns `{"ok": true, "timestamp": ..., "status": "healthy"}`

#### **Flight Data:**
- ✅ `/api/flight` - Aviationstack proxy (server-only API key usage)

#### **Authentication:**
- ✅ `/api/auth/me` - Current user endpoint
- ✅ `/api/auth/sync` - User synchronization  

#### **Business Logic:**
- ✅ `/api/artists` - Artists list (employee-only)
- ✅ `/api/notifications/*` - Notification system
- ✅ `/api/chat/*` - Chat system
- ✅ `/api/invites/*` - User invitation system

### 🧪 Post-Deployment Testing

After deploying to Vercel, test these critical flows:

#### **1. Health Check**
```bash
curl https://[your-vercel-app].vercel.app/api/health
# Expected: {"ok": true, "timestamp": ..., "status": "healthy"}
```

#### **2. Authentication Flow**
1. Visit `/login`
2. Sign in with test credentials
3. Verify redirect to appropriate portal (`/c` for clients, `/a` for employees)
4. Test logout functionality

#### **3. Flight Data Enrichment**
1. Navigate to a flight option page
2. Verify flight data loads correctly (via `/api/flight` proxy)
3. Check browser network tab - no direct external API calls

#### **4. Role-Based Access**
1. Test client access to `/c/*` routes
2. Test employee access to `/a/*` routes  
3. Test admin access to `/admin/*` routes
4. Verify proper redirects for unauthorized access

#### **5. File Uploads (if applicable)**
1. Test document upload functionality
2. Verify Supabase Storage CORS allows your domain

### 🚨 Common Issues & Solutions

#### **Authentication Redirects Not Working**
- Verify all redirect URLs are added to Supabase Auth settings
- Check that `NEXT_PUBLIC_SITE_URL` matches your actual domain

#### **"Invalid Refresh Token" Errors**
- Ensure Supabase project settings allow your domain
- Clear browser localStorage/cookies and test fresh session

#### **Flight Data Not Loading**
- Verify `AVSTACK_BASE_URL` and `AVSTACK_ACCESS_KEY` are set correctly
- Check `/api/flight` endpoint responds with flight data

#### **CORS Errors on File Uploads**
- Add your Vercel domain to Supabase Storage CORS settings
- Include both production and preview deployment domains

#### **500 Errors on Auth Pages**
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Verify middleware.ts is not blocking necessary routes

### 📊 Monitoring & Performance

#### **Key Metrics to Monitor:**
- `/api/health` response time
- Authentication success rate
- Flight data enrichment API response times
- Database query performance

#### **Vercel Function Limits:**
- Serverless functions: 10-second timeout (Hobby), 60-second (Pro)
- Edge functions: 30-second timeout
- Memory limits: 1024MB (Hobby), 3008MB (Pro)

### 🔄 Environment Promotion

When promoting from development to production:

1. **Update environment variables** in Vercel dashboard
2. **Update Supabase URL configuration** for new domain
3. **Update Storage CORS** for new domain
4. **Test authentication flow** thoroughly
5. **Verify all API endpoints** work correctly
6. **Check CSP headers** don't block required resources

---

## ✅ Deployment Ready

This application is now configured for Vercel deployment with:
- ✅ Secure environment variable handling
- ✅ Proper authentication flow configuration  
- ✅ Dynamic rendering for auth-sensitive pages
- ✅ Health check endpoint for monitoring
- ✅ API proxy for external services

**Next Steps:**
1. Set environment variables in Vercel
2. Configure Supabase URLs and CORS  
3. Deploy to Vercel
4. Run post-deployment tests
5. Monitor health and performance

Happy deploying! 🚀
