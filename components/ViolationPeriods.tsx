'use client';

import { ViolationPeriod, DayViolations, groupViolationsByDay } from '@/lib/dataAggregator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { AlertCircle, ThermometerSnowflake, Clock, Calendar } from 'lucide-react';

interface ViolationPeriodsProps {
  periods: ViolationPeriod[];
}

export function ViolationPeriods({ periods }: ViolationPeriodsProps) {
  // Filter out violations less than 30 minutes
  const significantPeriods = periods.filter(period => period.duration >= 30);

  // Group violations by day
  const dayViolations = groupViolationsByDay(significantPeriods);

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  const formatHours = (minutes: number): string => {
    return (minutes / 60).toFixed(1);
  };

  if (significantPeriods.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ThermometerSnowflake className="h-5 w-5" />
            Violation Periods
          </CardTitle>
          <CardDescription>Continuous periods of non-compliance (30+ minutes)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <ThermometerSnowflake className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-muted-foreground">
              {periods.length === 0
                ? 'No violations detected - all temperatures are compliant!'
                : 'No significant violations (30+ minutes) detected!'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          Violation Periods by Day
        </CardTitle>
        <CardDescription>
          Violation periods of 30+ minutes, grouped by day and sorted chronologically ({significantPeriods.length}{' '}
          violations across {dayViolations.length} days)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {dayViolations.map((dayData, dayIndex) => {
            const totalViolationsForDay = dayData.periods.length;
            const totalDurationForDay = dayData.periods.reduce((sum, p) => sum + p.duration, 0);

            return (
              <div key={dayIndex} className="space-y-3">
                {/* Day Header */}
                <div className="flex items-center justify-between pb-2 border-b-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">
                      {format(dayData.date, 'EEEE, MMMM dd, yyyy')}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{totalViolationsForDay} violation{totalViolationsForDay !== 1 ? 's' : ''}</span>
                    <span>•</span>
                    <span>{formatHours(totalDurationForDay)} hours total</span>
                  </div>
                </div>

                {/* Violations for this day */}
                <div className="space-y-3 pl-4">
                  {dayData.periods.map((period, periodIndex) => {
                    const requiredTemp = period.type === 'daytime' ? 68 : 62;
                    const belowRequired = requiredTemp - period.minTemp;
                    const hours = formatHours(period.duration);

                    return (
                      <div
                        key={periodIndex}
                        className="group relative rounded-lg border bg-card p-4 hover:shadow-md transition-all"
                      >
                        {/* Header Row */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={period.type === 'daytime' ? 'default' : 'secondary'}
                              className="font-semibold"
                            >
                              {period.type === 'daytime' ? 'Daytime' : 'Nighttime'}
                            </Badge>
                            <div className="flex items-center gap-1 text-sm font-medium">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{formatDuration(period.duration)}</span>
                              <span className="text-muted-foreground">({hours} hours)</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground mb-1">
                              Required: {requiredTemp}°F
                            </div>
                            <Badge variant="destructive" className="text-xs">
                              {belowRequired.toFixed(1)}° below
                            </Badge>
                          </div>
                        </div>

                        {/* Time Period */}
                        <div className="mb-3">
                          <div className="text-sm text-muted-foreground">
                            {format(period.start, 'h:mm a')} → {format(period.end, 'h:mm a')}
                          </div>
                        </div>

                        {/* Temperature Stats Grid */}
                        <div className="grid grid-cols-3 gap-3 pt-3 border-t">
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground mb-1">Min Temp</div>
                            <div className="text-lg font-bold text-red-600">
                              {period.minTemp.toFixed(1)}°F
                            </div>
                          </div>
                          <div className="text-center border-x">
                            <div className="text-xs text-muted-foreground mb-1">Avg Temp</div>
                            <div className="text-lg font-bold text-orange-600">
                              {period.avgTemp.toFixed(1)}°F
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground mb-1">Max Temp</div>
                            <div className="text-lg font-bold text-orange-500">
                              {period.maxTemp?.toFixed(1) || 'N/A'}°F
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
