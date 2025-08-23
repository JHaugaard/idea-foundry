import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type TimeFilter = '7days' | '30days' | 'all';

interface LinkStats {
  totalNotes: number;
  totalConnections: number;
  averageConnectionsPerNote: number;
  orphanedNotes: number;
  mostConnectedNote: {
    title: string;
    connectionCount: number;
  } | null;
}

interface GrowthData {
  date: string;
  connections: number;
}

interface TopConnector {
  noteId: string;
  title: string;
  slug: string | null;
  incomingCount: number;
  outgoingCount: number;
  totalConnections: number;
}

interface ConnectionNode {
  id: string;
  title: string;
  connectionCount: number;
}

interface ConnectionEdge {
  source: string;
  target: string;
  anchorText?: string;
}

interface NetworkGraph {
  nodes: ConnectionNode[];
  edges: ConnectionEdge[];
}

export const useLinkStats = (timeFilter: TimeFilter = 'all') => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['link-stats', user?.id, timeFilter],
    queryFn: async (): Promise<LinkStats> => {
      if (!user) return {
        totalNotes: 0,
        totalConnections: 0,
        averageConnectionsPerNote: 0,
        orphanedNotes: 0,
        mostConnectedNote: null,
      };

      const dateFilter = getDateFilter(timeFilter);

      // Get total notes
      let notesQuery = supabase
        .from('notes')
        .select('id, title')
        .eq('user_id', user.id);

      if (dateFilter) {
        notesQuery = notesQuery.gte('created_at', dateFilter);
      }

      const { data: notes, error: notesError } = await notesQuery;
      if (notesError) throw notesError;

      // Get total connections
      let linksQuery = supabase
        .from('note_links')
        .select('id, source_note_id, target_note_id')
        .eq('user_id', user.id);

      if (dateFilter) {
        linksQuery = linksQuery.gte('created_at', dateFilter);
      }

      const { data: links, error: linksError } = await linksQuery;
      if (linksError) throw linksError;

      // Calculate connection counts per note
      const connectionCounts = new Map<string, number>();
      
      links?.forEach(link => {
        const sourceCount = connectionCounts.get(link.source_note_id) || 0;
        const targetCount = connectionCounts.get(link.target_note_id) || 0;
        connectionCounts.set(link.source_note_id, sourceCount + 1);
        connectionCounts.set(link.target_note_id, targetCount + 1);
      });

      // Find most connected note
      let mostConnectedNote = null;
      let maxConnections = 0;
      
      notes?.forEach(note => {
        const connections = connectionCounts.get(note.id) || 0;
        if (connections > maxConnections) {
          maxConnections = connections;
          mostConnectedNote = {
            title: note.title,
            connectionCount: connections,
          };
        }
      });

      const totalNotes = notes?.length || 0;
      const totalConnections = links?.length || 0;
      const orphanedNotes = totalNotes - connectionCounts.size;
      const averageConnectionsPerNote = totalNotes > 0 ? totalConnections / totalNotes : 0;

      return {
        totalNotes,
        totalConnections,
        averageConnectionsPerNote: Math.round(averageConnectionsPerNote * 100) / 100,
        orphanedNotes,
        mostConnectedNote,
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useGrowthData = (timeFilter: TimeFilter = '30days') => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['growth-data', user?.id, timeFilter],
    queryFn: async (): Promise<GrowthData[]> => {
      if (!user) return [];

      const dateFilter = getDateFilter(timeFilter);
      const groupBy = timeFilter === '7days' ? 'day' : 'day';

      let query = supabase
        .from('note_links')
        .select('created_at')
        .eq('user_id', user.id);

      if (dateFilter) {
        query = query.gte('created_at', dateFilter);
      }

      const { data: links, error } = await query.order('created_at', { ascending: true });
      if (error) throw error;

      // Group by day
      const groupedData = new Map<string, number>();
      
      links?.forEach(link => {
        const date = new Date(link.created_at).toISOString().split('T')[0];
        const count = groupedData.get(date) || 0;
        groupedData.set(date, count + 1);
      });

      return Array.from(groupedData.entries())
        .map(([date, connections]) => ({
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          connections,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useTopConnectors = (timeFilter: TimeFilter = 'all', limit = 10) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['top-connectors', user?.id, timeFilter, limit],
    queryFn: async (): Promise<TopConnector[]> => {
      if (!user) return [];

      const dateFilter = getDateFilter(timeFilter);

      // Get notes
      let notesQuery = supabase
        .from('notes')
        .select('id, title, slug')
        .eq('user_id', user.id);

      if (dateFilter) {
        notesQuery = notesQuery.gte('created_at', dateFilter);
      }

      const { data: notes, error: notesError } = await notesQuery;
      if (notesError) throw notesError;

      // Get links
      let linksQuery = supabase
        .from('note_links')
        .select('source_note_id, target_note_id')
        .eq('user_id', user.id);

      if (dateFilter) {
        linksQuery = linksQuery.gte('created_at', dateFilter);
      }

      const { data: links, error: linksError } = await linksQuery;
      if (linksError) throw linksError;

      // Count connections
      const incomingCounts = new Map<string, number>();
      const outgoingCounts = new Map<string, number>();

      links?.forEach(link => {
        const incoming = incomingCounts.get(link.target_note_id) || 0;
        const outgoing = outgoingCounts.get(link.source_note_id) || 0;
        incomingCounts.set(link.target_note_id, incoming + 1);
        outgoingCounts.set(link.source_note_id, outgoing + 1);
      });

      return notes?.map(note => {
        const incoming = incomingCounts.get(note.id) || 0;
        const outgoing = outgoingCounts.get(note.id) || 0;
        return {
          noteId: note.id,
          title: note.title,
          slug: note.slug,
          incomingCount: incoming,
          outgoingCount: outgoing,
          totalConnections: incoming + outgoing,
        };
      })
      .filter(note => note.totalConnections > 0)
      .sort((a, b) => b.totalConnections - a.totalConnections)
      .slice(0, limit) || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useConnectionGraph = (timeFilter: TimeFilter = 'all', maxNodes = 20) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['connection-graph', user?.id, timeFilter, maxNodes],
    queryFn: async (): Promise<NetworkGraph> => {
      if (!user) return { nodes: [], edges: [] };

      const dateFilter = getDateFilter(timeFilter);

      // Get notes for the graph
      let notesQuery = supabase
        .from('notes')
        .select('id, title')
        .eq('user_id', user.id)
        .limit(maxNodes);

      if (dateFilter) {
        notesQuery = notesQuery.gte('created_at', dateFilter);
      }

      const { data: notes, error: notesError } = await notesQuery;
      if (notesError) throw notesError;

      if (!notes || notes.length === 0) return { nodes: [], edges: [] };

      const noteIds = notes.map(note => note.id);

      // Get links between these notes
      let linksQuery = supabase
        .from('note_links')
        .select('source_note_id, target_note_id, anchor_text')
        .eq('user_id', user.id)
        .in('source_note_id', noteIds)
        .in('target_note_id', noteIds);

      if (dateFilter) {
        linksQuery = linksQuery.gte('created_at', dateFilter);
      }

      const { data: links, error: linksError } = await linksQuery;
      if (linksError) throw linksError;

      // Count connections for node sizing
      const connectionCounts = new Map<string, number>();
      links?.forEach(link => {
        const sourceCount = connectionCounts.get(link.source_note_id) || 0;
        const targetCount = connectionCounts.get(link.target_note_id) || 0;
        connectionCounts.set(link.source_note_id, sourceCount + 1);
        connectionCounts.set(link.target_note_id, targetCount + 1);
      });

      const nodes: ConnectionNode[] = notes.map(note => ({
        id: note.id,
        title: note.title,
        connectionCount: connectionCounts.get(note.id) || 0,
      }));

      const edges: ConnectionEdge[] = links?.map(link => ({
        source: link.source_note_id,
        target: link.target_note_id,
        anchorText: link.anchor_text || undefined,
      })) || [];

      return { nodes, edges };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

function getDateFilter(timeFilter: TimeFilter): string | null {
  const now = new Date();
  
  switch (timeFilter) {
    case '7days':
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return sevenDaysAgo.toISOString();
    case '30days':
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return thirtyDaysAgo.toISOString();
    case 'all':
    default:
      return null;
  }
}