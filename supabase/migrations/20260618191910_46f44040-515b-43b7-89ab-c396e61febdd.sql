
CREATE POLICY "users read own study uploads" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'study-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users insert own study uploads" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'study-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users update own study uploads" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'study-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users delete own study uploads" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'study-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users read own avatar" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users insert own avatar" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users update own avatar" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users delete own avatar" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
