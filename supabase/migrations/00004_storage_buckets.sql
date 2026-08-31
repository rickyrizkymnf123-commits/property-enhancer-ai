-- ============================================================================
-- Migration 00004: Storage Buckets & Access Control
-- Private 'images' bucket and RLS policies for user isolation
-- ============================================================================

-- Ensure 'images' storage bucket exists with 20MB limit and allowed MIME types
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'images',
    'images',
    false,
    20971520, -- 20 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 20971520,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Storage RLS Policies on storage.objects

-- 1. Users can upload images to their own directory (e.g. originals/userId/..., enhanced/userId/...)
DROP POLICY IF EXISTS "storage_images_insert_own" ON storage.objects;
CREATE POLICY "storage_images_insert_own" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'images'
    AND (
        (auth.role() = 'authenticated' AND (storage.foldername(name))[2] = auth.uid()::text)
        OR public.has_role(auth.uid(), 'admin')
        OR auth.uid() IS NULL -- Service role / Edge function bypass
    )
);

-- 2. Users can read/download images from their own directory; Admins can read all
DROP POLICY IF EXISTS "storage_images_select_own" ON storage.objects;
CREATE POLICY "storage_images_select_own" ON storage.objects
FOR SELECT USING (
    bucket_id = 'images'
    AND (
        (auth.role() = 'authenticated' AND (storage.foldername(name))[2] = auth.uid()::text)
        OR public.has_role(auth.uid(), 'admin')
        OR auth.uid() IS NULL -- Service role / Edge function bypass
    )
);

-- 3. Users can update their own images; Admins can update all
DROP POLICY IF EXISTS "storage_images_update_own" ON storage.objects;
CREATE POLICY "storage_images_update_own" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'images'
    AND (
        (auth.role() = 'authenticated' AND (storage.foldername(name))[2] = auth.uid()::text)
        OR public.has_role(auth.uid(), 'admin')
        OR auth.uid() IS NULL
    )
)
WITH CHECK (
    bucket_id = 'images'
    AND (
        (auth.role() = 'authenticated' AND (storage.foldername(name))[2] = auth.uid()::text)
        OR public.has_role(auth.uid(), 'admin')
        OR auth.uid() IS NULL
    )
);

-- 4. Users can delete images from their own directory; Admins can delete all
DROP POLICY IF EXISTS "storage_images_delete_own" ON storage.objects;
CREATE POLICY "storage_images_delete_own" ON storage.objects
FOR DELETE USING (
    bucket_id = 'images'
    AND (
        (auth.role() = 'authenticated' AND (storage.foldername(name))[2] = auth.uid()::text)
        OR public.has_role(auth.uid(), 'admin')
        OR auth.uid() IS NULL
    )
);
