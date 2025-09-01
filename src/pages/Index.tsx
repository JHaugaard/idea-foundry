import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ReviewQueueList from "@/components/ReviewQueueList";

const Index = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");

  const createNoteMutation = useMutation(
    async () => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("notes")
        .insert([
          {
            user_id: user.id,
            title: title.trim() || "Untitled Note",
            content: content.trim(),
            category_type: "personal",
            review_status: "not_reviewed",
            captured_on: new Date().toISOString(),
            processing_flags: {},
          },
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    {
      onSuccess: (newNote) => {
        toast({
          title: "Note created",
          description: "Your note has been successfully created.",
        });
        setTitle("");
        setContent("");
        navigate(`/notes/${newNote.slug}`);
      },
      onError: (error: any) => {
        toast({
          title: "Error creating note",
          description: error.message,
          variant: "destructive",
        });
      },
    }
  );

  const handleQuickCapture = async () => {
    await createNoteMutation.mutateAsync();
  };

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="lg:pl-64">
        <div className="container mx-auto p-6 space-y-6">
          <div className="space-y-0.5">
            <h2 className="text-2xl font-bold tracking-tight">
              Welcome to your knowledge base!
            </h2>
            <p className="text-muted-foreground">
              Capture, connect, and explore your thoughts.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quick Capture</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  type="text"
                  id="title"
                  placeholder="Note Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  placeholder="Write your thoughts here..."
                  className="resize-none"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>
              <Button onClick={handleQuickCapture} disabled={createNoteMutation.isPending}>
                {createNoteMutation.isPending ? "Creating..." : "Create Note"}
              </Button>
            </CardContent>
          </Card>
          
          <ReviewQueueList />
        </div>
      </div>
    </div>
  );
};

export default Index;
