import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import QuickCapture from '@/components/QuickCapture';
import RecentNotes from '@/components/RecentNotes';

const Index = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl">Loading...</h2>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Idea Foundry</h1>
            <p className="text-xl text-muted-foreground">Capture, organize, and discover your ideas</p>
          </div>
          <Button onClick={handleSignOut} variant="outline">
            Sign Out
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <QuickCapture />
            
            <Card>
              <CardHeader>
                <CardTitle>Welcome Back!</CardTitle>
                <CardDescription>
                  You're signed in as {user.email}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Your Idea Foundry is ready to capture and organize your thoughts. 
                  Start by creating your first note or importing resources.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <RecentNotes />
            
            <Card>
              <CardHeader>
                <CardTitle>Smart Search</CardTitle>
                <CardDescription>
                  Find anything in your collection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Coming soon: AI-powered semantic search across all your content
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
