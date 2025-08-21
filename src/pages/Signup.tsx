import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [invitationToken, setInvitationToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tokenValidated, setTokenValidated] = useState(false);
  const [tokenEmail, setTokenEmail] = useState('');
  
  const { signUp, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
    
    // Check if token is provided in URL
    const token = searchParams.get('token');
    if (token) {
      setInvitationToken(token);
      validateToken(token);
    }
  }, [user, navigate, searchParams]);

  const validateToken = async (token: string) => {
    if (!token) return;
    
    try {
      const { data, error } = await supabase.rpc('validate_invitation_token', {
        token_uuid: token
      });

      if (error) throw error;
      
      if (data && data.length > 0) {
        const result = data[0];
        if (result.is_valid) {
          setTokenValidated(true);
          if (result.email) {
            setTokenEmail(result.email);
            setEmail(result.email);
          }
          toast({
            title: "Valid invitation",
            description: "Your invitation token has been validated.",
          });
        } else {
          toast({
            title: "Invalid invitation",
            description: "This invitation token is invalid or has expired.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Token validation error:', error);
      toast({
        title: "Validation error",
        description: "Unable to validate invitation token.",
        variant: "destructive",
      });
    }
  };

  const handleTokenValidation = async (e: React.FormEvent) => {
    e.preventDefault();
    validateToken(invitationToken);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tokenValidated) {
      toast({
        title: "Invalid invitation",
        description: "Please validate your invitation token first.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);

    try {
      const { error } = await signUp(email, password, displayName);

      if (error) {
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        // Mark token as used
        await supabase.rpc('use_invitation_token', {
          token_uuid: invitationToken,
          user_id: null // Will be updated after user confirms email
        });
        
        toast({
          title: "Account created!",
          description: "Please check your email to verify your account.",
        });
      }
    } catch (error) {
      console.error('Signup error:', error);
      toast({
        title: "Sign up failed",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Join Idea Foundry</CardTitle>
          <CardDescription>
            Create your account with an invitation token
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!tokenValidated ? (
            <form onSubmit={handleTokenValidation} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invitation-token">Invitation Token</Label>
                <Input
                  id="invitation-token"
                  type="text"
                  value={invitationToken}
                  onChange={(e) => setInvitationToken(e.target.value)}
                  required
                  placeholder="Enter your invitation token"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full"
                disabled={!invitationToken.trim()}
              >
                Validate Token
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Display Name</Label>
                <Input
                  id="signup-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                  disabled={!!tokenEmail}
                />
                {tokenEmail && (
                  <p className="text-sm text-muted-foreground">
                    Email provided by invitation token
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Create a password"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? "Creating account..." : "Sign Up"}
              </Button>
              
              <Button 
                type="button" 
                variant="outline" 
                className="w-full"
                onClick={() => setTokenValidated(false)}
              >
                Use Different Token
              </Button>
            </form>
          )}
          
          <div className="text-center">
            <Button
              variant="link"
              onClick={() => navigate('/auth')}
              className="text-sm"
            >
              Already have an account? Sign in
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;