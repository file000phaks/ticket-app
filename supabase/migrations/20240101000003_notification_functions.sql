-- Create function to send notifications when tickets are assigned
CREATE OR REPLACE FUNCTION public.notify_ticket_assignment()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create notification if ticket is being assigned (not unassigned)
    IF NEW.assigned_to IS NOT NULL AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
        INSERT INTO notifications (user_id, ticket_id, type, title, message)
        VALUES (
            NEW.assigned_to,
            NEW.id,
            'ticket_assigned',
            'New Ticket Assigned',
            'You have been assigned ticket: ' || NEW.title
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to send notifications for status changes
CREATE OR REPLACE FUNCTION public.notify_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify ticket creator and assigned user of status changes
    IF OLD.status != NEW.status THEN
        -- Notify creator if they're not the one making the change
        IF NEW.created_by != auth.uid() THEN
            INSERT INTO notifications (user_id, ticket_id, type, title, message)
            VALUES (
                NEW.created_by,
                NEW.id,
                'status_change',
                'Ticket Status Updated',
                'Ticket "' || NEW.title || '" status changed to ' || NEW.status
            );
        END IF;
        
        -- Notify assigned user if they exist and aren't the one making the change
        IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to != auth.uid() THEN
            INSERT INTO notifications (user_id, ticket_id, type, title, message)
            VALUES (
                NEW.assigned_to,
                NEW.id,
                'status_change',
                'Assigned Ticket Updated',
                'Ticket "' || NEW.title || '" status changed to ' || NEW.status
            );
        END IF;
        
        -- Notify supervisors for critical/high priority tickets
        IF NEW.priority IN ('critical', 'high') THEN
            INSERT INTO notifications (user_id, ticket_id, type, title, message)
            SELECT 
                up.id,
                NEW.id,
                'status_change',
                'Priority Ticket Update',
                'High priority ticket "' || NEW.title || '" status changed to ' || NEW.status
            FROM user_profiles up
            WHERE up.role = 'supervisor' 
            AND up.is_active = true
            AND up.id != auth.uid();
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check for overdue tickets
CREATE OR REPLACE FUNCTION public.check_overdue_tickets()
RETURNS void AS $$
BEGIN
    -- Create notifications for tickets that are overdue
    INSERT INTO notifications (user_id, ticket_id, type, title, message)
    SELECT 
        COALESCE(t.assigned_to, t.created_by) as user_id,
        t.id,
        'overdue',
        'Ticket Overdue',
        'Ticket "' || t.title || '" is overdue and requires attention'
    FROM tickets t
    WHERE t.due_date < NOW()
    AND t.status NOT IN ('resolved', 'verified', 'closed')
    AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.ticket_id = t.id
        AND n.type = 'overdue'
        AND n.created_at > NOW() - INTERVAL '24 hours'
    );
    
    -- Also notify supervisors about overdue tickets
    INSERT INTO notifications (user_id, ticket_id, type, title, message)
    SELECT 
        up.id,
        t.id,
        'overdue',
        'Overdue Ticket Alert',
        'Ticket "' || t.title || '" assigned to ' || 
        COALESCE(assigned_user.full_name, assigned_user.email, 'Unassigned') || ' is overdue'
    FROM tickets t
    CROSS JOIN user_profiles up
    LEFT JOIN user_profiles assigned_user ON t.assigned_to = assigned_user.id
    WHERE t.due_date < NOW()
    AND t.status NOT IN ('resolved', 'verified', 'closed')
    AND up.role = 'supervisor'
    AND up.is_active = true
    AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.ticket_id = t.id
        AND n.user_id = up.id
        AND n.type = 'overdue'
        AND n.created_at > NOW() - INTERVAL '24 hours'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to escalate tickets
CREATE OR REPLACE FUNCTION public.escalate_tickets()
RETURNS void AS $$
BEGIN
    -- Escalate tickets that have been open for too long based on priority
    WITH escalation_rules AS (
        SELECT 
            'critical'::ticket_priority as priority,
            INTERVAL '2 hours' as max_time
        UNION ALL
        SELECT 'high'::ticket_priority, INTERVAL '8 hours'
        UNION ALL
        SELECT 'medium'::ticket_priority, INTERVAL '24 hours'
        UNION ALL
        SELECT 'low'::ticket_priority, INTERVAL '72 hours'
    )
    INSERT INTO notifications (user_id, ticket_id, type, title, message)
    SELECT 
        up.id,
        t.id,
        'escalated',
        'Ticket Escalated',
        'Ticket "' || t.title || '" has been escalated due to ' || t.priority || ' priority timeout'
    FROM tickets t
    JOIN escalation_rules er ON t.priority = er.priority
    CROSS JOIN user_profiles up
    WHERE t.created_at < NOW() - er.max_time
    AND t.status IN ('open', 'assigned')
    AND up.role IN ('supervisor', 'admin')
    AND up.is_active = true
    AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.ticket_id = t.id
        AND n.type = 'escalated'
        AND n.created_at > NOW() - INTERVAL '24 hours'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for notifications
