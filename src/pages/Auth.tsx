import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Lightbulb } from 'lucide-react';


const Auth = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const { signInWithMagicLink, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signInWithMagicLink(email);

    if (error) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setIsSent(true);
      toast({
        title: "Magic link sent!",
        description: "Check your email for the login link.",
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.05),transparent_70%)] pointer-events-none" />

      <Card className="w-full max-w-sm border-zinc-800 bg-zinc-900/50 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center space-y-1">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-2xl bg-zinc-800/50 border border-zinc-700">
              <Lightbulb className="w-8 h-8 text-amber-400" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-zinc-100">Idea Foundry</CardTitle>
          <CardDescription className="text-zinc-400">
            {isSent ? "Check your inbox to continue" : "The forge for your thoughts"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isSent ? (
            <form onSubmit={handleMagicLink} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email" className="text-zinc-300">Email Address</Label>
                <Input
                  id="signin-email"
                  type="email"
                  className="bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-amber-500/50"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@example.com"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold transition-all"
                disabled={isLoading}
              >
                {isLoading ? "Sending link..." : "Send Magic Link"}
              </Button>
            </form>
          ) : (
            <div className="text-center py-4 space-y-4">
              <div className="text-zinc-300 text-sm">
                We've sent a secure link to <span className="font-medium text-amber-400">{email}</span>.
              </div>
              <Button
                variant="outline"
                className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                onClick={() => setIsSent(false)}
              >
                Use a different email
              </Button>
            </div>
          )}

          <div className="mt-8 text-center text-xs text-zinc-500 uppercase tracking-widest">
            Single User Access Only
          </div>
        </CardContent>
      </Card>
    </div>
  );
};


export default Auth;