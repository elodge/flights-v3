-- Add manual flight option fields and server-side enrichment fields to option_components table
ALTER TABLE option_components
  -- Manual flight option fields
  ADD COLUMN IF NOT EXISTS airline_iata TEXT,
  ADD COLUMN IF NOT EXISTS airline_name TEXT,
  ADD COLUMN IF NOT EXISTS dep_iata TEXT,
  ADD COLUMN IF NOT EXISTS arr_iata TEXT,
  ADD COLUMN IF NOT EXISTS dep_time_local TIMESTAMPTZ,   -- local to dep airport date/time
  ADD COLUMN IF NOT EXISTS arr_time_local TIMESTAMPTZ,   -- local to arr airport date/time
  ADD COLUMN IF NOT EXISTS day_offset INT DEFAULT 0,     -- +1, +2 if arrival next day
  ADD COLUMN IF NOT EXISTS stops INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration_minutes INT NULL,
  ADD COLUMN IF NOT EXISTS enriched_terminal_gate JSONB, -- {dep_terminal,dep_gate,arr_terminal,arr_gate}
  
  -- Server-side enrichment fields
  ADD COLUMN IF NOT EXISTS enriched_aircraft_type TEXT,
  ADD COLUMN IF NOT EXISTS enriched_aircraft_name TEXT,
  ADD COLUMN IF NOT EXISTS enriched_status TEXT,
  ADD COLUMN IF NOT EXISTS enriched_dep_terminal TEXT,
  ADD COLUMN IF NOT EXISTS enriched_arr_terminal TEXT,
  ADD COLUMN IF NOT EXISTS enriched_dep_gate TEXT,
  ADD COLUMN IF NOT EXISTS enriched_arr_gate TEXT,
  ADD COLUMN IF NOT EXISTS enriched_dep_scheduled TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS enriched_arr_scheduled TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS enriched_duration INT,
  ADD COLUMN IF NOT EXISTS enrichment_source TEXT,
  ADD COLUMN IF NOT EXISTS enrichment_fetched_at TIMESTAMPTZ;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_option_components_enrichment ON option_components(enrichment_source, enrichment_fetched_at);
CREATE INDEX IF NOT EXISTS idx_option_components_option_order ON option_components(option_id, component_order);



