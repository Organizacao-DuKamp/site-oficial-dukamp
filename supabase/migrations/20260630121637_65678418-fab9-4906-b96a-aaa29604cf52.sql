CREATE POLICY "Users manage own avatars in media"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'media' AND (storage.foldername(name))[1] = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text)
WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text);