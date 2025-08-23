import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export function BacklinkSkeleton() {
  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-4 w-4 mt-1 flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-3 flex-shrink-0" />
            </div>
            <Skeleton className="h-5 w-20" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function BacklinkPanelSkeleton() {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>

      <div className="p-4 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <BacklinkSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function LinkStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-3 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function SearchResultSkeleton() {
  return (
    <div className="space-y-2 p-2">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-3 w-48" />
      <div className="flex gap-1">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}