-- Create storage bucket for ticket media
INSERT INTO storage.buckets (id, name, public) VALUES ('ticket-media', 'ticket-media', true);

-- Create storage policies for ticket media bucket
CREATE POLICY "Users can view ticket media" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'ticket-media' AND
        (
            -- Allow if user created the ticket or is assigned to it
            EXISTS (
                SELECT 1 FROM tickets t, ticket_media tm
                WHERE tm.storage_path = name
                AND t.id = tm.ticket_id
                AND (t.created_by = auth.uid() OR t.assigned_to = auth.uid())
            )
            OR
            -- Allow admins and supervisors to view all media
            EXISTS (
                SELECT 1 FROM user_profiles 
                WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
            )
        )
    );

CREATE POLICY "Users can upload ticket media" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'ticket-media' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Users can update their uploaded media" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'ticket-media' AND
        (
            owner = auth.uid() OR
            EXISTS (
                SELECT 1 FROM user_profiles 
                WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
            )
        )
    );

CREATE POLICY "Users can delete their uploaded media" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'ticket-media' AND
        (
            owner = auth.uid() OR
            EXISTS (
                SELECT 1 FROM user_profiles 
                WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
            )
        )
    );

-- Create avatar storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Create storage policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars' AND
        auth.role() = 'authenticated' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can update their own avatar" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'avatars' AND
        auth.role() = 'authenticated' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can delete their own avatar" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'avatars' AND
        auth.role() = 'authenticated' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );
