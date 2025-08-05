import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Lightbulb } from 'lucide-react';

const QuickCapture = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !title.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter a title for your idea.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title: title.trim(),
          content: content.trim() || null,
        });

      if (error) throw error;

      // Clear form
      setTitle('');
      setContent('');

      toast({
        title: "Idea captured!",
        description: "Your idea has been saved to your collection.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to save idea",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Quick Capture
        </CardTitle>
        <CardDescription>
          Instantly capture your ideas and thoughts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="What's your idea?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-base"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Textarea
              placeholder="Add more details... (optional)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[80px] resize-none"
              disabled={isLoading}
            />
          </div>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || !title.trim()}
          >
            <Plus className="h-4 w-4 mr-2" />
            {isLoading ? "Capturing..." : "Capture Idea"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default QuickCapture;