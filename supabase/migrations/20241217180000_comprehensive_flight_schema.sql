-- Comprehensive Flight Management System Migration
-- This migration creates all tables, relationships, constraints, indexes, and RLS policies
-- Based on the approved specification for the Daysheets Flight Management System

-- Drop existing tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS pnrs CASCADE;
DROP TABLE IF EXISTS holds CASCADE;
DROP TABLE IF EXISTS selections CASCADE;
DROP TABLE IF EXISTS option_components CASCADE;
DROP TABLE IF EXISTS options CASCADE;
DROP TABLE IF EXISTS leg_passengers CASCADE;
DROP TABLE IF EXISTS tour_personnel CASCADE;
DROP TABLE IF EXISTS legs CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS artist_assignments CASCADE;
DROP TABLE IF EXISTS artists CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_user_role(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_employee(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_artist_ids(UUID) CASCADE;
DROP FUNCTION IF EXISTS user_has_artist_access(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS user_has_project_access(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS rpc_client_select_option(UUID, UUID, UUID[]) CASCADE;
DROP FUNCTION IF EXISTS trigger_set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Drop existing types if they exist
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS project_type CASCADE;
DROP TYPE IF EXISTS selection_status CASCADE;
DROP TYPE IF EXISTS document_type CASCADE;

-- Create custom types
CREATE TYPE user_role AS ENUM ('client', 'agent', 'admin');
CREATE TYPE project_type AS ENUM ('tour', 'event');
CREATE TYPE selection_status AS ENUM ('client_choice', 'held', 'ticketed', 'expired');
CREATE TYPE document_type AS ENUM ('itinerary', 'invoice');

-- Create users table (extends Supabase auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    role user_role NOT NULL DEFAULT 'client',
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create artists table
CREATE TABLE artists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create artist_assignments table (maps clients to specific artists)
CREATE TABLE artist_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    UNIQUE(user_id, artist_id)
);

-- Create projects table (tours + events)
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    type project_type NOT NULL,
    start_date DATE,
    end_date DATE,
    budget_amount DECIMAL(12,2),
    budget_currency TEXT DEFAULT 'USD',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create legs table
CREATE TABLE legs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    label TEXT, -- optional label
    origin_city TEXT NOT NULL,
    destination_city TEXT NOT NULL,
    departure_date DATE,
    arrival_date DATE,
    earliest_departure TIMESTAMPTZ, -- optional earliest departure constraint
    latest_departure TIMESTAMPTZ,   -- optional latest departure constraint
    departure_time TIME,
    arrival_time TIME,
    notes TEXT,
    leg_order INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create tour_personnel table (passengers per project, no cross-project reuse)
CREATE TABLE tour_personnel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role_title TEXT,
    passport_number TEXT,
    nationality TEXT,
    date_of_birth DATE,
    dietary_requirements TEXT,
    special_requests TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    is_vip BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create leg_passengers table (links personnel to legs)
CREATE TABLE leg_passengers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leg_id UUID NOT NULL REFERENCES legs(id) ON DELETE CASCADE,
    passenger_id UUID NOT NULL REFERENCES tour_personnel(id) ON DELETE CASCADE,
    treat_as_individual BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(leg_id, passenger_id)
);

-- Create options table (group-level selectable options)
CREATE TABLE options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leg_id UUID NOT NULL REFERENCES legs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    total_cost DECIMAL(10,2),
    currency TEXT DEFAULT 'USD',
    is_recommended BOOLEAN NOT NULL DEFAULT false,
    is_available BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create option_components table (Navitas text blocks per option, supports split flights)
CREATE TABLE option_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    option_id UUID NOT NULL REFERENCES options(id) ON DELETE CASCADE,
    component_order INTEGER NOT NULL DEFAULT 1,
    navitas_text TEXT NOT NULL, -- Raw Navitas text block
    flight_number TEXT,
    airline TEXT,
    departure_time TIMESTAMPTZ,
    arrival_time TIMESTAMPTZ,
    aircraft_type TEXT,
    seat_configuration TEXT,
    meal_service TEXT,
    baggage_allowance TEXT,
    cost DECIMAL(10,2),
    currency TEXT DEFAULT 'USD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create selections table (one active selection per passenger per leg)
CREATE TABLE selections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leg_id UUID NOT NULL REFERENCES legs(id) ON DELETE CASCADE,
    passenger_id UUID NOT NULL REFERENCES tour_personnel(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES options(id) ON DELETE CASCADE,
    status selection_status NOT NULL DEFAULT 'client_choice',
    selected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(leg_id, passenger_id) -- One active selection per passenger per leg
);

-- Create holds table (per passenger+option; 24h default expiry; cannot be extended)
CREATE TABLE holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    option_id UUID NOT NULL REFERENCES options(id) ON DELETE CASCADE,
    passenger_id UUID NOT NULL REFERENCES tour_personnel(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- No unique constraint to allow multiple holds per passenger+option over time
    -- But business logic should prevent overlapping active holds
    CHECK (expires_at > created_at)
);

-- Create pnrs table (exactly 1 passenger per PNR; may span multiple legs)
CREATE TABLE pnrs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passenger_id UUID NOT NULL REFERENCES tour_personnel(id) ON DELETE CASCADE,
    code TEXT NOT NULL, -- PNR confirmation code
    airline TEXT,
    booking_reference TEXT,
    ticket_number TEXT,
    issued_at TIMESTAMPTZ,
    status TEXT DEFAULT 'confirmed',
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(passenger_id, code) -- One PNR code per passenger
);

-- Create documents table (PDFs only; types: itinerary/invoice; is_current flag)
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passenger_id UUID NOT NULL REFERENCES tour_personnel(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type document_type NOT NULL,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Supabase Storage path
    file_size INTEGER,
    mime_type TEXT DEFAULT 'application/pdf',
    is_current BOOLEAN NOT NULL DEFAULT true,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Unique constraint will be created separately as a partial index
);

-- Create chat_messages table (one thread per leg)
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leg_id UUID NOT NULL REFERENCES legs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_system_message BOOLEAN NOT NULL DEFAULT false,
    reply_to_id UUID REFERENCES chat_messages(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create notifications table (artist-scoped)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    artist_id UUID REFERENCES artists(id) ON DELETE CASCADE, -- null for system-wide notifications
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- info, warning, error, success
    is_read BOOLEAN NOT NULL DEFAULT false,
    action_url TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_artist_assignments_user_id ON artist_assignments(user_id);
CREATE INDEX idx_artist_assignments_artist_id ON artist_assignments(artist_id);
CREATE INDEX idx_projects_artist_id ON projects(artist_id);
CREATE INDEX idx_legs_project_id ON legs(project_id);
CREATE INDEX idx_tour_personnel_project_id ON tour_personnel(project_id);
CREATE INDEX idx_leg_passengers_leg_id ON leg_passengers(leg_id);
CREATE INDEX idx_leg_passengers_passenger_id ON leg_passengers(passenger_id);
CREATE INDEX idx_options_leg_id ON options(leg_id);
CREATE INDEX idx_option_components_option_id ON option_components(option_id);
CREATE INDEX idx_selections_leg_id ON selections(leg_id);
CREATE INDEX idx_selections_passenger_id ON selections(passenger_id);
CREATE INDEX idx_selections_option_id ON selections(option_id);
CREATE INDEX idx_holds_option_id ON holds(option_id);
CREATE INDEX idx_holds_passenger_id ON holds(passenger_id);
CREATE INDEX idx_holds_expires_at ON holds(expires_at);
CREATE INDEX idx_pnrs_passenger_id ON pnrs(passenger_id);
CREATE INDEX idx_documents_passenger_id ON documents(passenger_id);
CREATE INDEX idx_documents_project_id ON documents(project_id);
CREATE INDEX idx_documents_is_current ON documents(is_current) WHERE is_current = true;
CREATE INDEX idx_chat_messages_leg_id ON chat_messages(leg_id);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_artist_id ON notifications(artist_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read) WHERE is_read = false;

-- Create partial unique constraint for current documents (only one current document per passenger per project per type)
CREATE UNIQUE INDEX idx_documents_current_unique ON documents(passenger_id, project_id, type) WHERE is_current = true;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables with updated_at column
CREATE TRIGGER set_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON artists FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON legs FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tour_personnel FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON options FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON option_components FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON selections FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON pnrs FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON chat_messages FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE legs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE leg_passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE options ENABLE ROW LEVEL SECURITY;
ALTER TABLE option_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE pnrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS policies
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role AS $$
    SELECT role FROM users WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_employee(user_id UUID)
RETURNS BOOLEAN AS $$
    SELECT role IN ('agent', 'admin') FROM users WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_artist_ids(user_id UUID)
RETURNS UUID[] AS $$
    SELECT ARRAY_AGG(artist_id) FROM artist_assignments WHERE user_id = $1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION user_has_artist_access(artist_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Employees can access all artists
    IF is_employee(user_id) THEN
        RETURN TRUE;
    END IF;
    
    -- Clients can only access assigned artists
    RETURN artist_id = ANY(get_user_artist_ids(user_id));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION user_has_project_access(project_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    project_artist_id UUID;
BEGIN
    SELECT artist_id INTO project_artist_id FROM projects WHERE id = project_id;
    RETURN user_has_artist_access(project_artist_id, user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies

-- Users: All can select themselves, employees can select all, admins can modify
CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY "Employees can view all users" ON users FOR SELECT USING (is_employee(auth.uid()));
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Admins can insert users" ON users FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can delete users" ON users FOR DELETE USING (get_user_role(auth.uid()) = 'admin');

-- Artists: Employees full access, clients read-only for assigned artists
CREATE POLICY "Employees can manage artists" ON artists FOR ALL USING (is_employee(auth.uid()));
CREATE POLICY "Clients can view assigned artists" ON artists FOR SELECT USING (user_has_artist_access(id, auth.uid()));

-- Artist assignments: Employees full access, clients read-only for own assignments
CREATE POLICY "Employees can manage artist assignments" ON artist_assignments FOR ALL USING (is_employee(auth.uid()));
CREATE POLICY "Clients can view own assignments" ON artist_assignments FOR SELECT USING (user_id = auth.uid());

-- Projects: Based on artist access
CREATE POLICY "Employees can manage projects" ON projects FOR ALL USING (is_employee(auth.uid()));
CREATE POLICY "Clients can view assigned artist projects" ON projects FOR SELECT USING (user_has_artist_access(artist_id, auth.uid()));

-- Legs: Based on project access
CREATE POLICY "Employees can manage legs" ON legs FOR ALL USING (is_employee(auth.uid()));
CREATE POLICY "Clients can view legs for assigned projects" ON legs FOR SELECT USING (user_has_project_access(project_id, auth.uid()));

-- Tour personnel: Based on project access
CREATE POLICY "Employees can manage tour personnel" ON tour_personnel FOR ALL USING (is_employee(auth.uid()));
CREATE POLICY "Clients can view personnel for assigned projects" ON tour_personnel FOR SELECT USING (user_has_project_access(project_id, auth.uid()));

-- Leg passengers: Based on leg access
CREATE POLICY "Employees can manage leg passengers" ON leg_passengers FOR ALL USING (is_employee(auth.uid()));
CREATE POLICY "Clients can view leg passengers for accessible legs" ON leg_passengers 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM legs WHERE id = leg_id AND user_has_project_access(project_id, auth.uid()))
    );

-- Options: Based on leg access
CREATE POLICY "Employees can manage options" ON options FOR ALL USING (is_employee(auth.uid()));
CREATE POLICY "Clients can view options for accessible legs" ON options 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM legs WHERE id = leg_id AND user_has_project_access(project_id, auth.uid()))
    );

-- Option components: Based on option access
CREATE POLICY "Employees can manage option components" ON option_components FOR ALL USING (is_employee(auth.uid()));
CREATE POLICY "Clients can view option components for accessible options" ON option_components 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM options o 
            JOIN legs l ON l.id = o.leg_id 
            WHERE o.id = option_id AND user_has_project_access(l.project_id, auth.uid())
        )
    );

