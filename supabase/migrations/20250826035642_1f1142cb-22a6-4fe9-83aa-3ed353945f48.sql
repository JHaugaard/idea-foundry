-- First, fix the ambiguous column reference in the trigger function
CREATE OR REPLACE FUNCTION public.update_tag_usage_tracking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  tag_name_var text;
BEGIN
  -- Handle INSERT and UPDATE operations
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Update tag analytics for each tag
    IF NEW.tags IS NOT NULL THEN
      FOREACH tag_name_var IN ARRAY NEW.tags
      LOOP
        INSERT INTO public.tag_analytics (user_id, tag_name, total_usage_count, last_used_at)
        VALUES (NEW.user_id, tag_name_var, 1, now())
        ON CONFLICT (user_id, tag_name) 
        DO UPDATE SET 
          total_usage_count = tag_analytics.total_usage_count + 1,
          last_used_at = now(),
          updated_at = now();
      END LOOP;
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- Handle DELETE operations
  IF TG_OP = 'DELETE' THEN
    -- Decrease usage count for deleted tags
    IF OLD.tags IS NOT NULL THEN
      FOREACH tag_name_var IN ARRAY OLD.tags
      LOOP
        UPDATE public.tag_analytics 
        SET total_usage_count = GREATEST(0, total_usage_count - 1),
            updated_at = now()
        WHERE user_id = OLD.user_id AND tag_name = tag_name_var;
      END LOOP;
    END IF;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$function$;