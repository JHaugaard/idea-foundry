-- Update legacy note titles to first 5 words for text notes only
UPDATE notes 
SET title = array_to_string((string_to_array(trim(title), ' '))[1:5], ' ')
WHERE review_status = 'not_reviewed'
  AND title IS NOT NULL
  AND title != ''
  AND NOT (title ~* '\.(jpg|jpeg|png|gif|bmp|svg|pdf|doc|docx|txt|csv|xlsx|xls|ppt|pptx|mp3|mp4|avi|mov|zip|rar)$')
  AND NOT (title ~* '^(https?://|www\.)')
  AND array_length(string_to_array(trim(title), ' '), 1) > 5;