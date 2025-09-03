-- Row Level Security Policies for Daysheets Flight Management System
-- Deny all by default, then grant specific access patterns

-- =============================================================================
-- HELPER FUNCTIONS FOR RLS
-- =============================================================================

-- Function to check if user is agent or admin
CREATE OR REPLACE FUNCTION is_agent_or_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = user_id 
        AND role IN ('agent', 'admin')
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's assigned artist IDs
CREATE OR REPLACE FUNCTION get_user_artist_ids(user_id UUID)
RETURNS UUID[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT aa.artist_id 
        FROM public.artist_assignments aa
        WHERE aa.user_id = user_id 
        AND aa.is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has access to specific artist
CREATE OR REPLACE FUNCTION user_has_artist_access(user_id UUID, artist_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Agents and admins see all
    IF is_agent_or_admin(user_id) THEN
        RETURN true;
    END IF;
    
    -- Clients only see assigned artists
    RETURN artist_id = ANY(get_user_artist_ids(user_id));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has access to project (via artist)
CREATE OR REPLACE FUNCTION user_has_project_access(user_id UUID, project_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    project_artist_id UUID;
BEGIN
    -- Get the artist for this project
    SELECT artist_id INTO project_artist_id 
    FROM public.projects 
    WHERE id = project_id;
    
    RETURN user_has_artist_access(user_id, project_artist_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- USERS TABLE POLICIES
-- =============================================================================

-- Users can view their own profile
CREATE POLICY "users_select_own" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Agents/admins can view all users
CREATE POLICY "users_select_agents_admins" ON public.users
    FOR SELECT USING (is_agent_or_admin(auth.uid()));

-- Users can update their own profile
CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Agents/admins can update user profiles
CREATE POLICY "users_update_agents_admins" ON public.users
    FOR UPDATE USING (is_agent_or_admin(auth.uid()));

-- Only admins can insert/delete users
CREATE POLICY "users_insert_admin" ON public.users
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "users_delete_admin" ON public.users
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- =============================================================================
-- ARTISTS TABLE POLICIES
-- =============================================================================

-- Clients can only see assigned artists
CREATE POLICY "artists_select_clients" ON public.artists
    FOR SELECT USING (
        user_has_artist_access(auth.uid(), id)
    );

-- Agents/admins can manage all artists
CREATE POLICY "artists_all_agents_admins" ON public.artists
    FOR ALL USING (is_agent_or_admin(auth.uid()));

-- =============================================================================
-- ARTIST ASSIGNMENTS POLICIES
-- =============================================================================

-- Users can see their own assignments
CREATE POLICY "artist_assignments_select_own" ON public.artist_assignments
    FOR SELECT USING (auth.uid() = user_id);

-- Agents/admins can see all assignments
CREATE POLICY "artist_assignments_select_agents_admins" ON public.artist_assignments
    FOR SELECT USING (is_agent_or_admin(auth.uid()));

-- Only agents/admins can manage assignments
CREATE POLICY "artist_assignments_manage_agents_admins" ON public.artist_assignments
    FOR ALL USING (is_agent_or_admin(auth.uid()));

-- =============================================================================
-- PROJECTS TABLE POLICIES
-- =============================================================================

-- Users can see projects for their assigned artists
CREATE POLICY "projects_select" ON public.projects
    FOR SELECT USING (user_has_artist_access(auth.uid(), artist_id));

-- Agents/admins can manage all projects
CREATE POLICY "projects_manage_agents_admins" ON public.projects
    FOR ALL USING (is_agent_or_admin(auth.uid()));

-- =============================================================================
-- LEGS TABLE POLICIES
-- =============================================================================

-- Users can see legs for projects they have access to
CREATE POLICY "legs_select" ON public.legs
    FOR SELECT USING (user_has_project_access(auth.uid(), project_id));

-- Agents/admins can manage all legs
CREATE POLICY "legs_manage_agents_admins" ON public.legs
    FOR ALL USING (is_agent_or_admin(auth.uid()));

-- =============================================================================
-- TOUR PERSONNEL POLICIES
-- =============================================================================

-- Users can see personnel for projects they have access to
CREATE POLICY "tour_personnel_select" ON public.tour_personnel
    FOR SELECT USING (user_has_project_access(auth.uid(), project_id));

-- Agents/admins can manage all personnel
CREATE POLICY "tour_personnel_manage_agents_admins" ON public.tour_personnel
    FOR ALL USING (is_agent_or_admin(auth.uid()));

-- =============================================================================
-- LEG PASSENGERS POLICIES
-- =============================================================================

-- Users can see leg passengers for legs they have access to
CREATE POLICY "leg_passengers_select" ON public.leg_passengers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.legs l
            WHERE l.id = leg_id
            AND user_has_project_access(auth.uid(), l.project_id)
        )
    );

-- Agents/admins can manage all leg passengers
CREATE POLICY "leg_passengers_manage_agents_admins" ON public.leg_passengers
    FOR ALL USING (is_agent_or_admin(auth.uid()));

-- =============================================================================
-- OPTIONS POLICIES
-- =============================================================================

-- Users can see options for legs they have access to
CREATE POLICY "options_select" ON public.options
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.legs l
            WHERE l.id = leg_id
            AND user_has_project_access(auth.uid(), l.project_id)
        )
    );

-- Agents/admins can manage all options
CREATE POLICY "options_manage_agents_admins" ON public.options
    FOR ALL USING (is_agent_or_admin(auth.uid()));

-- =============================================================================
-- OPTION COMPONENTS POLICIES
-- =============================================================================

