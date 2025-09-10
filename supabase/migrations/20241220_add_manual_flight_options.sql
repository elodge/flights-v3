-- Add manual flight option fields to flight_options table
ALTER TABLE flight_options
  ADD COLUMN IF NOT EXISTS source TEXT CHECK (source IN ('navitas','manual')) DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS recommended BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS hold_expires_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS seats_available INT NULL,
  ADD COLUMN IF NOT EXISTS class_of_service TEXT NULL,
  ADD COLUMN IF NOT EXISTS price_total NUMERIC NULL,
  ADD COLUMN IF NOT EXISTS price_currency TEXT NULL;

-- Add flight segment fields to flight_segments table
ALTER TABLE flight_segments
  ADD COLUMN IF NOT EXISTS airline_iata TEXT,
  ADD COLUMN IF NOT EXISTS airline_name TEXT,
  ADD COLUMN IF NOT EXISTS flight_number TEXT,
  ADD COLUMN IF NOT EXISTS dep_iata TEXT,
  ADD COLUMN IF NOT EXISTS arr_iata TEXT,
  ADD COLUMN IF NOT EXISTS dep_time_local TIMESTAMPTZ,   -- local to dep airport date/time
  ADD COLUMN IF NOT EXISTS arr_time_local TIMESTAMPTZ,   -- local to arr airport date/time
  ADD COLUMN IF NOT EXISTS day_offset INT DEFAULT 0,     -- +1, +2 if arrival next day
  ADD COLUMN IF NOT EXISTS stops INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration_minutes INT NULL,
  ADD COLUMN IF NOT EXISTS enriched_terminal_gate JSONB; -- {dep_terminal,dep_gate,arr_terminal,arr_gate}

-- Add sort_order to flight_segments if it doesn't exist
ALTER TABLE flight_segments
  ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_flight_segments_option_sort ON flight_segments(option_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_flight_options_source ON flight_options(source);



