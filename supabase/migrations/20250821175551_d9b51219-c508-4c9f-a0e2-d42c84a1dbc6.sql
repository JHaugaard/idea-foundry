-- Create invitation tokens table for controlled sign-ups
CREATE TABLE public.invitation_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  email TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  used_at TIMESTAMP WITH TIME ZONE,
  used_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.invitation_tokens ENABLE ROW LEVEL SECURITY;

-- Policies for invitation tokens
CREATE POLICY "Only creators can view their tokens" 
ON public.invitation_tokens 
FOR SELECT 
USING (created_by = auth.uid());

CREATE POLICY "Authenticated users can create tokens" 
ON public.invitation_tokens 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Only creators can update their tokens" 
ON public.invitation_tokens 
FOR UPDATE 
USING (created_by = auth.uid());

-- Index for performance
CREATE INDEX idx_invitation_tokens_token ON public.invitation_tokens(token);
CREATE INDEX idx_invitation_tokens_email ON public.invitation_tokens(email);
CREATE INDEX idx_invitation_tokens_expires_at ON public.invitation_tokens(expires_at);

-- Function to validate invitation token
CREATE OR REPLACE FUNCTION public.validate_invitation_token(token_uuid UUID)
RETURNS TABLE(
  is_valid BOOLEAN,
  token_id UUID,
  email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  token_record RECORD;
BEGIN
  -- Get token record
  SELECT * INTO token_record
  FROM public.invitation_tokens
  WHERE token = token_uuid
    AND is_active = true
    AND expires_at > now()
    AND current_uses < max_uses;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false::BOOLEAN, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT true::BOOLEAN, token_record.id, token_record.email;
END;
$$;

-- Function to mark token as used
CREATE OR REPLACE FUNCTION public.use_invitation_token(token_uuid UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  token_record RECORD;
BEGIN
  -- Update token usage
  UPDATE public.invitation_tokens
  SET 
    current_uses = current_uses + 1,
    used_at = CASE 
      WHEN used_at IS NULL THEN now() 
      ELSE used_at 
    END,
    used_by = CASE 
      WHEN used_by IS NULL THEN user_id 
      ELSE used_by 
    END,
    is_active = CASE 
      WHEN current_uses + 1 >= max_uses THEN false 
      ELSE is_active 
    END
  WHERE token = token_uuid
    AND is_active = true
    AND expires_at > now()
    AND current_uses < max_uses
  RETURNING * INTO token_record;

  RETURN FOUND;
END;
$$;