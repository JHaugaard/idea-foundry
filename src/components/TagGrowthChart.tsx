import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TagGrowthChartProps {
  data: Array<{ month: string; count: number }>;
}

export const TagGrowthChart: React.FC<TagGrowthChartProps> = ({ data }) => {
  const formatMonth = (month: string) => {
    const date = new Date(month + '-01');
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  const chartData = data.map(item => ({
    ...item,
    formattedMonth: formatMonth(item.month)
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tag Growth Over Time</CardTitle>
        <CardDescription>
          Number of unique tags used per month
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="formattedMonth" 
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(label) => `Month: ${label}`}
                formatter={(value: number) => [value, 'Unique Tags']}
              />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            No growth data available
          </div>
        )}
      </CardContent>
    </Card>
  );
};