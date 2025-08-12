import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';
import QuickCapture from '@/components/QuickCapture';

const CaptureBanner: React.FC = () => {
  return (
    <QuickCapture
      trigger={
        <div className="w-full">
          <Card
            role="button"
            tabIndex={0}
            aria-label="Open capture to add a new note or drop files"
            className="cursor-pointer border-dashed hover:border-primary/50 transition-colors"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                (e.currentTarget as HTMLElement).click();
              }
            }}
          >
            <CardHeader className="flex flex-row items-start gap-3">
              <Lightbulb className="h-5 w-5 text-primary mt-1" />
              <div className="space-y-1">
                <CardTitle className="text-xl">Capture</CardTitle>
                <CardDescription>
                  Type or paste your note, and drop files (PDF, Word, Excel, images). Click to open the capture modal.
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        </div>
      }
    />
  );
};

export default CaptureBanner;
