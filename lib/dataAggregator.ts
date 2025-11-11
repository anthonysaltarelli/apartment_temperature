import { TemperatureReading, AggregatedReading, TimeInterval } from './types';

function getIntervalMinutes(interval: TimeInterval): number {
  switch (interval) {
    case '1min':
      return 1;
    case '5min':
      return 5;
    case '30min':
      return 30;
    case '1hour':
      return 60;
  }
}

function floorToInterval(date: Date, intervalMinutes: number): Date {
  const ms = date.getTime();
  const intervalMs = intervalMinutes * 60 * 1000;
  return new Date(Math.floor(ms / intervalMs) * intervalMs);
}

export function aggregateReadings(
  readings: TemperatureReading[],
  interval: TimeInterval
): AggregatedReading[] {
  if (interval === '1min') {
    // No aggregation needed for 1-minute intervals
    return readings.map((reading) => ({
      timestamp: reading.timestamp,
      avgTemperature: reading.temperature,
      minTemperature: reading.temperature,
      maxTemperature: reading.temperature,
      avgHumidity: reading.humidity,
      isCompliant: reading.isCompliant,
      violationCount: reading.isCompliant ? 0 : 1,
      totalReadings: 1,
    }));
  }

  const intervalMinutes = getIntervalMinutes(interval);
  const buckets = new Map<number, TemperatureReading[]>();

  // Group readings by interval
  readings.forEach((reading) => {
    const bucketTime = floorToInterval(reading.timestamp, intervalMinutes).getTime();
    if (!buckets.has(bucketTime)) {
      buckets.set(bucketTime, []);
    }
    buckets.get(bucketTime)!.push(reading);
  });

  // Aggregate each bucket
  const aggregated: AggregatedReading[] = [];

  buckets.forEach((bucketReadings, bucketTime) => {
    const temps = bucketReadings.map((r) => r.temperature);
    const humidities = bucketReadings.map((r) => r.humidity);
    const violationCount = bucketReadings.filter((r) => !r.isCompliant).length;

    const avgTemperature = temps.reduce((a, b) => a + b, 0) / temps.length;
    const minTemperature = Math.min(...temps);
    const maxTemperature = Math.max(...temps);
    const avgHumidity = humidities.reduce((a, b) => a + b, 0) / humidities.length;

    // Consider the interval compliant only if all readings are compliant
    const isCompliant = violationCount === 0;

    aggregated.push({
      timestamp: new Date(bucketTime),
      avgTemperature,
      minTemperature,
      maxTemperature,
      avgHumidity,
      isCompliant,
      violationCount,
      totalReadings: bucketReadings.length,
    });
  });

  // Sort by timestamp
  aggregated.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return aggregated;
}

// Identify continuous violation periods
export interface ViolationPeriod {
  start: Date;
  end: Date;
  duration: number; // in minutes
  minTemp: number;
  maxTemp: number;
  avgTemp: number;
  type: 'daytime' | 'nighttime';
}

// Group violation periods by day
export interface DayViolations {
  date: Date; // Normalized to start of day
  periods: ViolationPeriod[];
}

export function groupViolationsByDay(periods: ViolationPeriod[]): DayViolations[] {
  const dayMap = new Map<string, ViolationPeriod[]>();

  periods.forEach((period) => {
    // Normalize to start of day
    const dayKey = new Date(
      period.start.getFullYear(),
      period.start.getMonth(),
      period.start.getDate()
    ).toISOString();

    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, []);
    }
    dayMap.get(dayKey)!.push(period);
  });

  // Convert to array and sort
  const dayViolations: DayViolations[] = Array.from(dayMap.entries()).map(
    ([dateStr, dayPeriods]) => ({
      date: new Date(dateStr),
      periods: dayPeriods.sort((a, b) => a.start.getTime() - b.start.getTime()),
    })
  );

  // Sort by date (most recent first for display)
  dayViolations.sort((a, b) => b.date.getTime() - a.date.getTime());

  return dayViolations;
}

// Helper to convert accumulated period to ViolationPeriod
function finalizePeriod(period: {
  start: Date;
  readings: TemperatureReading[];
  type: 'daytime' | 'nighttime';
}): ViolationPeriod {
  const temps = period.readings.map((r) => r.temperature);
  return {
    start: period.start,
    end: period.readings[period.readings.length - 1].timestamp,
    duration: period.readings.length,
    minTemp: Math.min(...temps),
    maxTemp: Math.max(...temps),
    avgTemp: temps.reduce((a, b) => a + b, 0) / temps.length,
    type: period.type,
  };
}

export function identifyViolationPeriods(
  readings: TemperatureReading[],
  gapToleranceMinutes: number = 5
): ViolationPeriod[] {
  const periods: ViolationPeriod[] = [];
  let currentPeriod: {
    start: Date;
    readings: TemperatureReading[];
    type: 'daytime' | 'nighttime';
  } | null = null;

  readings.forEach((reading) => {
    if (!reading.isCompliant) {
      const hour = reading.timestamp.getHours();
      const type = hour >= 6 && hour < 22 ? 'daytime' : 'nighttime';

      if (currentPeriod && currentPeriod.type === type) {
        // Continue current period
        currentPeriod.readings.push(reading);
      } else {
        // Start new period (or switch type)
        if (currentPeriod) {
          // Save previous period
          periods.push(finalizePeriod(currentPeriod));
        }
        currentPeriod = {
          start: reading.timestamp,
          readings: [reading],
          type,
        };
      }
    } else {
      // Compliant reading - end current period if exists
      if (currentPeriod) {
        periods.push(finalizePeriod(currentPeriod));
        currentPeriod = null;
      }
    }
  });

  // Don't forget the last period if still open
  if (currentPeriod) {
    periods.push(finalizePeriod(currentPeriod));
  }

  // Merge periods that are close together (within gap tolerance)
  return mergeCloseViolationPeriods(periods, gapToleranceMinutes);
}

// Merge violation periods that are separated by small gaps
function mergeCloseViolationPeriods(
  periods: ViolationPeriod[],
  gapToleranceMinutes: number
): ViolationPeriod[] {
  if (periods.length === 0) return periods;

  const merged: ViolationPeriod[] = [];
  let current = { ...periods[0] };

  for (let i = 1; i < periods.length; i++) {
    const next = periods[i];
    const gapMinutes = (next.start.getTime() - current.end.getTime()) / (1000 * 60);

    // Merge if same type and gap is within tolerance
    if (current.type === next.type && gapMinutes <= gapToleranceMinutes) {
      // Merge the periods
      current = {
        start: current.start,
        end: next.end,
        duration: current.duration + next.duration + Math.round(gapMinutes),
        minTemp: Math.min(current.minTemp, next.minTemp),
        maxTemp: Math.max(current.maxTemp, next.maxTemp),
        avgTemp: (current.avgTemp * current.duration + next.avgTemp * next.duration) /
                 (current.duration + next.duration),
        type: current.type,
      };
    } else {
      // Gap too large or different type - save current and start new
      merged.push(current);
      current = { ...next };
    }
  }

  // Don't forget the last period
  merged.push(current);

  return merged;
}
