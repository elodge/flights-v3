-- Daysheets Flight Management System - Complete Schema Migration
-- Based on approved spec with comprehensive data model

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing simple tables to start fresh
DROP TABLE IF EXISTS daysheets CASCADE;
DROP TABLE IF EXISTS flights CASCADE; 
DROP TABLE IF EXISTS artists CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS flight_status CASCADE;

-- Create enum types
CREATE TYPE user_role AS ENUM ('client', 'agent', 'admin');
CREATE TYPE project_type AS ENUM ('tour', 'event');
CREATE TYPE hold_status AS ENUM ('active', 'expired', 'released');
CREATE TYPE pnr_status AS ENUM ('pending', 'confirmed', 'cancelled');
CREATE TYPE notification_type AS ENUM ('booking', 'hold_expiry', 'document', 'chat', 'system');

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    role user_role NOT NULL DEFAULT 'client',
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Artists table
CREATE TABLE public.artists (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Artist assignments (maps users to artists)
CREATE TABLE public.artist_assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, artist_id)
);

-- =============================================================================
-- PROJECT & TOUR TABLES
-- =============================================================================

-- Projects (tours + events)
CREATE TABLE public.projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    type project_type NOT NULL,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Legs (with optional label)
CREATE TABLE public.legs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    label TEXT, -- Optional friendly name like "London to Paris"
    departure_city TEXT NOT NULL,
    arrival_city TEXT NOT NULL,
    departure_date DATE NOT NULL,
    arrival_date DATE,
    departure_time TIME,
    arrival_time TIME,
    notes TEXT,
    leg_order INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tour personnel (passenger records; scoped per project)
CREATE TABLE public.tour_personnel (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role_title TEXT, -- e.g., "Tour Manager", "Sound Engineer"
    passport_number TEXT,
    nationality TEXT,
    date_of_birth DATE,
    dietary_requirements TEXT,
    special_requests TEXT,
    is_vip BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- BOOKING & FLIGHT TABLES  
-- =============================================================================

-- Leg passengers (link passengers to legs; includes treat_as_individual)
CREATE TABLE public.leg_passengers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    leg_id UUID NOT NULL REFERENCES legs(id) ON DELETE CASCADE,
    personnel_id UUID NOT NULL REFERENCES tour_personnel(id) ON DELETE CASCADE,
    treat_as_individual BOOLEAN DEFAULT false, -- If true, book separately from group
    seat_preference TEXT,
    meal_preference TEXT,
    special_assistance TEXT,
    is_confirmed BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(leg_id, personnel_id)
);

