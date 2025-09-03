-- Daysheets Flight Management System Database Schema
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('client', 'employee', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE flight_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled', 'delayed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role user_role NOT NULL DEFAULT 'client',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (id)
);

-- Create artists table
CREATE TABLE IF NOT EXISTS public.artists (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create flights table
CREATE TABLE IF NOT EXISTS public.flights (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    flight_number TEXT NOT NULL UNIQUE,
    artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
    departure_airport TEXT NOT NULL,
    arrival_airport TEXT NOT NULL,
    departure_date TIMESTAMP WITH TIME ZONE NOT NULL,
    arrival_date TIMESTAMP WITH TIME ZONE,
    aircraft_type TEXT,
    status flight_status DEFAULT 'scheduled',
    passenger_count INTEGER DEFAULT 0,
    crew_count INTEGER DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create daysheets table
CREATE TABLE IF NOT EXISTS public.daysheets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    flight_id UUID REFERENCES flights(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    departure_time TIME,
    arrival_time TIME,
    weather_conditions TEXT,
    fuel_consumed DECIMAL,
    flight_hours DECIMAL,
    crew_notes TEXT,
    passenger_manifest JSONB,
    expenses JSONB,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_flights_artist_id ON flights(artist_id);
CREATE INDEX IF NOT EXISTS idx_flights_departure_date ON flights(departure_date);
CREATE INDEX IF NOT EXISTS idx_flights_status ON flights(status);
CREATE INDEX IF NOT EXISTS idx_daysheets_flight_id ON daysheets(flight_id);
CREATE INDEX IF NOT EXISTS idx_daysheets_date ON daysheets(date);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at (drop first if they exist)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_artists_updated_at ON artists;
CREATE TRIGGER update_artists_updated_at BEFORE UPDATE ON artists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_flights_updated_at ON flights;
CREATE TRIGGER update_flights_updated_at BEFORE UPDATE ON flights FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_daysheets_updated_at ON daysheets;
CREATE TRIGGER update_daysheets_updated_at BEFORE UPDATE ON daysheets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daysheets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Users can read their own data and employees/admins can read all users
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Employees and admins can view all users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('employee', 'admin')
        )
    );

-- Users can update their own data
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Artists policies
CREATE POLICY "Everyone can view artists" ON public.artists
    FOR SELECT USING (true);

CREATE POLICY "Employees and admins can manage artists" ON public.artists
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('employee', 'admin')
        )
    );

-- Flights policies
CREATE POLICY "Everyone can view flights" ON public.flights
    FOR SELECT USING (true);

CREATE POLICY "Employees and admins can manage flights" ON public.flights
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('employee', 'admin')
        )
    );

-- Daysheets policies
CREATE POLICY "Everyone can view daysheets" ON public.daysheets
    FOR SELECT USING (true);

CREATE POLICY "Employees and admins can manage daysheets" ON public.daysheets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('employee', 'admin')
        )
    );

-- Insert some sample data
INSERT INTO public.artists (name, description, contact_email) VALUES
    ('Taylor Swift', 'Global superstar on world tour', 'management@taylorswift.com'),
    ('Ed Sheeran', 'Singer-songwriter touring internationally', 'contact@edsheeran.com'),
    ('Beyoncé', 'Multi-Grammy award winning artist', 'booking@beyonce.com')
ON CONFLICT DO NOTHING;

-- Get the artist IDs for sample flights
DO $$
DECLARE
    taylor_id UUID;
    ed_id UUID;
    beyonce_id UUID;
BEGIN
    SELECT id INTO taylor_id FROM public.artists WHERE name = 'Taylor Swift';
    SELECT id INTO ed_id FROM public.artists WHERE name = 'Ed Sheeran';
    SELECT id INTO beyonce_id FROM public.artists WHERE name = 'Beyoncé';
    
    -- Insert sample flights
    INSERT INTO public.flights (flight_number, artist_id, departure_airport, arrival_airport, departure_date, status) VALUES
        ('DFS-001', taylor_id, 'LAX', 'JFK', NOW() + INTERVAL '7 days', 'scheduled'),
        ('DFS-002', ed_id, 'LHR', 'CDG', NOW() + INTERVAL '14 days', 'scheduled'),
        ('DFS-003', beyonce_id, 'ATL', 'MIA', NOW() + INTERVAL '21 days', 'scheduled')
    ON CONFLICT (flight_number) DO NOTHING;
END $$;
