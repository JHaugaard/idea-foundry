import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface BulkTagOperation {
  operation: 'add' | 'remove' | 'replace';
  noteIds: string[];
  tags: string[];
  replaceTags?: string[];
}

interface TagValidationRequest {
  tags: string[];
  userId: string;
}

interface TagNormalizationRequest {
  tags: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...payload } = await req.json();

    switch (action) {
      case 'bulk_operations':
        return await handleBulkOperations(payload as BulkTagOperation);
      
      case 'validate_tags':
        return await handleTagValidation(payload as TagValidationRequest);
      
      case 'normalize_tags':
        return await handleTagNormalization(payload as TagNormalizationRequest);
      
      case 'backup_tags':
        return await handleTagBackup(payload.userId);
      
      case 'restore_tags':
        return await handleTagRestore(payload.userId, payload.backupId);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error in tag-operations function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleBulkOperations(operation: BulkTagOperation) {
  const { operation: op, noteIds, tags, replaceTags } = operation;
  
  // Start transaction
  const { data: notes, error: fetchError } = await supabase
    .from('notes')
    .select('id, tags')
    .in('id', noteIds);

  if (fetchError) throw fetchError;

  const updates = notes.map(note => {
    let newTags = note.tags || [];
    
    switch (op) {
      case 'add':
        newTags = [...new Set([...newTags, ...tags])];
        break;
      case 'remove':
        newTags = newTags.filter(tag => !tags.includes(tag));
        break;
      case 'replace':
        if (replaceTags) {
          newTags = newTags.map(tag => 
            tags.includes(tag) ? replaceTags[tags.indexOf(tag)] : tag
          );
        }
        break;
    }
    
    return { id: note.id, tags: newTags };
  });

  // Execute bulk update
  const { error: updateError } = await supabase
    .from('notes')
    .upsert(updates);

  if (updateError) throw updateError;

  return new Response(
    JSON.stringify({ success: true, updatedCount: updates.length }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleTagValidation(request: TagValidationRequest) {
  const { tags, userId } = request;
  
  // Get user preferences
  const { data: preferences } = await supabase
    .from('user_tag_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  const results = tags.map(tag => {
    const validation = {
      tag,
      valid: true,
      errors: [] as string[],
      suggestions: [] as string[]
    };

    // Validate tag format
    if (tag.length < 2 || tag.length > 30) {
      validation.valid = false;
      validation.errors.push('Tag must be 2-30 characters long');
    }

    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(tag)) {
      validation.valid = false;
      validation.errors.push('Tag must be lowercase with hyphens only');
      validation.suggestions.push(normalizeTagName(tag));
    }

    // Check reserved words
    if (preferences?.reserved_words?.includes(tag)) {
      validation.valid = false;
      validation.errors.push('Tag is a reserved word');
    }

    return validation;
  });

  return new Response(
    JSON.stringify({ validations: results }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleTagNormalization(request: TagNormalizationRequest) {
  const { tags } = request;
  
  const normalized = tags.map(tag => ({
    original: tag,
    normalized: normalizeTagName(tag)
  }));

  return new Response(
    JSON.stringify({ normalized }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleTagBackup(userId: string) {
  // Get all user's tag data
  const [notesResult, analyticsResult, relationshipsResult, preferencesResult] = await Promise.all([
    supabase.from('notes').select('id, title, tags').eq('user_id', userId),
    supabase.from('tag_analytics').select('*').eq('user_id', userId),
    supabase.from('tag_relationships').select('*').eq('user_id', userId),
    supabase.from('user_tag_preferences').select('*').eq('user_id', userId)
  ]);

  const backupData = {
    notes: notesResult.data,
    analytics: analyticsResult.data,
    relationships: relationshipsResult.data,
    preferences: preferencesResult.data,
    timestamp: new Date().toISOString()
  };

  // Store backup
  const { data: backup, error } = await supabase
    .from('tag_backups')
    .insert({
      user_id: userId,
      backup_name: `Auto backup ${new Date().toLocaleDateString()}`,
      backup_data: backupData,
      backup_type: 'auto'
    })
    .select()
    .single();

  if (error) throw error;

  return new Response(
    JSON.stringify({ backup }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleTagRestore(userId: string, backupId: string) {
  // Get backup data
  const { data: backup, error: backupError } = await supabase
    .from('tag_backups')
    .select('backup_data')
    .eq('id', backupId)
    .eq('user_id', userId)
    .single();

  if (backupError) throw backupError;

  const { notes, analytics, relationships, preferences } = backup.backup_data;

  // Restore data (simplified - in practice you'd want more sophisticated merging)
  await Promise.all([
    // Update notes tags
    ...notes.map(note => 
      supabase.from('notes')
        .update({ tags: note.tags })
        .eq('id', note.id)
        .eq('user_id', userId)
    ),
    
    // Restore analytics
    supabase.from('tag_analytics').delete().eq('user_id', userId),
    
    // Restore relationships
    supabase.from('tag_relationships').delete().eq('user_id', userId)
  ]);

  // Re-insert analytics and relationships
  if (analytics?.length > 0) {
    await supabase.from('tag_analytics').insert(analytics);
  }
  
  if (relationships?.length > 0) {
    await supabase.from('tag_relationships').insert(relationships);
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function normalizeTagName(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}