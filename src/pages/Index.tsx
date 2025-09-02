
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import RecentNotes from '@/components/RecentNotes';
import QuickCapture from '@/components/QuickCapture';
import { BasicSearchHome } from '@/components/BasicSearchHome';

export default function Index() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Idea Foundry</h1>
          <p className="text-muted-foreground">Capture and organize notes - discover ideas</p>
        </div>

        {/* Quick Capture - Primary Feature */}
        <QuickCapture />

        {/* Secondary Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Captures */}
          <RecentNotes />

          {/* Search */}
          <Card>
            <CardHeader>
              <CardTitle>Search</CardTitle>
            </CardHeader>
            <CardContent>
              <BasicSearchHome />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