-- Users can see option components for options they have access to
CREATE POLICY "option_components_select" ON public.option_components
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.options o
            JOIN public.legs l ON l.id = o.leg_id
            WHERE o.id = option_id
            AND user_has_project_access(auth.uid(), l.project_id)
        )
    );

-- Agents/admins can manage all option components
CREATE POLICY "option_components_manage_agents_admins" ON public.option_components
    FOR ALL USING (is_agent_or_admin(auth.uid()));

-- =============================================================================
-- SELECTIONS POLICIES
-- =============================================================================

-- Users can see selections for legs they have access to
CREATE POLICY "selections_select" ON public.selections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.legs l
            WHERE l.id = leg_id
            AND user_has_project_access(auth.uid(), l.project_id)
        )
    );

-- Users can make selections for legs they have access to (clients can select)
CREATE POLICY "selections_insert" ON public.selections
    FOR INSERT WITH CHECK (
        auth.uid() = selected_by
        AND EXISTS (
            SELECT 1 FROM public.legs l
            WHERE l.id = leg_id
            AND user_has_project_access(auth.uid(), l.project_id)
        )
    );

-- Users can update their own selections
CREATE POLICY "selections_update_own" ON public.selections
    FOR UPDATE USING (auth.uid() = selected_by);

-- Agents/admins can manage all selections
CREATE POLICY "selections_manage_agents_admins" ON public.selections
    FOR ALL USING (is_agent_or_admin(auth.uid()));

-- =============================================================================
-- HOLDS POLICIES
-- =============================================================================

-- Users can see holds for personnel in projects they have access to
CREATE POLICY "holds_select" ON public.holds
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tour_personnel tp
            WHERE tp.id = personnel_id
            AND user_has_project_access(auth.uid(), tp.project_id)
        )
    );

-- Agents/admins can manage all holds
CREATE POLICY "holds_manage_agents_admins" ON public.holds
    FOR ALL USING (is_agent_or_admin(auth.uid()));

-- =============================================================================
-- PNRS POLICIES
-- =============================================================================

-- Users can see PNRs for personnel in projects they have access to
CREATE POLICY "pnrs_select" ON public.pnrs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tour_personnel tp
            WHERE tp.id = personnel_id
            AND user_has_project_access(auth.uid(), tp.project_id)
        )
    );

-- Agents/admins can manage all PNRs
CREATE POLICY "pnrs_manage_agents_admins" ON public.pnrs
    FOR ALL USING (is_agent_or_admin(auth.uid()));

-- =============================================================================
-- DOCUMENTS POLICIES
-- =============================================================================

-- Users can see documents for projects they have access to
CREATE POLICY "documents_select" ON public.documents
    FOR SELECT USING (
        (project_id IS NOT NULL AND user_has_project_access(auth.uid(), project_id))
        OR (leg_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.legs l
            WHERE l.id = leg_id
            AND user_has_project_access(auth.uid(), l.project_id)
        ))
        OR (personnel_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.tour_personnel tp
            WHERE tp.id = personnel_id
            AND user_has_project_access(auth.uid(), tp.project_id)
        ))
    );

-- Agents/admins can manage all documents
CREATE POLICY "documents_manage_agents_admins" ON public.documents
    FOR ALL USING (is_agent_or_admin(auth.uid()));

-- =============================================================================
-- CHAT MESSAGES POLICIES
-- =============================================================================

-- Users can see chat messages for legs they have access to
CREATE POLICY "chat_messages_select" ON public.chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.legs l
            WHERE l.id = leg_id
            AND user_has_project_access(auth.uid(), l.project_id)
        )
    );

-- Users can send messages to legs they have access to
CREATE POLICY "chat_messages_insert" ON public.chat_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM public.legs l
            WHERE l.id = leg_id
            AND user_has_project_access(auth.uid(), l.project_id)
        )
    );

-- Users can update their own messages
CREATE POLICY "chat_messages_update_own" ON public.chat_messages
    FOR UPDATE USING (auth.uid() = sender_id);

-- Agents/admins can manage all chat messages
CREATE POLICY "chat_messages_manage_agents_admins" ON public.chat_messages
    FOR ALL USING (is_agent_or_admin(auth.uid()));

-- =============================================================================
-- NOTIFICATIONS POLICIES
-- =============================================================================

-- Users can only see their own notifications
CREATE POLICY "notifications_select_own" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read, etc.)
CREATE POLICY "notifications_update_own" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- System can insert notifications (via service role)
CREATE POLICY "notifications_insert_system" ON public.notifications
    FOR INSERT WITH CHECK (true); -- This will be restricted by service role

-- Agents/admins can manage all notifications
CREATE POLICY "notifications_manage_agents_admins" ON public.notifications
    FOR ALL USING (is_agent_or_admin(auth.uid()));

-- =============================================================================
-- AUTOMATED FUNCTIONS
-- =============================================================================

-- Function to automatically expire holds
CREATE OR REPLACE FUNCTION expire_holds()
RETURNS void AS $$
BEGIN
    UPDATE public.holds 
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'active' 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification for hold expiry
CREATE OR REPLACE FUNCTION notify_hold_expiry()
RETURNS TRIGGER AS $$
BEGIN
    -- Only notify when status changes to expired
    IF OLD.status = 'active' AND NEW.status = 'expired' THEN
        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            message,
            related_id,
            related_table
        ) VALUES (
            NEW.held_by,
            'hold_expiry',
            'Hold Expired',
            'Your flight hold has expired and been released.',
            NEW.id,
            'holds'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for hold expiry notifications
CREATE TRIGGER notify_hold_expiry_trigger
    AFTER UPDATE ON public.holds
    FOR EACH ROW
    EXECUTE FUNCTION notify_hold_expiry();