-- Selections: Employees full access, clients can make selections via RPC
CREATE POLICY "Employees can manage selections" ON selections FOR ALL USING (is_employee(auth.uid()));
CREATE POLICY "Clients can view selections for accessible legs" ON selections 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM legs WHERE id = leg_id AND user_has_project_access(project_id, auth.uid()))
    );

-- Holds: Employees full access, clients read-only for accessible legs
CREATE POLICY "Employees can manage holds" ON holds FOR ALL USING (is_employee(auth.uid()));
CREATE POLICY "Clients can view holds for accessible options" ON holds 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM options o 
            JOIN legs l ON l.id = o.leg_id 
            WHERE o.id = option_id AND user_has_project_access(l.project_id, auth.uid())
        )
    );

-- PNRs: Employees full access, clients read-only for accessible passengers
CREATE POLICY "Employees can manage pnrs" ON pnrs FOR ALL USING (is_employee(auth.uid()));
CREATE POLICY "Clients can view pnrs for accessible passengers" ON pnrs 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tour_personnel tp 
            WHERE tp.id = passenger_id AND user_has_project_access(tp.project_id, auth.uid())
        )
    );

-- Documents: Employees full access, clients read-only current documents for accessible passengers
CREATE POLICY "Employees can manage documents" ON documents FOR ALL USING (is_employee(auth.uid()));
CREATE POLICY "Clients can view current documents for accessible passengers" ON documents 
    FOR SELECT USING (
        is_current = true AND EXISTS (
            SELECT 1 FROM tour_personnel tp 
            WHERE tp.id = passenger_id AND user_has_project_access(tp.project_id, auth.uid())
        )
    );

