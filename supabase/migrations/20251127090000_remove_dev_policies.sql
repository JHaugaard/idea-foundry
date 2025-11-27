-- Remove dev-only RLS policies that allowed anonymous access
-- These were for local development only and must be removed for production

DROP POLICY IF EXISTS "dev_anon_can_select_dev_user_notes" ON public.notes;
DROP POLICY IF EXISTS "dev_anon_can_insert_dev_user_notes" ON public.notes;
DROP POLICY IF EXISTS "dev_anon_can_update_dev_user_notes" ON public.notes;
DROP POLICY IF EXISTS "dev_anon_can_delete_dev_user_notes" ON public.notes;

-- Verify proper authenticated-user policies exist
-- These should already be in place from earlier migrations

SELECT 'Dev-only policies removed successfully' AS status;
