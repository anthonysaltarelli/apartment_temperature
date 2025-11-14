'use client';

import { useEffect, useState, useMemo } from 'react';
import { startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { TemperatureReading, TimeInterval, ComplianceStats, RadiatorReading } from '@/lib/types';
import { loadTemperatureData, loadRadiatorData } from '@/lib/csvParser';
import { calculateComplianceStats, checkCompliance } from '@/lib/complianceChecker';
import { aggregateReadings, aggregateRadiatorReadings, identifyViolationPeriods, ViolationPeriod } from '@/lib/dataAggregator';
import { fetchOutdoorTemperature, getOutdoorTempForTimestamp } from '@/lib/weatherApi';
import { TemperatureChart } from '@/components/TemperatureChart';
import { RadiatorChart } from '@/components/RadiatorChart';
import { ComplianceStatsComponent } from '@/components/ComplianceStats';
import { ViolationPeriods } from '@/components/ViolationPeriods';
import { DateRangeFilter, DateRange } from '@/components/DateRangeFilter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function Home() {
  const [allReadings, setAllReadings] = useState<TemperatureReading[]>([]);
  const [allRadiatorReadings, setAllRadiatorReadings] = useState<RadiatorReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interval, setInterval] = useState<TimeInterval>('30min');
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [outdoorDataLoading, setOutdoorDataLoading] = useState(false);
  const [tempDisplay, setTempDisplay] = useState<'indoor' | 'outdoor' | 'both'>('both');

  useEffect(() => {
    async function loadData() {
      try {
        // Load indoor temperature data
        const indoorData = await loadTemperatureData();

        if (indoorData.length === 0) {
          setError('No temperature data available');
          setLoading(false);
          return;
        }

        // Load radiator temperature data
        try {
          const radiatorData = await loadRadiatorData();
          setAllRadiatorReadings(radiatorData);
          console.log('Radiator temperature data loaded successfully:', radiatorData.length, 'readings');
        } catch (radiatorError) {
          console.warn('Failed to load radiator temperature data:', radiatorError);
          // Continue without radiator data
        }

        // Set initial date range
        const startDate = startOfDay(indoorData[0].timestamp);
        const endDate = endOfDay(indoorData[indoorData.length - 1].timestamp);

        setDateRange({
          from: startDate,
          to: endDate,
        });

        // Fetch outdoor temperature data
        setOutdoorDataLoading(true);
        try {
          const outdoorData = await fetchOutdoorTemperature(startDate, endDate);

          // Merge outdoor temperature into indoor readings
          const enrichedData = indoorData.map((reading) => {
            const outdoorTemp = getOutdoorTempForTimestamp(reading.timestamp, outdoorData);

            // Recalculate compliance with outdoor temperature
            const { isCompliant, requiredTemp } = checkCompliance(
              reading.timestamp,
              reading.temperature,
              outdoorTemp ?? undefined
            );

            return {
              ...reading,
              outdoorTemp: outdoorTemp ?? undefined,
              isCompliant,
              requiredTemp,
            };
          });

          setAllReadings(enrichedData);
          console.log('Outdoor temperature data loaded successfully');
        } catch (outdoorError) {
          console.warn('Failed to load outdoor temperature data:', outdoorError);
          // Continue with indoor data only
          setAllReadings(indoorData);
        } finally {
          setOutdoorDataLoading(false);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load temperature data');
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Filter readings based on selected date range
  const readings = useMemo(() => {
    if (!dateRange) return allReadings;

    return allReadings.filter((reading) =>
      isWithinInterval(reading.timestamp, {
        start: dateRange.from,
        end: dateRange.to,
      })
    );
  }, [allReadings, dateRange]);

  // Filter radiator readings based on selected date range
  const radiatorReadings = useMemo(() => {
    if (!dateRange) return allRadiatorReadings;

    return allRadiatorReadings.filter((reading) =>
      isWithinInterval(reading.timestamp, {
        start: dateRange.from,
        end: dateRange.to,
      })
    );
  }, [allRadiatorReadings, dateRange]);

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

  const aggregatedRadiatorData = useMemo(() => {
    if (radiatorReadings.length === 0) return [];
    return aggregateRadiatorReadings(radiatorReadings, interval);
  }, [radiatorReadings, interval]);

  const violationPeriods: ViolationPeriod[] = useMemo(() => {
    if (readings.length === 0) return [];
    return identifyViolationPeriods(readings);
  }, [readings]);

  const availableDateRange = useMemo(() => {
    if (allReadings.length === 0) return null;
    const start = allReadings[0].timestamp;
    const end = allReadings[allReadings.length - 1].timestamp;
    return { start, end };
  }, [allReadings]);

  const displayDateRange = useMemo(() => {
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
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Apartment Temperature Compliance</h1>
              <p className="text-muted-foreground mt-1">
                NYC Heating Law: 68°F (6am-10pm, if outdoor &lt; 55°F) | 62°F (10pm-6am)
              </p>
              {outdoorDataLoading && (
                <p className="text-sm text-muted-foreground mt-1">
                  Loading outdoor temperature data...
                </p>
              )}
            </div>
            {displayDateRange && (
              <Badge variant="outline" className="text-sm">
                Showing: {displayDateRange.start.toLocaleDateString()} - {displayDateRange.end.toLocaleDateString()}
              </Badge>
            )}
          </div>

          {/* Date Range Filter */}
          {dateRange && availableDateRange && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Date Range Filter</CardTitle>
                <CardDescription>
                  Select a date range to analyze temperature compliance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DateRangeFilter
                  dateRange={dateRange}
                  availableRange={availableDateRange}
                  onDateRangeChange={setDateRange}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Statistics Cards */}
        <ComplianceStatsComponent stats={stats} />

        {/* Chart with Interval Controls */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle>Temperature History</CardTitle>
                <CardDescription>
                  Red highlighted areas indicate non-compliant periods
                  {aggregatedRadiatorData.length > 0 && (
                    <> | Color bar at bottom shows radiator status (Bright Red: On, Amber: Cooling, Blue: Off)</>
                  )}
                </CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
                  <Button
                    variant={tempDisplay === 'indoor' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setTempDisplay('indoor')}
                    className="h-7 px-3"
                  >
                    Indoor
                  </Button>
                  <Button
                    variant={tempDisplay === 'outdoor' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setTempDisplay('outdoor')}
                    className="h-7 px-3"
                  >
                    Outdoor
                  </Button>
                  <Button
                    variant={tempDisplay === 'both' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setTempDisplay('both')}
                    className="h-7 px-3"
                  >
                    Both
                  </Button>
                </div>
                <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
                  <Button
                    variant={interval === '5min' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setInterval('5min')}
                    className="h-7 px-3"
                  >
                    5 min
                  </Button>
                  <Button
                    variant={interval === '30min' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setInterval('30min')}
                    className="h-7 px-3"
                  >
                    30 min
                  </Button>
                  <Button
                    variant={interval === '1hour' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setInterval('1hour')}
                    className="h-7 px-3"
                  >
                    1 hour
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[500px]">
              <TemperatureChart
                data={aggregatedData}
                interval={interval}
                tempDisplay={tempDisplay}
                radiatorData={aggregatedRadiatorData}
              />
            </div>
          </CardContent>
        </Card>

        {/* Radiator Temperature Chart */}
        {aggregatedRadiatorData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Radiator Temperature History</CardTitle>
              <CardDescription>
                Color-coded zones: Bright Red (On/Heating), Amber (Cooling Down), Blue (Off)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <RadiatorChart data={aggregatedRadiatorData} interval={interval} />
              </div>
            </CardContent>
          </Card>
        )}

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
                  {displayDateRange && (
                    <>
                      {displayDateRange.start.toLocaleDateString()} - {displayDateRange.end.toLocaleDateString()}
                    </>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Duration</p>
                <p className="text-2xl font-bold">
                  {displayDateRange &&
                    Math.round(
                      (displayDateRange.end.getTime() - displayDateRange.start.getTime()) / (1000 * 60 * 60 * 24)
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
