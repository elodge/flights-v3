/**
 * @fileoverview Admin User Management Schema
 * 
 * @description Database schema for admin user management including users table,
 * artist assignments, and invite system for role-based access control.
 * 
 * @security Implements RLS policies for admin-only access to user management
 * @database Creates users, artist_assignments, and invites tables
 * @business_rule Admins can manage all users; agents can invite clients; clients have no access
 */

-- Users table (profile table for internal app users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE NULL, -- null when invited but not yet accepted
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('client','agent','admin')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index on email where auth_user_id is not null
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_active 
ON users (email) WHERE auth_user_id IS NOT NULL;

-- Artist assignments table
CREATE TABLE IF NOT EXISTS artist_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, artist_id)
);

-- Invites table for tokenized user invites
CREATE TABLE IF NOT EXISTS invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('client','agent')), -- admins created by admins only
    artist_ids UUID[] NOT NULL DEFAULT '{}', -- for clients: assigned artists; for employees: optional seed
    token TEXT NOT NULL UNIQUE, -- random 32-48 chars
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users (status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_artist_assignments_user ON artist_assignments (user_id);
CREATE INDEX IF NOT EXISTS idx_artist_assignments_artist ON artist_assignments (artist_id);
CREATE INDEX IF NOT EXISTS idx_invites_token ON invites (token);
CREATE INDEX IF NOT EXISTS idx_invites_email ON invites (email);
CREATE INDEX IF NOT EXISTS idx_invites_expires ON invites (expires_at);

-- RLS Policies for users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Admins: full RW access
CREATE POLICY "Admins can manage all users" ON users
FOR ALL TO authenticated 
USING (get_user_role(auth.uid()) = 'admin')
WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- Agents: read access for coverage
CREATE POLICY "Agents can read users for coverage" ON users
FOR SELECT TO authenticated 
USING (get_user_role(auth.uid()) IN ('agent', 'admin'));

-- Users can read their own profile
CREATE POLICY "Users can read their own profile" ON users
FOR SELECT TO authenticated 
USING (auth_user_id = auth.uid());

-- RLS Policies for artist_assignments table
ALTER TABLE artist_assignments ENABLE ROW LEVEL SECURITY;

-- Admins: full RW access
CREATE POLICY "Admins can manage all artist assignments" ON artist_assignments
FOR ALL TO authenticated 
USING (get_user_role(auth.uid()) = 'admin')
WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- Agents: read access for coverage
CREATE POLICY "Agents can read artist assignments for coverage" ON artist_assignments
FOR SELECT TO authenticated 
USING (get_user_role(auth.uid()) IN ('agent', 'admin'));

-- Users can read their own assignments
CREATE POLICY "Users can read their own artist assignments" ON artist_assignments
FOR SELECT TO authenticated 
USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- RLS Policies for invites table
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Admins: full RW access
CREATE POLICY "Admins can manage all invites" ON invites
FOR ALL TO authenticated 
USING (get_user_role(auth.uid()) = 'admin')
WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- Agents: can create client invites (if they have this permission)
CREATE POLICY "Agents can create client invites" ON invites
FOR INSERT TO authenticated 
WITH CHECK (
    get_user_role(auth.uid()) = 'agent' AND 
    role = 'client'
);

-- Agents: can read invites they created
CREATE POLICY "Agents can read their own invites" ON invites
FOR SELECT TO authenticated 
USING (
    get_user_role(auth.uid()) = 'agent' AND 
    created_by IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
);

-- Anonymous users can read invites by token (for acceptance flow)
CREATE POLICY "Anonymous can read invites by token" ON invites
FOR SELECT TO anon 
USING (true); -- Token validation happens in application logic

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to generate secure random tokens
CREATE OR REPLACE FUNCTION generate_invite_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to create invite with generated token
CREATE OR REPLACE FUNCTION create_invite(
    p_email TEXT,
    p_role TEXT,
    p_artist_ids UUID[],
    p_created_by UUID
)
RETURNS TABLE(token TEXT, expires_at TIMESTAMPTZ) AS $$
DECLARE
    v_token TEXT;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Generate secure token
    v_token := generate_invite_token();
    v_expires_at := NOW() + INTERVAL '7 days';
    
    -- Insert invite
    INSERT INTO invites (email, role, artist_ids, token, expires_at, created_by)
    VALUES (p_email, p_role, p_artist_ids, v_token, v_expires_at, p_created_by);
    
    -- Return token and expiry
    RETURN QUERY SELECT v_token, v_expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_invite(TEXT, TEXT, UUID[], UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_invite_token() TO authenticated;
