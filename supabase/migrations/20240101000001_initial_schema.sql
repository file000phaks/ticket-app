-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types for enums
CREATE TYPE user_role AS ENUM ('admin', 'supervisor', 'field_engineer');
CREATE TYPE ticket_status AS ENUM ('open', 'assigned', 'in_progress', 'resolved', 'verified', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE ticket_type AS ENUM ('fault', 'maintenance', 'inspection', 'upgrade');
CREATE TYPE activity_type AS ENUM ('created', 'assigned', 'status_change', 'comment', 'media_upload', 'verification');
CREATE TYPE notification_type AS ENUM ('ticket_assigned', 'status_change', 'overdue', 'escalated', 'verified');

-- Create user profiles table
CREATE TABLE user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role user_role NOT NULL DEFAULT 'field_engineer',
    department TEXT,
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create equipment table
CREATE TABLE equipment (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    equipment_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT,
    location TEXT,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create tickets table
CREATE TABLE tickets (
   
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type ticket_type NOT NULL DEFAULT 'fault',
    status ticket_status NOT NULL DEFAULT 'open',
    priority ticket_priority NOT NULL DEFAULT 'medium',
    
    -- Location and equipment
    location TEXT NOT NULL,
    equipment_id UUID REFERENCES equipment(id),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- People involved
    created_by UUID REFERENCES user_profiles(id) NOT NULL,
    assigned_to UUID REFERENCES user_profiles(id),
    verified_by UUID REFERENCES user_profiles(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    verified_at TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    
    -- Additional fields
    estimated_hours INTEGER,
    actual_hours INTEGER,
    cost_estimate DECIMAL(10, 2),
    actual_cost DECIMAL(10, 2)
);

-- Create ticket activities table for audit trail
CREATE TABLE ticket_activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES user_profiles(id) NOT NULL,
    type activity_type NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create ticket media table for attachments
CREATE TABLE ticket_media (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER,
    storage_path TEXT NOT NULL,
    uploaded_by UUID REFERENCES user_profiles(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create notifications table
CREATE TABLE notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    sent_email BOOLEAN NOT NULL DEFAULT false,
    sent_push BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create work sessions table for time tracking
CREATE TABLE work_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES user_profiles(id) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_tickets_created_by ON tickets(created_by);
CREATE INDEX idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);
CREATE INDEX idx_ticket_activities_ticket_id ON ticket_activities(ticket_id);
CREATE INDEX idx_ticket_activities_created_at ON ticket_activities(created_at);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- Set up Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON user_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create RLS policies for equipment
CREATE POLICY "All authenticated users can view equipment" ON equipment
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage equipment" ON equipment
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create RLS policies for tickets
CREATE POLICY "Users can view tickets they created or are assigned to" ON tickets
    FOR SELECT USING (
        auth.uid() = created_by OR 
        auth.uid() = assigned_to OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    );

CREATE POLICY "Field engineers can create tickets" ON tickets
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update tickets they created or are assigned to" ON tickets
    FOR UPDATE USING (
        auth.uid() = created_by OR 
        auth.uid() = assigned_to OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    );

CREATE POLICY "Admins can delete tickets" ON tickets
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create RLS policies for ticket_activities
CREATE POLICY "Users can view activities for accessible tickets" ON ticket_activities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tickets 
            WHERE id = ticket_id AND (
                created_by = auth.uid() OR 
                assigned_to = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM user_profiles 
                    WHERE user_profiles.id = auth.uid() AND role IN ('admin', 'supervisor')
                )
            )
        )
    );

CREATE POLICY "Users can create activities for accessible tickets" ON ticket_activities
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM tickets 
            WHERE id = ticket_id AND (
                created_by = auth.uid() OR 
                assigned_to = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM user_profiles 
                    WHERE user_profiles.id = auth.uid() AND role IN ('admin', 'supervisor')
                )
            )
        )
    );

-- Create RLS policies for ticket_media
CREATE POLICY "Users can view media for accessible tickets" ON ticket_media
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tickets 
            WHERE id = ticket_id AND (
                created_by = auth.uid() OR 
                assigned_to = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM user_profiles 
                    WHERE user_profiles.id = auth.uid() AND role IN ('admin', 'supervisor')
                )
            )
        )
    );

CREATE POLICY "Users can upload media for accessible tickets" ON ticket_media
    FOR INSERT WITH CHECK (
        auth.uid() = uploaded_by AND
        EXISTS (
            SELECT 1 FROM tickets 
            WHERE id = ticket_id AND (
                created_by = auth.uid() OR 
                assigned_to = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM user_profiles 
                    WHERE user_profiles.id = auth.uid() AND role IN ('admin', 'supervisor')
                )
            )
        )
    );

-- Create RLS policies for notifications
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for work_sessions
CREATE POLICY "Users can view their own work sessions" ON work_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own work sessions" ON work_sessions
    FOR ALL USING (auth.uid() = user_id);

-- Create functions for automatic user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_equipment_updated_at
    BEFORE UPDATE ON equipment
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Create function to automatically create ticket activities
CREATE OR REPLACE FUNCTION public.create_ticket_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO ticket_activities (ticket_id, user_id, type, description)
        VALUES (NEW.id, NEW.created_by, 'created', 'Ticket created: ' || NEW.title);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != NEW.status THEN
            INSERT INTO ticket_activities (ticket_id, user_id, type, description)
            VALUES (NEW.id, auth.uid(), 'status_change', 'Status changed from ' || OLD.status || ' to ' || NEW.status);
        END IF;
        
        IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
            INSERT INTO ticket_activities (ticket_id, user_id, type, description)
            VALUES (NEW.id, auth.uid(), 'assigned', 
                CASE 
                    WHEN NEW.assigned_to IS NULL THEN 'Ticket unassigned'
                    ELSE 'Ticket assigned to user'
                END);
        END IF;
        
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for automatic activity creation
CREATE TRIGGER create_ticket_activity_trigger
    AFTER INSERT OR UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION create_ticket_activity();

-- Insert some sample equipment
INSERT INTO equipment (equipment_id, name, type, location, description) VALUES
('GEN-001', 'Diesel Generator Unit 1', 'Generator', 'Power Plant - Building A', 'Primary backup power generator'),
('GEN-002', 'Diesel Generator Unit 2', 'Generator', 'Power Plant - Building A', 'Secondary backup power generator'),
('PUMP-001', 'Main Water Pump', 'Pump', 'Facility B - Ground Floor', 'Primary water circulation pump'),
('HVAC-001', 'Main Building HVAC', 'HVAC', 'Main Building - Roof', 'Central air conditioning system'),
('UPS-001', 'Server Room UPS', 'UPS', 'Data Center - Level B2', 'Uninterruptible power supply for servers');