-- Chat messages: Read/write for accessible legs
CREATE POLICY "Employees can manage chat messages" ON chat_messages FOR ALL USING (is_employee(auth.uid()));
CREATE POLICY "Clients can read chat for accessible legs" ON chat_messages 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM legs WHERE id = leg_id AND user_has_project_access(project_id, auth.uid()))
    );
CREATE POLICY "Clients can send chat for accessible legs" ON chat_messages 
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND 
        EXISTS (SELECT 1 FROM legs WHERE id = leg_id AND user_has_project_access(project_id, auth.uid()))
    );

-- Notifications: Users see their own notifications, admins see all
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Employees can create notifications" ON notifications FOR INSERT WITH CHECK (is_employee(auth.uid()));
CREATE POLICY "Admins can manage all notifications" ON notifications FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- RPC function for client selections
CREATE OR REPLACE FUNCTION rpc_client_select_option(
    leg_id_param UUID,
    option_id_param UUID,
    passenger_ids_param UUID[] DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    project_artist_id UUID;
    user_artist_ids UUID[];
    target_passenger_ids UUID[];
    affected_rows INTEGER := 0;
    result JSON;
BEGIN
    -- Check if user is a client
    IF get_user_role(auth.uid()) != 'client' THEN
        RETURN json_build_object('success', false, 'error', 'Only clients can use this function');
    END IF;
    
    -- Get the project's artist ID
    SELECT p.artist_id INTO project_artist_id
    FROM legs l
    JOIN projects p ON p.id = l.project_id
    WHERE l.id = leg_id_param;
    
    IF project_artist_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Leg not found');
    END IF;
    
    -- Check if client has access to this artist
    user_artist_ids := get_user_artist_ids(auth.uid());
    IF NOT (project_artist_id = ANY(user_artist_ids)) THEN
        RETURN json_build_object('success', false, 'error', 'Access denied: not assigned to this artist');
    END IF;
    
    -- Determine target passengers
    IF passenger_ids_param IS NULL THEN
        -- Apply to all passengers on the leg who are NOT treat_as_individual
        SELECT ARRAY_AGG(lp.passenger_id) INTO target_passenger_ids
        FROM leg_passengers lp
        WHERE lp.leg_id = leg_id_param AND lp.treat_as_individual = false;
    ELSE
        -- Use specified passenger IDs, but validate they're on this leg
        SELECT ARRAY_AGG(lp.passenger_id) INTO target_passenger_ids
        FROM leg_passengers lp
        WHERE lp.leg_id = leg_id_param AND lp.passenger_id = ANY(passenger_ids_param);
    END IF;
    
    IF target_passenger_ids IS NULL OR array_length(target_passenger_ids, 1) = 0 THEN
        RETURN json_build_object('success', false, 'error', 'No valid passengers found for selection');
    END IF;
    
    -- Upsert selections for target passengers
    INSERT INTO selections (leg_id, passenger_id, option_id, status, created_by)
    SELECT leg_id_param, unnest(target_passenger_ids), option_id_param, 'client_choice', auth.uid()
    ON CONFLICT (leg_id, passenger_id) 
    DO UPDATE SET 
        option_id = EXCLUDED.option_id,
        status = EXCLUDED.status,
        selected_at = NOW(),
        created_by = EXCLUDED.created_by,
        updated_at = NOW();
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    RETURN json_build_object(
        'success', true, 
        'affected_passengers', affected_rows,
        'passenger_ids', target_passenger_ids
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant usage on sequences to authenticated users
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions on tables to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Create a function to handle user insertion from auth triggers
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

COMMENT ON MIGRATION IS 'Comprehensive Flight Management System schema with RLS policies and client selection RPC';
