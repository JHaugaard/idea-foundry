-- Create enums for the two category sets
CREATE TYPE public.review_status AS ENUM ('not_reviewed', 'reviewed');
CREATE TYPE public.category_type AS ENUM ('personal', 'work');

-- Add the new columns to the notes table
ALTER TABLE public.notes 
ADD COLUMN review_status public.review_status NOT NULL DEFAULT 'not_reviewed',
ADD COLUMN category_type public.category_type NOT NULL DEFAULT 'personal';