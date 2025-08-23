import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import UserMenu from "@/components/UserMenu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import QuickCapture from '@/components/QuickCapture';
import RecentNotes from '@/components/RecentNotes';
import FileManager from '@/components/FileManager';
import { supabase } from '@/integrations/supabase/client';
import { slugify } from '@/lib/slug';
import { useToast } from '@/hooks/use-toast';
import { Tag, FileText, Settings, Sparkles, Network } from 'lucide-react';
import TagAutomationSidebar from '@/components/TagAutomationSidebar';

const Index = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const seed = async () => {
      if (loading || !user) return;
      const seededKey = 'dummyNotesSeeded_v1';
      if (localStorage.getItem(seededKey) === '1') return;

      const notes = [
        {
          title: 'Sample Note 1: Morning productivity routine',
          content:
            'I tried a simple morning routine to set the tone for the day: wake, stretch, hydrate, and write one page of intentions. Keeping it lightweight made it easy to repeat. The small frictionless start cascaded into better focus, fewer distractions, and a calmer pace. The best part is ending the routine by identifying one “must do” task. It clarified priorities and removed decision fatigue. I also noticed music without lyrics helps me transition into deep work faster. The routine isn’t perfect, but consistency beats intensity. Tomorrow I’ll test a five-minute meditation to see if it compounds the benefits.',
        },
        {
          title: 'Sample Note 2: Learning in small loops',
          content:
            'Breaking learning into tiny loops works better than long sessions. The loop: learn one concept, apply it immediately, reflect briefly, and repeat. This rhythm reduces overwhelm and increases retention because the brain connects theory with action. I tried this with a new JavaScript feature: learned the syntax, wrote a tiny example, then explained it in plain English. The reflection forced me to confront gaps quickly. Short loops also reduce procrastination, since the next step is always small. A timer helps prevent perfectionism. For the next topic, I’ll try two loops per day rather than one long block.',
        },
        {
          title: 'Sample Note 3: Health is a system, not a streak',
          content:
            'Treating health like a system instead of a streak removes the pressure of “never miss a day.” I built a simple checklist: move, nourish, sleep, and connect. Each day gets partial credit, and weekly trends matter more than perfect dailies. This mindset reduced guilt after a late night and made recovery intentional, not accidental. Small wins count: a short walk, a protein-focused snack, and a bedtime alarm. I also noticed that social connection affects sleep quality; talking with a friend eased evening rumination. I’ll track this for a week and adjust the checklist based on real patterns.',
        },
        {
          title: 'Sample Note 4: Project planning by questions',
          content:
            'Instead of writing a long project plan, I listed five guiding questions: What outcome matters? What must be true? What can fail? What is the smallest test? What will we stop doing? This clarified scope without generating busywork. The “must be true” prompt uncovered hidden assumptions about dependencies and timing. The smallest test became a demo with fake data to validate usability before building integrations. We also cut two nice-to-haves that didn’t move the outcome. Next time, I’ll timebox this exercise to fifteen minutes and invite one skeptic to pressure‑test the answers before locking milestones.',
        },
        {
          title: 'Sample Note 5: Reflection as a weekly reset',
          content:
            'A short weekly review helps convert activity into insight. My template: wins, misses, lessons, and adjustments. Wins remind me that progress happened even if the week felt chaotic. Misses spotlight recurring friction like unclear handoffs or vague goals. Lessons distill patterns into principles I can reuse. Adjustments turn insight into a single experiment for the next week. This loop feels sustainable because it stays under twenty minutes and pairs well with a walk. I’ll add a “stop doing” line next week to intentionally prune tasks that don’t compound. Small, honest reflections seem to be the fastest teacher.',
        },
      ];

      try {
        const slugs = notes.map((n) => slugify(n.title));
        const { data: existing } = await supabase
          .from('notes')
          .select('slug')
          .in('slug', slugs)
          .eq('user_id', user.id);

        const existingSlugs = new Set((existing ?? []).map((e: { slug: string }) => e.slug));
        const missing = notes.filter((n) => !existingSlugs.has(slugify(n.title)));

        if (missing.length === 0) {
          localStorage.setItem(seededKey, '1');
          return;
        }

        const rows = missing.map((n) => ({
          user_id: user.id,
          title: n.title,
          content: n.content,
          slug: slugify(n.title),
        }));

        const { error } = await supabase.from('notes').insert(rows);
        if (error) {
          // Treat unique violations as already seeded
          if ((error as any)?.code === '23505') {
            localStorage.setItem(seededKey, '1');
            return;
          }
          toast({ title: 'Seeding failed', description: error.message, variant: 'destructive' });
          return;
        }

        localStorage.setItem(seededKey, '1');
        toast({ title: `${rows.length} sample ${rows.length === 1 ? 'note' : 'notes'} added`, description: 'Check Recent Notes to view them.' });
      } catch (err: any) {
        toast({ title: 'Seeding failed', description: err?.message ?? 'Unknown error', variant: 'destructive' });
      }
    };
    seed();
  }, [user, loading, toast]);

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
    // Force navigation to auth if not authenticated
    navigate('/auth');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl">Redirecting to authentication...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Idea Foundry</h1>
              <p className="text-xl text-muted-foreground">Capture, organize, and discover ideas</p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => navigate('/tags')}
                className="flex items-center gap-2"
              >
                <Tag className="h-4 w-4" />
                Tag Library
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/links')}
                className="flex items-center gap-2"
              >
                <Network className="h-4 w-4" />
                Link Explorer
              </Button>
              <UserMenu />
            </div>
          </div>

          <div className="space-y-6">
            <QuickCapture />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RecentNotes />
              <FileManager />
            </div>
          </div>
        </div>
      </div>
      
      <TagAutomationSidebar />
    </div>
  );
};

export default Index;
