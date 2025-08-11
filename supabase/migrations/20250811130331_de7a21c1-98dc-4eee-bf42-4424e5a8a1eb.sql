-- Remove Google Drive integration artifacts while keeping app functional
-- 1) Drop trigger (if exists) tied to drive_files
DROP TRIGGER IF EXISTS update_drive_files_updated_at ON public.drive_files;

-- 2) Drop drive_files table (no app code references it)
DROP TABLE IF EXISTS public.drive_files;

-- 3) Remove Google OAuth token columns from profiles
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS google_drive_access_token,
  DROP COLUMN IF EXISTS google_drive_refresh_token;