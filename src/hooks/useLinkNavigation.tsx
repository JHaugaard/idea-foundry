import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useLinkNavigation = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const navigateToNote = async (noteSlug?: string, noteId?: string, noteTitle?: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to navigate to notes.",
        variant: "destructive",
      });
      return;
    }

    try {
      // If we have a slug, use it directly
      if (noteSlug) {
        navigate(`/notes/${noteSlug}`);
        return;
      }

      // If we have a note ID, fetch the slug
      if (noteId) {
        const { data: note, error } = await supabase
          .from('notes')
          .select('slug, title')
          .eq('id', noteId)
          .eq('user_id', user.id)
          .single();

        if (error) throw error;

        if (note?.slug) {
          navigate(`/notes/${note.slug}`);
        } else {
          toast({
            title: "Note not found",
            description: "The linked note could not be found.",
            variant: "destructive",
          });
        }
        return;
      }

      // Fallback error
      toast({
        title: "Invalid link",
        description: "Cannot navigate to the note - missing slug or ID.",
        variant: "destructive",
      });
    } catch (error: any) {
      console.error('Navigation error:', error);
      toast({
        title: "Navigation failed",
        description: error.message || "Failed to navigate to the note.",
        variant: "destructive",
      });
    }
  };

  return { navigateToNote };
};