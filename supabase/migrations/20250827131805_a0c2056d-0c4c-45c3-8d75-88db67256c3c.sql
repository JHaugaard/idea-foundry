
-- Dev-only RLS policies to allow anonymous access for a specific DEV user ID.
-- IMPORTANT: Remove these before production.

-- Allow anon to SELECT dev user's notes
CREATE POLICY "dev_anon_can_select_dev_user_notes"
ON public.notes
FOR SELECT
TO anon
USING (user_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- Allow anon to INSERT notes for the dev user
CREATE POLICY "dev_anon_can_insert_dev_user_notes"
ON public.notes
FOR INSERT
TO anon
WITH CHECK (user_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- Allow anon to UPDATE dev user's notes
CREATE POLICY "dev_anon_can_update_dev_user_notes"
ON public.notes
FOR UPDATE
TO anon
USING (user_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- Allow anon to DELETE dev user's notes (optional, for completeness during dev)
CREATE POLICY "dev_anon_can_delete_dev_user_notes"
ON public.notes
FOR DELETE
TO anon
USING (user_id = '00000000-0000-0000-0000-000000000001'::uuid);
