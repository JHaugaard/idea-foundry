import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLinkStats, useTopConnectors, useGrowthData, TimeFilter } from '@/hooks/useLinkAnalytics';
import { Download, FileImage, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AnalyticsExportProps {
  timeFilter: TimeFilter;
}

export const AnalyticsExport: React.FC<AnalyticsExportProps> = ({ timeFilter }) => {
  const { data: stats } = useLinkStats(timeFilter);
  const { data: connectors } = useTopConnectors(timeFilter);
  const { data: growthData } = useGrowthData(timeFilter);
  const { toast } = useToast();

  const exportToCSV = () => {
    if (!stats || !connectors || !growthData) {
      toast({
        title: "Export Failed",
        description: "Data is still loading, please try again.",
        variant: "destructive",
      });
      return;
    }

    // Prepare CSV data
    const csvData = [
      ['Analytics Export - ' + new Date().toISOString()],
      [''],
      ['Summary Statistics'],
      ['Metric', 'Value'],
      ['Total Notes', stats.totalNotes],
      ['Total Connections', stats.totalConnections],
      ['Average Connections per Note', stats.averageConnectionsPerNote],
      ['Orphaned Notes', stats.orphanedNotes],
      [''],
      ['Top Connected Notes'],
      ['Rank', 'Title', 'Incoming Links', 'Outgoing Links', 'Total Connections'],
      ...connectors.map((connector, index) => [
        index + 1,
        connector.title,
        connector.incomingCount,
        connector.outgoingCount,
        connector.totalConnections
      ]),
      [''],
      ['Growth Data'],
      ['Date', 'New Connections'],
      ...growthData.map(item => [item.date, item.connections])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `link-analytics-${timeFilter}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: "Analytics data has been downloaded as CSV.",
    });
  };

  const exportAsImage = async () => {
    try {
      // Simple approach: create an HTML canvas with the data
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx || !stats) return;

      canvas.width = 800;
      canvas.height = 600;
      
      // Set background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Title
      ctx.fillStyle = 'black';
      ctx.font = 'bold 24px Arial';
      ctx.fillText('Link Analytics Dashboard', 50, 50);
      
      // Stats
      ctx.font = '16px Arial';
      ctx.fillText(`Total Notes: ${stats.totalNotes}`, 50, 100);
      ctx.fillText(`Total Connections: ${stats.totalConnections}`, 50, 130);
      ctx.fillText(`Avg Connections: ${stats.averageConnectionsPerNote}`, 50, 160);
      ctx.fillText(`Orphaned Notes: ${stats.orphanedNotes}`, 50, 190);
      
      if (stats.mostConnectedNote) {
        ctx.fillText(`Most Connected: ${stats.mostConnectedNote.title} (${stats.mostConnectedNote.connectionCount})`, 50, 230);
      }

      // Export
      canvas.toBlob((blob) => {
        if (!blob) return;
        
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `link-analytics-${timeFilter}-${new Date().toISOString().split('T')[0]}.png`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
          title: "Export Successful",
          description: "Analytics chart has been downloaded as PNG.",
        });
      });
      
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export Failed",
        description: "Unable to export as image. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export Analytics</CardTitle>
        <CardDescription>
          Download your link analytics data and insights
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={exportToCSV} 
            variant="outline" 
            className="flex items-center space-x-2"
            disabled={!stats || !connectors || !growthData}
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Export as CSV</span>
          </Button>
          
          <Button 
            onClick={exportAsImage} 
            variant="outline" 
            className="flex items-center space-x-2"
            disabled={!stats}
          >
            <FileImage className="h-4 w-4" />
            <span>Export as Image</span>
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground mt-3">
          CSV includes detailed statistics and raw data. Image exports a summary chart.
        </p>
      </CardContent>
    </Card>
  );
};