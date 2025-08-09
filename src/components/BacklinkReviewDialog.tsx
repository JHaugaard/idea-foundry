import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface NoteLite {
  id: string;
  title: string;
  slug: string | null;
  content?: string | null;
}

interface ExtractedEntity {
  text: string;
  start: number;
  end: number;
  type: 'Person' | 'Org' | 'Project' | 'Place' | 'Work' | 'LegalTerm' | 'Other';
  confidence: number;
  canonical: {
    title: string;
    slug: string;
  }
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: NoteLite | null;
  onCompleted?: () => void;
}

const BacklinkReviewDialog: React.FC<Props> = ({ open, onOpenChange, note, onCompleted }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [entities, setEntities] = useState<ExtractedEntity[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [slugMatches, setSlugMatches] = useState<Record<string, NoteLite | null>>({});
  const [createMissing, setCreateMissing] = useState(false);

  const uniqueSlugs = useMemo(() => Array.from(new Set(entities.map(e => e.canonical.slug))), [entities]);

  useEffect(() => {
    if (!open || !note || !user) return;
    (async () => {
      try {
        setLoading(true);
        // Invoke edge function to extract entities
        const { data, error } = await supabase.functions.invoke('extract-backlinks', {
          body: {
            note_title: note.title,
            note_text: note.content || '',
          },
        });
        if (error) throw error;

        const parsed = (typeof data === 'string') ? JSON.parse(data) : data;
        const ents: ExtractedEntity[] = parsed.entities || [];
        setEntities(ents);
        setSelected(Object.fromEntries(ents.map((_, idx) => [idx, true])));

        // Find existing notes by slug
        const slugs = Array.from(new Set(ents.map(e => e.canonical.slug)));
        if (slugs.length > 0) {
          const { data: matches, error: findErr } = await supabase
            .from('notes')
            .select('id, title, slug')
            .eq('user_id', user.id)
            .in('slug', slugs);
          if (findErr) throw findErr;
          const map: Record<string, NoteLite | null> = {};
          slugs.forEach(s => { map[s] = null; });
          (matches || []).forEach((n: any) => { map[n.slug] = n; });
          setSlugMatches(map);
        } else {
          setSlugMatches({});
        }
      } catch (err: any) {
        console.error('Backlink extraction failed:', err);
        toast({ title: 'Extraction failed', description: err.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, [open, note, user, toast]);

  const handleSave = async () => {
    if (!note || !user) return;
    try {
      setLoading(true);
      // Optionally create missing notes
      const toCreate = entities.filter((e, i) => selected[i] && !slugMatches[e.canonical.slug]);
      let createdMap: Record<string, NoteLite> = {};
      if (createMissing && toCreate.length > 0) {
        const inserts = toCreate.map(e => ({ user_id: user.id, title: e.canonical.title, slug: e.canonical.slug, content: null }));
        const { data: created, error: createErr } = await supabase.from('notes').insert(inserts).select('id, title, slug');
        if (createErr) throw createErr;
        (created || []).forEach((n: any) => { if (n.slug) createdMap[n.slug] = n; });
      }

      // Build link rows
      const linkRows = entities
        .map((e, i) => ({ e, i }))
        .filter(({ i }) => selected[i])
        .map(({ e }) => {
          const match = slugMatches[e.canonical.slug] || createdMap[e.canonical.slug];
          if (!match) return null;
          return {
            user_id: user.id,
            source_note_id: note.id,
            target_note_id: match.id,
            anchor_text: e.text,
            canonical_title: e.canonical.title,
            canonical_slug: e.canonical.slug,
          };
        })
        .filter(Boolean) as any[];

      if (linkRows.length > 0) {
        const { error: linkErr } = await supabase.from('note_links').insert(linkRows);
        if (linkErr) throw linkErr;
      }

      // Mark note as reviewed
      const { error: updErr } = await supabase
        .from('notes')
        .update({ review_status: 'reviewed' })
        .eq('id', note.id)
        .eq('user_id', user.id);
      if (updErr) throw updErr;

      toast({ title: 'Backlinks saved', description: 'Review completed successfully.' });
      onOpenChange(false);
      onCompleted?.();
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review backlinks</DialogTitle>
          <DialogDescription>
            {note ? `Note: ${note.title}` : 'No note selected'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
          {loading && <p className="text-sm text-muted-foreground">Analyzing note…</p>}
          {!loading && entities.length === 0 && (
            <p className="text-sm text-muted-foreground">No candidates found.</p>
          )}
          {!loading && entities.length > 0 && (
            <div className="space-y-3">
              {entities.map((e, i) => {
                const match = slugMatches[e.canonical.slug];
                return (
                  <div key={`${e.canonical.slug}-${i}`} className="rounded-md border p-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={!!selected[i]}
                        onCheckedChange={(v) => setSelected(s => ({ ...s, [i]: !!v }))}
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{e.text}</p>
                          <span className="text-xs text-muted-foreground">{e.type} · {(e.confidence * 100).toFixed(0)}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Canonical: {e.canonical.title}</p>
                        <p className="text-xs">
                          {match ? (
                            <>
                              Links to: <span className="font-medium">{match.title}</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">No existing note for slug “{e.canonical.slug}”.</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {entities.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox checked={createMissing} onCheckedChange={(v) => setCreateMissing(!!v)} />
              <span className="text-sm">Create missing notes for unmatched items</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
              <Button onClick={handleSave} disabled={loading || !note}>Save</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BacklinkReviewDialog;
