-- Migration: Resolved Tickets System
-- Description: Creates tables and functions for managing resolved tickets and history

-- Create resolved_tickets table for archiving completed tickets
CREATE TABLE IF NOT EXISTS resolved_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  original_created_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_by UUID NOT NULL REFERENCES user_profiles(id),
  created_by UUID NOT NULL REFERENCES user_profiles(id),
  assigned_to UUID REFERENCES user_profiles(id),
  
  -- Ticket data snapshot
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type ticket_type NOT NULL DEFAULT 'maintenance',
  priority ticket_priority NOT NULL DEFAULT 'medium',
  location TEXT NOT NULL,
  equipment_id UUID REFERENCES equipment(id),
  
  -- Resolution metrics
  resolution_time_hours DECIMAL(10,2),
  resolution_notes TEXT,
  final_status ticket_status NOT NULL DEFAULT 'resolved',
  
  -- Audit fields
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_resolved_tickets_resolved_at ON resolved_tickets(resolved_at);
CREATE INDEX IF NOT EXISTS idx_resolved_tickets_resolved_by ON resolved_tickets(resolved_by);
CREATE INDEX IF NOT EXISTS idx_resolved_tickets_created_by ON resolved_tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_resolved_tickets_type ON resolved_tickets(type);
CREATE INDEX IF NOT EXISTS idx_resolved_tickets_priority ON resolved_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_resolved_tickets_ticket_id ON resolved_tickets(ticket_id);

-- Add foreign key constraints with proper names
ALTER TABLE resolved_tickets 
ADD CONSTRAINT fk_resolved_tickets_resolved_by 
FOREIGN KEY (resolved_by) REFERENCES user_profiles(id);

ALTER TABLE resolved_tickets 
ADD CONSTRAINT fk_resolved_tickets_created_by 
FOREIGN KEY (created_by) REFERENCES user_profiles(id);

ALTER TABLE resolved_tickets 
ADD CONSTRAINT fk_resolved_tickets_assigned_to 
FOREIGN KEY (assigned_to) REFERENCES user_profiles(id);

-- Create function to get top ticket resolvers
CREATE OR REPLACE FUNCTION get_top_resolvers(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  user_id UUID,
  user_profile JSONB,
  count BIGINT,
  avg_time DECIMAL
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rt.resolved_by as user_id,
    to_jsonb(up.*) as user_profile,
    COUNT(rt.id) as count,
    ROUND(AVG(rt.resolution_time_hours)::decimal, 2) as avg_time
  FROM resolved_tickets rt
  JOIN user_profiles up ON rt.resolved_by = up.id
  WHERE rt.resolved_at >= NOW() - INTERVAL '90 days'
  GROUP BY rt.resolved_by, up.id
  ORDER BY count DESC, avg_time ASC
  LIMIT limit_count;
END;
$$;

-- Create function to get resolution trends
CREATE OR REPLACE FUNCTION get_resolution_trends(
  user_id_filter UUID DEFAULT NULL,
  months_back INTEGER DEFAULT 6
)
RETURNS TABLE (
  month TEXT,
  count BIGINT,
  avg_time DECIMAL
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    to_char(rt.resolved_at, 'YYYY-MM') as month,
    COUNT(rt.id) as count,
    ROUND(AVG(rt.resolution_time_hours)::decimal, 2) as avg_time
  FROM resolved_tickets rt
  WHERE rt.resolved_at >= NOW() - (months_back || ' months')::INTERVAL
    AND (user_id_filter IS NULL OR rt.resolved_by = user_id_filter)
  GROUP BY to_char(rt.resolved_at, 'YYYY-MM')
  ORDER BY month;
END;
$$;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_resolved_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_resolved_tickets_updated_at
  BEFORE UPDATE ON resolved_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_resolved_tickets_updated_at();

-- Add resolved_by field to tickets table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tickets' AND column_name = 'resolved_by'
  ) THEN
    ALTER TABLE tickets ADD COLUMN resolved_by UUID REFERENCES user_profiles(id);
    CREATE INDEX IF NOT EXISTS idx_tickets_resolved_by ON tickets(resolved_by);
  END IF;
END $$;

-- Create view for easy resolved ticket querying with user profiles
CREATE OR REPLACE VIEW resolved_tickets_with_profiles AS
SELECT 
  rt.*,
  cb.full_name as created_by_name,
  cb.email as created_by_email,
  ab.full_name as assigned_to_name,
  ab.email as assigned_to_email,
  rb.full_name as resolved_by_name,
  rb.email as resolved_by_email
FROM resolved_tickets rt
LEFT JOIN user_profiles cb ON rt.created_by = cb.id
LEFT JOIN user_profiles ab ON rt.assigned_to = ab.id
LEFT JOIN user_profiles rb ON rt.resolved_by = rb.id;

-- Create RLS policies for resolved_tickets
ALTER TABLE resolved_tickets ENABLE ROW LEVEL SECURITY;

-- Admins can see all resolved tickets
CREATE POLICY "Admins can view all resolved tickets" ON resolved_tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Supervisors can see all resolved tickets
CREATE POLICY "Supervisors can view all resolved tickets" ON resolved_tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'supervisor'
    )
  );

-- Field engineers can see tickets they were involved with
CREATE POLICY "Field engineers can view their resolved tickets" ON resolved_tickets
  FOR SELECT USING (
    auth.uid() IN (created_by, assigned_to, resolved_by)
  );

-- Only admins and supervisors can insert resolved tickets
CREATE POLICY "Admins and supervisors can archive tickets" ON resolved_tickets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );

-- Prevent updates to resolved tickets (they should be immutable)
CREATE POLICY "Resolved tickets are read-only" ON resolved_tickets
  FOR UPDATE USING (false);

-- Only admins can delete resolved tickets (for cleanup)
CREATE POLICY "Only admins can delete resolved tickets" ON resolved_tickets
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create notification trigger for resolved tickets
CREATE OR REPLACE FUNCTION notify_ticket_resolved()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert notification for ticket creator
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      priority,
      ticket_id,
      triggered_by,
      metadata
    )
    SELECT 
      NEW.created_by,
      'ticket_resolved',
      'Your Ticket Has Been Resolved',
      'Ticket "' || NEW.title || '" has been marked as resolved',
      CASE 
        WHEN NEW.priority = 'critical' THEN 'high'::notification_priority
        WHEN NEW.priority = 'high' THEN 'medium'::notification_priority
        ELSE 'low'::notification_priority
      END,
      NEW.id,
      NEW.resolved_by,
      jsonb_build_object(
        'ticketNumber', NEW.ticket_number,
        'resolvedAt', NEW.resolved_at,
        'location', NEW.location
      )
    WHERE NEW.created_by IS NOT NULL
      AND NEW.created_by != NEW.resolved_by; -- Don't notify if they resolved their own ticket
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on tickets table to send notifications
DROP TRIGGER IF EXISTS trigger_notify_ticket_resolved ON tickets;
CREATE TRIGGER trigger_notify_ticket_resolved
  AFTER UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_ticket_resolved();

-- Add comments for documentation
COMMENT ON TABLE resolved_tickets IS 'Archives completed tickets for historical analysis and reporting';
COMMENT ON COLUMN resolved_tickets.resolution_time_hours IS 'Time taken to resolve the ticket in hours';
COMMENT ON COLUMN resolved_tickets.resolution_notes IS 'Notes about how the ticket was resolved';
COMMENT ON FUNCTION get_top_resolvers IS 'Returns top ticket resolvers by count and average resolution time';
COMMENT ON FUNCTION get_resolution_trends IS 'Returns monthly resolution trends for analytics';
