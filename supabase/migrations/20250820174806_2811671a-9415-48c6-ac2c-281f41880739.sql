-- Fix security warnings by setting search_path for functions
CREATE OR REPLACE FUNCTION public.validate_tag_name(tag_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check length (2-30 characters)
  IF LENGTH(tag_name) < 2 OR LENGTH(tag_name) > 30 THEN
    RETURN FALSE;
  END IF;
  
  -- Check if lowercase and hyphen-separated (no spaces, special chars except hyphens)
  IF tag_name !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN
    RETURN FALSE;
  END IF;
  
  -- Cannot start or end with hyphen
  IF LEFT(tag_name, 1) = '-' OR RIGHT(tag_name, 1) = '-' THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.format_tag_name(tag_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Convert to lowercase, replace spaces and underscores with hyphens
  tag_name := LOWER(TRIM(tag_name));
  tag_name := REGEXP_REPLACE(tag_name, '[_\s]+', '-', 'g');
  
  -- Remove special characters except hyphens and alphanumeric
  tag_name := REGEXP_REPLACE(tag_name, '[^a-z0-9-]', '', 'g');
  
  -- Remove multiple consecutive hyphens
  tag_name := REGEXP_REPLACE(tag_name, '-+', '-', 'g');
  
  -- Remove leading and trailing hyphens
  tag_name := TRIM(tag_name, '-');
  
  RETURN tag_name;
END;
$$;