-- Options (flight option groups)
CREATE TABLE public.options (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    leg_id UUID NOT NULL REFERENCES legs(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g., "Option A", "Economy Plus"
    description TEXT,
    total_cost DECIMAL(10,2),
    currency TEXT DEFAULT 'USD',
    is_recommended BOOLEAN DEFAULT false,
    is_available BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Option components (individual flight segments in an option)
CREATE TABLE public.option_components (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    option_id UUID NOT NULL REFERENCES options(id) ON DELETE CASCADE,
    flight_number TEXT NOT NULL,
    airline TEXT NOT NULL,
    aircraft_type TEXT,
    departure_airport TEXT NOT NULL,
    arrival_airport TEXT NOT NULL,
    departure_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    arrival_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    flight_duration INTERVAL,
    seat_class TEXT, -- e.g., "Economy", "Business", "First"
    cost_per_person DECIMAL(10,2),
    segment_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- BUSINESS LOGIC TABLES
-- =============================================================================

-- Selections (client choices)
CREATE TABLE public.selections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    leg_id UUID NOT NULL REFERENCES legs(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES options(id) ON DELETE CASCADE,
    selected_by UUID NOT NULL REFERENCES users(id),
    selected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    is_final BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(leg_id, option_id) -- One selection per leg/option combination
);

-- Holds (per passenger, 24h expiry, no extensions)
CREATE TABLE public.holds (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    personnel_id UUID NOT NULL REFERENCES tour_personnel(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES options(id) ON DELETE CASCADE,
    leg_passenger_id UUID NOT NULL REFERENCES leg_passengers(id) ON DELETE CASCADE,
    status hold_status DEFAULT 'active',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    held_by UUID NOT NULL REFERENCES users(id),
    released_by UUID REFERENCES users(id),
    released_at TIMESTAMP WITH TIME ZONE,
    release_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(personnel_id, option_id, leg_passenger_id)
);

-- PNRs (one per passenger)
CREATE TABLE public.pnrs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    personnel_id UUID NOT NULL REFERENCES tour_personnel(id) ON DELETE CASCADE,
    pnr_code TEXT NOT NULL UNIQUE, -- Airline confirmation code
    airline TEXT NOT NULL,
    status pnr_status DEFAULT 'pending',
    booking_reference TEXT,
    total_cost DECIMAL(10,2),
    currency TEXT DEFAULT 'USD',
    booked_by UUID REFERENCES users(id),
    booked_at TIMESTAMP WITH TIME ZONE,
    cancelled_by UUID REFERENCES users(id),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- CONTENT & COMMUNICATION TABLES
-- =============================================================================

-- Documents (PDFs; is_current flag)
CREATE TABLE public.documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    leg_id UUID REFERENCES legs(id) ON DELETE CASCADE,
    personnel_id UUID REFERENCES tour_personnel(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL, -- Supabase storage path
    file_size INTEGER,
    mime_type TEXT DEFAULT 'application/pdf',
    is_current BOOLEAN DEFAULT true,
    document_type TEXT, -- e.g., "itinerary", "ticket", "passport", "visa"
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat messages (one thread per leg)
CREATE TABLE public.chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    leg_id UUID NOT NULL REFERENCES legs(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_system_message BOOLEAN DEFAULT false,
    reply_to_id UUID REFERENCES chat_messages(id),
    attachments JSONB, -- Array of file references
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications
CREATE TABLE public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    related_id UUID, -- Could reference any table
    related_table TEXT, -- Name of the related table
    is_read BOOLEAN DEFAULT false,
    is_dismissed BOOLEAN DEFAULT false,
    action_url TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Core relationship indexes
CREATE INDEX idx_artist_assignments_user_id ON artist_assignments(user_id);
CREATE INDEX idx_artist_assignments_artist_id ON artist_assignments(artist_id);
CREATE INDEX idx_projects_artist_id ON projects(artist_id);
CREATE INDEX idx_legs_project_id ON legs(project_id);
CREATE INDEX idx_tour_personnel_project_id ON tour_personnel(project_id);

-- Critical join indexes (as specified)
CREATE INDEX idx_leg_passengers_leg_id ON leg_passengers(leg_id);
CREATE INDEX idx_leg_passengers_personnel_id ON leg_passengers(personnel_id);
CREATE INDEX idx_selections_leg_id ON selections(leg_id);
CREATE INDEX idx_selections_option_id ON selections(option_id);
CREATE INDEX idx_holds_personnel_id ON holds(personnel_id);
CREATE INDEX idx_holds_expires_at ON holds(expires_at);
CREATE INDEX idx_documents_project_id ON documents(project_id);
CREATE INDEX idx_documents_leg_id ON documents(leg_id);
CREATE INDEX idx_documents_is_current ON documents(is_current);

-- Booking and option indexes
CREATE INDEX idx_options_leg_id ON options(leg_id);
CREATE INDEX idx_option_components_option_id ON option_components(option_id);
CREATE INDEX idx_pnrs_personnel_id ON pnrs(personnel_id);
CREATE INDEX idx_chat_messages_leg_id ON chat_messages(leg_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- Date-based indexes for performance
CREATE INDEX idx_legs_departure_date ON legs(departure_date);
CREATE INDEX idx_projects_start_date ON projects(start_date);
CREATE INDEX idx_holds_status_expires ON holds(status, expires_at);

-- =============================================================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================================================

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables with updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_artists_updated_at BEFORE UPDATE ON artists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_legs_updated_at BEFORE UPDATE ON legs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tour_personnel_updated_at BEFORE UPDATE ON tour_personnel FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leg_passengers_updated_at BEFORE UPDATE ON leg_passengers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_options_updated_at BEFORE UPDATE ON options FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_option_components_updated_at BEFORE UPDATE ON option_components FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_selections_updated_at BEFORE UPDATE ON selections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_holds_updated_at BEFORE UPDATE ON holds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pnrs_updated_at BEFORE UPDATE ON pnrs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chat_messages_updated_at BEFORE UPDATE ON chat_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY SETUP
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leg_passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.option_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pnrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
