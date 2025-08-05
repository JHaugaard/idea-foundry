-- Add Google Drive columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN google_drive_access_token TEXT,
ADD COLUMN google_drive_refresh_token TEXT;

-- Create drive_files table for tracking Google Drive uploads
CREATE TABLE public.drive_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  google_drive_file_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  file_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.drive_files ENABLE ROW LEVEL SECURITY;

-- Create policies for drive_files table
CREATE POLICY "Users can view their own drive files" 
ON public.drive_files 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own drive files" 
ON public.drive_files 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drive files" 
ON public.drive_files 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own drive files" 
ON public.drive_files 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_drive_files_updated_at
BEFORE UPDATE ON public.drive_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();