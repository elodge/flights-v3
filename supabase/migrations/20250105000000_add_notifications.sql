-- Add notification system tables
-- This migration creates the notification_events and notification_reads tables
-- for the Notifications MVP system

-- Create notification_events table
CREATE TABLE IF NOT EXISTS notification_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    artist_id uuid NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    project_id uuid NULL REFERENCES projects(id) ON DELETE CASCADE,
    leg_id uuid NULL REFERENCES legs(id) ON DELETE CASCADE,
    actor_user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
    type text NOT NULL CHECK (type IN ('client_selection','hold_expiring','chat_message','document_uploaded','budget_updated')),
    severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
    title text NOT NULL,
    body text NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Create notification_reads table
CREATE TABLE IF NOT EXISTS notification_reads (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id uuid NOT NULL REFERENCES notification_events(id) ON DELETE CASCADE,
    read_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, event_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_events_artist_created 
    ON notification_events(artist_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_events_project_created 
    ON notification_events(project_id, created_at DESC) 
    WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_events_leg_created 
    ON notification_events(leg_id, created_at DESC) 
    WHERE leg_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_events_type_created 
    ON notification_events(type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_reads_user_event 
    ON notification_reads(user_id, event_id);

-- Enable RLS
ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_events
-- Employees (agent/admin) can select all notification events
CREATE POLICY "Employees can view all notification events" ON notification_events
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('agent', 'admin')
        )
    );

-- Clients can only view notification events for artists they have access to
CREATE POLICY "Clients can view notification events for assigned artists" ON notification_events
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'client'
        )
        AND EXISTS (
            SELECT 1 FROM artist_assignments 
            WHERE artist_assignments.user_id = auth.uid() 
            AND artist_assignments.artist_id = notification_events.artist_id
        )
    );

-- Only employees can insert notification events
CREATE POLICY "Employees can insert notification events" ON notification_events
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('agent', 'admin')
        )
    );

-- RLS Policies for notification_reads
-- Users can only access their own read records
CREATE POLICY "Users can view their own notification reads" ON notification_reads
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own notification reads" ON notification_reads
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own notification reads" ON notification_reads
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Block anonymous access
CREATE POLICY "Block anonymous access to notification_events" ON notification_events
    FOR ALL
    TO anon
    USING (false);

CREATE POLICY "Block anonymous access to notification_reads" ON notification_reads
    FOR ALL
    TO anon
    USING (false);

-- Add comments for documentation
COMMENT ON TABLE notification_events IS 'System notifications for employees and clients';
COMMENT ON TABLE notification_reads IS 'Tracks which notifications users have read';
COMMENT ON COLUMN notification_events.actor_user_id IS 'User who triggered the notification (null for system events)';
COMMENT ON COLUMN notification_events.severity IS 'Notification importance level: info, warning, critical';
COMMENT ON COLUMN notification_events.type IS 'Type of notification event';
