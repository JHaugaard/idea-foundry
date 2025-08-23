import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useLinkNetworkStats, useRecentLinks } from '@/hooks/useLinkNetwork';
import { Download, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function LinkExportTools() {
  const { data: networkStats } = useLinkNetworkStats();
  const { data: recentLinks } = useRecentLinks(1000); // Get more for export
  const { toast } = useToast();

  const exportNetworkStatsCSV = () => {
    if (!networkStats || networkStats.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no network statistics to export.",
        variant: "destructive",
      });
      return;
    }

    const headers = ['Note Title', 'Slug', 'Last Updated', 'Incoming Links', 'Outgoing Links', 'Total Connections'];
    const csvContent = [
      headers.join(','),
      ...networkStats.map(note => [
        `"${note.title.replace(/"/g, '""')}"`,
        note.slug || '',
        note.updatedAt,
        note.incomingCount,
        note.outgoingCount,
        note.totalConnections,
      ].join(','))
    ].join('\n');

    downloadCSV(csvContent, 'link-network-stats.csv');
  };

  const exportRecentLinksCSV = () => {
    if (!recentLinks || recentLinks.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no recent links to export.",
        variant: "destructive",
      });
      return;
    }

    const headers = ['Source Note', 'Target Note', 'Anchor Text', 'Created Date'];
    const csvContent = [
      headers.join(','),
      ...recentLinks.map(link => [
        `"${link.sourceTitle.replace(/"/g, '""')}"`,
        `"${link.targetTitle.replace(/"/g, '""')}"`,
        `"${(link.anchorText || '').replace(/"/g, '""')}"`,
        link.createdAt,
      ].join(','))
    ].join('\n');

    downloadCSV(csvContent, 'recent-links.csv');
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export successful",
        description: `Downloaded ${filename}`,
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Link Data
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Button
            onClick={exportNetworkStatsCSV}
            variant="outline"
            className="w-full flex items-center gap-2"
            disabled={!networkStats || networkStats.length === 0}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export Network Statistics CSV
          </Button>
          
          <Button
            onClick={exportRecentLinksCSV}
            variant="outline"
            className="w-full flex items-center gap-2"
            disabled={!recentLinks || recentLinks.length === 0}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export Recent Links CSV
          </Button>
          
          <p className="text-sm text-muted-foreground text-center">
            Export your link network data for analysis or backup
          </p>
        </div>
      </CardContent>
    </Card>
  );
}