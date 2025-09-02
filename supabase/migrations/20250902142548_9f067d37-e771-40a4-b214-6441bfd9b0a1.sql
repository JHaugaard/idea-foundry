-- Add file attachments support to notes table
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS file_attachments JSONB DEFAULT '[]'::jsonb;

-- Create index for file attachments
CREATE INDEX IF NOT EXISTS idx_notes_file_attachments ON public.notes USING GIN(file_attachments);

-- Add comment for documentation
COMMENT ON COLUMN public.notes.file_attachments IS 'JSON array of file attachment objects with metadata like file paths, types, and names';