'use client';

import { useEffect, useState, useMemo } from 'react';
import { TemperatureReading, TimeInterval, ComplianceStats } from '@/lib/types';
import { loadTemperatureData } from '@/lib/csvParser';
import { calculateComplianceStats } from '@/lib/complianceChecker';
import { aggregateReadings, identifyViolationPeriods, ViolationPeriod } from '@/lib/dataAggregator';
import { TemperatureChart } from '@/components/TemperatureChart';
import { ComplianceStatsComponent } from '@/components/ComplianceStats';
import { ViolationPeriods } from '@/components/ViolationPeriods';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

export default function Home() {
  const [readings, setReadings] = useState<TemperatureReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interval, setInterval] = useState<TimeInterval>('30min');

  useEffect(() => {
    loadTemperatureData()
      .then((data) => {
        setReadings(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading data:', err);
        setError('Failed to load temperature data');
        setLoading(false);
      });
  }, []);

  const stats: ComplianceStats = useMemo(() => {
    if (readings.length === 0) {
      return {
        totalReadings: 0,
        compliantReadings: 0,
        violationReadings: 0,
        complianceRate: 0,
        dayTimeViolations: 0,
        nightTimeViolations: 0,
        totalViolationHours: 0,
      };
    }
    return calculateComplianceStats(readings);
  }, [readings]);

  const aggregatedData = useMemo(() => {
    if (readings.length === 0) return [];
    return aggregateReadings(readings, interval);
  }, [readings, interval]);

  const violationPeriods: ViolationPeriod[] = useMemo(() => {
    if (readings.length === 0) return [];
    return identifyViolationPeriods(readings);
  }, [readings]);

  const dateRange = useMemo(() => {
    if (readings.length === 0) return null;
    const start = readings[0].timestamp;
    const end = readings[readings.length - 1].timestamp;
    return { start, end };
  }, [readings]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading temperature data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold tracking-tight">Apartment Temperature Compliance</h1>
            {dateRange && (
              <Badge variant="outline" className="text-sm">
                {dateRange.start.toLocaleDateString()} - {dateRange.end.toLocaleDateString()}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            NYC Heating Law: 68°F (6am-10pm) | 62°F (10pm-6am)
          </p>
        </div>

        {/* Statistics Cards */}
        <ComplianceStatsComponent stats={stats} />

        {/* Chart with Interval Controls */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Temperature History</CardTitle>
                <CardDescription>
                  Red highlighted areas indicate non-compliant periods
                </CardDescription>
              </div>
              <Tabs value={interval} onValueChange={(v) => setInterval(v as TimeInterval)}>
                <TabsList>
                  <TabsTrigger value="5min">5 min</TabsTrigger>
                  <TabsTrigger value="30min">30 min</TabsTrigger>
                  <TabsTrigger value="1hour">1 hour</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[500px]">
              <TemperatureChart data={aggregatedData} interval={interval} />
            </div>
          </CardContent>
        </Card>

        {/* Violation Periods */}
        <ViolationPeriods periods={violationPeriods} />

        {/* Data Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Data Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Total Data Points</p>
                <p className="text-2xl font-bold">{stats.totalReadings.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date Range</p>
                <p className="text-lg font-medium">
                  {dateRange && (
                    <>
                      {dateRange.start.toLocaleDateString()} - {dateRange.end.toLocaleDateString()}
                    </>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Duration</p>
                <p className="text-2xl font-bold">
                  {dateRange &&
                    Math.round(
                      (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
                    )}{' '}
                  days
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
