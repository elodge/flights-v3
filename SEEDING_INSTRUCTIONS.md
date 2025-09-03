# Manual Database Seeding Instructions

## Overview
To test the authentication and role-based access system, you'll need to manually seed your Supabase database with test users, artists, and assignments.

## Step 1: Create Test Users

### Option A: Sign Up Through the App
1. Visit your app at `http://localhost:3001/login`
2. Since we don't have a sign-up page yet, you can create users directly in Supabase

### Option B: Create Users in Supabase Dashboard
1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/zcnvpckrxyytrbumrpeh
2. Navigate to **Authentication > Users**
3. Click **Add User** and create test accounts:

**Test Client User:**
- Email: `client@test.com`
- Password: `password123`
- Confirm Password: `password123`

**Test Agent User:**
- Email: `agent@test.com`
- Password: `password123`
- Confirm Password: `password123`

**Test Admin User:**
- Email: `admin@test.com`
- Password: `password123`
- Confirm Password: `password123`

## Step 2: Set User Roles in Database

After creating the users in Supabase Auth, you need to update their roles in your users table.

1. Go to **Table Editor > users** in your Supabase dashboard
2. Find the users you just created (they should be automatically inserted via the auth trigger)
3. Update their roles:

```sql
-- Update the client user role
UPDATE users 
SET role = 'client', full_name = 'Test Client'
WHERE email = 'client@test.com';

-- Update the agent user role  
UPDATE users 
SET role = 'agent', full_name = 'Test Agent'
WHERE email = 'agent@test.com';

-- Update the admin user role
UPDATE users 
SET role = 'admin', full_name = 'Test Admin'
WHERE email = 'admin@test.com';
```

## Step 3: Create Test Artists

Run this SQL in your Supabase SQL Editor:

```sql
-- Insert test artists
INSERT INTO artists (name, description, contact_email, contact_phone) VALUES
('Taylor Swift', 'Pop superstar with worldwide tours', 'contact@taylorswift.com', '+1-555-0101'),
('The Beatles Revival', 'Classic rock tribute band', 'booking@beatlesrevival.com', '+1-555-0102'),
('Jazz Ensemble NYC', 'Professional jazz performers', 'info@jazzensemblenyc.com', '+1-555-0103');
```

## Step 4: Create Artist Assignments

Assign your test client to one or more artists:

```sql
-- Get the client user ID and artist IDs
-- Replace the UUIDs below with actual IDs from your database

-- First, get the user IDs
SELECT id, email, role FROM users;

-- Then get the artist IDs  
SELECT id, name FROM artists;

-- Create artist assignment for the client user
-- Replace 'CLIENT_USER_ID' and 'ARTIST_ID' with actual UUIDs from above queries
INSERT INTO artist_assignments (user_id, artist_id, created_by) VALUES
('CLIENT_USER_ID', 'ARTIST_ID', 'ADMIN_USER_ID');
```

**Example with actual IDs (replace with your real UUIDs):**
```sql
-- Example - use your actual UUIDs
INSERT INTO artist_assignments (user_id, artist_id, created_by) VALUES
('12345678-1234-1234-1234-123456789012', -- client user ID
 '87654321-4321-4321-4321-210987654321', -- Taylor Swift artist ID  
 '11111111-1111-1111-1111-111111111111'); -- admin user ID
```

## Step 5: Verification

### Test Authentication Flow:

1. **Unauthenticated Access:**
   - Visit `/c` or `/a` → should redirect to `/login`
   - Visit `/` → should show landing page with sign-in options

2. **Client Login:**
   - Login as `client@test.com` 
   - Should redirect to `/c` (Client Portal)
   - Header should show user email and "client" role
   - Try visiting `/a` → should redirect back to `/c`

3. **Agent/Admin Login:**
   - Login as `agent@test.com` or `admin@test.com`
   - Should redirect to `/a` (Employee Portal)
   - Header should show user email and "agent"/"admin" role
   - Try visiting `/c` → should redirect back to `/a`

4. **Logout:**
   - Click logout in header dropdown
   - Should redirect to `/login`
   - Session should be cleared

### Test Role-Based Access:

1. **Data Access (will be tested later with UI):**
   - Clients should only see data for their assigned artists
   - Agents/Admins should see all artists
   - RLS policies should enforce this automatically

## Troubleshooting

### If Users Aren't Being Created in the Users Table:
The auth trigger should automatically create user profiles. If it's not working:

```sql
-- Manually insert user profiles
INSERT INTO users (id, email, full_name, role) VALUES
('AUTH_USER_ID_FROM_SUPABASE', 'client@test.com', 'Test Client', 'client'),
('AUTH_USER_ID_FROM_SUPABASE', 'agent@test.com', 'Test Agent', 'agent'),
('AUTH_USER_ID_FROM_SUPABASE', 'admin@test.com', 'Test Admin', 'admin');
```

### If Auth Isn't Working:
1. Check that your `.env.local` has the correct Supabase keys
2. Verify the auth trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';`
3. Check Supabase logs for any errors

### If RLS Is Blocking Access:
1. Verify RLS policies are created: `SELECT * FROM pg_policies WHERE schemaname = 'public';`
2. Check that helper functions exist: `SELECT * FROM pg_proc WHERE proname LIKE '%user%';`

## Next Steps

Once you have test data:
1. ✅ Authentication flow works
2. ✅ Role-based routing works  
3. ✅ User profiles sync correctly
4. ✅ Artist assignments are in place
5. 🚀 Ready to build data-driven UI components

The system is now ready for building out the actual flight management features!
