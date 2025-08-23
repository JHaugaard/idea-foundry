import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Network } from 'lucide-react';
import MostConnectedSection from '@/components/MostConnectedSection';
import RecentlyLinkedSection from '@/components/RecentlyLinkedSection';
import OrphanedNotesSection from '@/components/OrphanedNotesSection';
import LinkSearchInterface from '@/components/LinkSearchInterface';
import LinkExportTools from '@/components/LinkExportTools';

export default function LinkExplorer() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

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
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Network className="h-8 w-8" />
                Link Explorer
              </h1>
              <p className="text-muted-foreground">Explore and manage your note connections</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Notes</SelectItem>
                <SelectItem value="connected">Connected Only</SelectItem>
                <SelectItem value="orphaned">Orphaned Only</SelectItem>
                <SelectItem value="recent">Recently Updated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Most Connected Notes */}
          <div className="lg:col-span-1">
            <MostConnectedSection />
          </div>

          {/* Recent Link Activity */}
          <div className="lg:col-span-1">
            <RecentlyLinkedSection />
          </div>

          {/* Export Tools */}
          <div className="lg:col-span-1 xl:col-span-1">
            <LinkExportTools />
          </div>

          {/* Search Interface */}
          <div className="lg:col-span-2 xl:col-span-2">
            <LinkSearchInterface />
          </div>

          {/* Orphaned Notes */}
          <div className="lg:col-span-1 xl:col-span-1">
            <OrphanedNotesSection />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>
            Link Explorer helps you understand the connections in your knowledge network.
          </p>
          <p>
            Create links between notes using [[bracket notation]] to build a connected knowledge base.
          </p>
        </div>
      </div>
    </div>
  );
}