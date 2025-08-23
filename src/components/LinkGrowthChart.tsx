import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { useGrowthData, TimeFilter } from '@/hooks/useLinkAnalytics';

interface LinkGrowthChartProps {
  timeFilter: TimeFilter;
}

const chartConfig = {
  connections: {
    label: "Connections",
    color: "hsl(var(--primary))",
  },
};

export const LinkGrowthChart: React.FC<LinkGrowthChartProps> = ({ timeFilter }) => {
  const { data: growthData, isLoading } = useGrowthData(timeFilter);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Link Creation Over Time</CardTitle>
          <CardDescription>
            New connections created {timeFilter === '7days' ? 'in the last 7 days' : timeFilter === '30days' ? 'in the last 30 days' : 'over all time'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full animate-pulse bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Link Creation Over Time</CardTitle>
        <CardDescription>
          New connections created {timeFilter === '7days' ? 'in the last 7 days' : timeFilter === '30days' ? 'in the last 30 days' : 'over all time'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {growthData && growthData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis className="text-muted-foreground" />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="connections" 
                  stroke="var(--color-connections)"
                  strokeWidth={2}
                  dot={{ fill: "var(--color-connections)", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No link creation data available for this period
          </div>
        )}
      </CardContent>
    </Card>
  );
};