CREATE TRIGGER ticket_assignment_notification
    AFTER UPDATE ON tickets
    FOR EACH ROW
    WHEN (OLD.assigned_to IS DISTINCT FROM NEW.assigned_to)
    EXECUTE FUNCTION notify_ticket_assignment();

CREATE TRIGGER ticket_status_notification
    AFTER UPDATE ON tickets
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION notify_status_change();

-- Create function to get user statistics
CREATE OR REPLACE FUNCTION public.get_user_ticket_stats(user_uuid UUID)
RETURNS TABLE(
    total_created INTEGER,
    total_assigned INTEGER,
    open_assigned INTEGER,
    in_progress_assigned INTEGER,
    resolved_this_week INTEGER,
    avg_resolution_hours DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM tickets WHERE created_by = user_uuid),
        (SELECT COUNT(*)::INTEGER FROM tickets WHERE assigned_to = user_uuid),
        (SELECT COUNT(*)::INTEGER FROM tickets WHERE assigned_to = user_uuid AND status IN ('open', 'assigned')),
        (SELECT COUNT(*)::INTEGER FROM tickets WHERE assigned_to = user_uuid AND status = 'in_progress'),
        (SELECT COUNT(*)::INTEGER FROM tickets WHERE assigned_to = user_uuid AND status = 'resolved' AND resolved_at > NOW() - INTERVAL '7 days'),
        (SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600)::DECIMAL FROM tickets WHERE assigned_to = user_uuid AND resolved_at IS NOT NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get ticket dashboard data
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(user_uuid UUID)
RETURNS TABLE(
    user_role user_role,
    total_tickets INTEGER,
    open_tickets INTEGER,
    assigned_tickets INTEGER,
    in_progress_tickets INTEGER,
    resolved_tickets INTEGER,
    critical_tickets INTEGER,
    overdue_tickets INTEGER
) AS $$
DECLARE
    current_user_role user_role;
BEGIN
    -- Get user role
    SELECT role INTO current_user_role FROM user_profiles WHERE id = user_uuid;
    
    RETURN QUERY
    SELECT 
        current_user_role,
        CASE 
            WHEN current_user_role IN ('admin', 'supervisor') THEN 
                (SELECT COUNT(*)::INTEGER FROM tickets)
            ELSE 
                (SELECT COUNT(*)::INTEGER FROM tickets WHERE created_by = user_uuid OR assigned_to = user_uuid)
        END,
        CASE 
            WHEN current_user_role IN ('admin', 'supervisor') THEN 
                (SELECT COUNT(*)::INTEGER FROM tickets WHERE status = 'open')
            ELSE 
                (SELECT COUNT(*)::INTEGER FROM tickets WHERE (created_by = user_uuid OR assigned_to = user_uuid) AND status = 'open')
        END,
        CASE 
            WHEN current_user_role IN ('admin', 'supervisor') THEN 
                (SELECT COUNT(*)::INTEGER FROM tickets WHERE status = 'assigned')
            ELSE 
                (SELECT COUNT(*)::INTEGER FROM tickets WHERE assigned_to = user_uuid AND status = 'assigned')
        END,
        CASE 
            WHEN current_user_role IN ('admin', 'supervisor') THEN 
                (SELECT COUNT(*)::INTEGER FROM tickets WHERE status = 'in_progress')
            ELSE 
                (SELECT COUNT(*)::INTEGER FROM tickets WHERE assigned_to = user_uuid AND status = 'in_progress')
        END,
        CASE 
            WHEN current_user_role IN ('admin', 'supervisor') THEN 
                (SELECT COUNT(*)::INTEGER FROM tickets WHERE status = 'resolved')
            ELSE 
                (SELECT COUNT(*)::INTEGER FROM tickets WHERE (created_by = user_uuid OR assigned_to = user_uuid) AND status = 'resolved')
        END,
        CASE 
            WHEN current_user_role IN ('admin', 'supervisor') THEN 
                (SELECT COUNT(*)::INTEGER FROM tickets WHERE priority = 'critical')
            ELSE 
                (SELECT COUNT(*)::INTEGER FROM tickets WHERE (created_by = user_uuid OR assigned_to = user_uuid) AND priority = 'critical')
        END,
        CASE 
            WHEN current_user_role IN ('admin', 'supervisor') THEN 
                (SELECT COUNT(*)::INTEGER FROM tickets WHERE due_date < NOW() AND status NOT IN ('resolved', 'verified', 'closed'))
            ELSE 
                (SELECT COUNT(*)::INTEGER FROM tickets WHERE (created_by = user_uuid OR assigned_to = user_uuid) AND due_date < NOW() AND status NOT IN ('resolved', 'verified', 'closed'))
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
