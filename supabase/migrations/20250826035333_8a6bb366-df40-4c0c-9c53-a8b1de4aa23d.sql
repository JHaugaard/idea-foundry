-- Update legacy note titles to first 5 words for text notes only
-- This only affects notes that are not files (don't have file extensions) or URLs

DO $$
DECLARE
  note_record RECORD;
  new_title TEXT;
  words TEXT[];
BEGIN
  -- Loop through notes that need title truncation
  FOR note_record IN 
    SELECT id, title 
    FROM notes 
    WHERE review_status = 'not_reviewed'
      AND title IS NOT NULL
      AND title != ''
      -- Exclude files (titles ending with common file extensions)
      AND NOT (title ~* '\.(jpg|jpeg|png|gif|bmp|svg|pdf|doc|docx|txt|csv|xlsx|xls|ppt|pptx|mp3|mp4|avi|mov|zip|rar)$')
      -- Exclude URLs (titles starting with http/https or www)
      AND NOT (title ~* '^(https?://|www\.)')
      -- Only process titles that have more than 5 words
      AND array_length(string_to_array(trim(title), ' '), 1) > 5
  LOOP
    -- Split title into words and take first 5
    words := string_to_array(trim(note_record.title), ' ');
    new_title := array_to_string(words[1:5], ' ');
    
    -- Update the note with truncated title
    UPDATE notes 
    SET title = new_title, updated_at = now()
    WHERE id = note_record.id;
    
    RAISE NOTICE 'Updated note % from "%" to "%"', note_record.id, note_record.title, new_title;
  END LOOP;
END $$;