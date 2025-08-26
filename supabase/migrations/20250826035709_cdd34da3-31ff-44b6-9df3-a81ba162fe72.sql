-- Now update legacy note titles to first 5 words for text notes only
UPDATE notes 
SET title = array_to_string((string_to_array(trim(title), ' '))[1:5], ' ')
WHERE review_status = 'not_reviewed'
  AND title IS NOT NULL
  AND title != ''
  -- Exclude files (titles ending with common file extensions)
  AND NOT (title ~* '\.(jpg|jpeg|png|gif|bmp|svg|pdf|doc|docx|txt|csv|xlsx|xls|ppt|pptx|mp3|mp4|avi|mov|zip|rar)$')
  -- Exclude URLs (titles starting with http/https or www)
  AND NOT (title ~* '^(https?://|www\.)')
  -- Only process titles that have more than 5 words
  AND array_length(string_to_array(trim(title), ' '), 1) > 5;