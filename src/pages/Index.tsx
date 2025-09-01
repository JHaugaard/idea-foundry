
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReviewQueueList } from '@/components/ReviewQueueList';
import RecentNotes from '@/components/RecentNotes';
import QuickCapture from '@/components/QuickCapture';

export default function Index() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Capture</h1>
          <p className="text-muted-foreground">Quickly capture notes, ideas, and files</p>
        </div>

        {/* Quick Capture - Primary Feature */}
        <QuickCapture />

        {/* Secondary Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Review Queue */}
          <Card>
            <CardHeader>
              <CardTitle>Review Queue</CardTitle>
            </CardHeader>
            <CardContent>
              <ReviewQueueList />
            </CardContent>
          </Card>

          {/* Recent Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <RecentNotes />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
