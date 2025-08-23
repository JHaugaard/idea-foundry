import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { LinkStats } from '@/components/LinkStats';
import { LinkGrowthChart } from '@/components/LinkGrowthChart';
import { TopConnectors } from '@/components/TopConnectors';
import { ConnectionGraph } from '@/components/ConnectionGraph';
import { AnalyticsExport } from '@/components/AnalyticsExport';
import { TimeFilter } from '@/hooks/useLinkAnalytics';

const Analytics: React.FC = () => {
  const { user, loading } = useAuth();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30days');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => window.history.back()}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-semibold">Knowledge Network Analytics</h1>
              </div>
            </div>
            
            <Select value={timeFilter} onValueChange={(value: TimeFilter) => setTimeFilter(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid gap-6">
          {/* Stats Overview */}
          <LinkStats timeFilter={timeFilter} />
          
          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LinkGrowthChart timeFilter={timeFilter} />
            <TopConnectors timeFilter={timeFilter} limit={8} />
          </div>
          
          {/* Network Graph */}
          <ConnectionGraph timeFilter={timeFilter} maxNodes={15} />
          
          {/* Export Tools */}
          <AnalyticsExport timeFilter={timeFilter} />
        </div>
      </div>
    </div>
  );
};

export default Analytics;