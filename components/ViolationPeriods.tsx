'use client';

import { ViolationPeriod } from '@/lib/dataAggregator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface ViolationPeriodsProps {
  periods: ViolationPeriod[];
}

export function ViolationPeriods({ periods }: ViolationPeriodsProps) {
  // Sort by duration (longest first) and show top 10
  const topPeriods = [...periods]
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 10);

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (periods.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Violation Periods</CardTitle>
          <CardDescription>Continuous periods of non-compliance</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No violations detected - all temperatures are compliant!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Violation Periods</CardTitle>
        <CardDescription>
          Longest continuous periods of non-compliance (showing top 10 of {periods.length}{' '}
          total)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topPeriods.map((period, index) => (
            <div
              key={index}
              className="flex items-start justify-between border-b pb-3 last:border-b-0"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    variant={period.type === 'daytime' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {period.type === 'daytime' ? 'Day' : 'Night'}
                  </Badge>
                  <span className="text-sm font-medium">
                    {formatDuration(period.duration)}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  <div>{format(period.start, 'MMM dd, yyyy h:mm a')}</div>
                  <div className="text-xs">
                    to {format(period.end, 'MMM dd, yyyy h:mm a')}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-red-600">
                  {period.minTemp.toFixed(1)}°F
                </div>
                <div className="text-xs text-muted-foreground">
                  avg: {period.avgTemp.toFixed(1)}°F
                </div>
                <div className="text-xs text-red-600 mt-1">
                  {period.type === 'daytime'
                    ? `${(68 - period.minTemp).toFixed(1)}° below`
                    : `${(62 - period.minTemp).toFixed(1)}° below`}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
