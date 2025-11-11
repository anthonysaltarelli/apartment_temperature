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

export function identifyViolationPeriods(
  readings: TemperatureReading[]
): ViolationPeriod[] {
  const periods: ViolationPeriod[] = [];
  let currentPeriod: {
    start: Date;
    readings: TemperatureReading[];
    type: 'daytime' | 'nighttime';
  } | null = null;

  readings.forEach((reading, index) => {
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
          const temps = currentPeriod.readings.map((r) => r.temperature);
          periods.push({
            start: currentPeriod.start,
            end: currentPeriod.readings[currentPeriod.readings.length - 1].timestamp,
            duration: currentPeriod.readings.length,
            minTemp: Math.min(...temps),
            maxTemp: Math.max(...temps),
            avgTemp: temps.reduce((a, b) => a + b, 0) / temps.length,
            type: currentPeriod.type,
          });
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
        const temps = currentPeriod.readings.map((r) => r.temperature);
        periods.push({
          start: currentPeriod.start,
          end: currentPeriod.readings[currentPeriod.readings.length - 1].timestamp,
          duration: currentPeriod.readings.length,
          minTemp: Math.min(...temps),
          maxTemp: Math.max(...temps),
          avgTemp: temps.reduce((a, b) => a + b, 0) / temps.length,
          type: currentPeriod.type,
        });
        currentPeriod = null;
      }
    }
  });

  // Don't forget the last period if still open
  if (currentPeriod) {
    const temps = currentPeriod.readings.map((r) => r.temperature);
    periods.push({
      start: currentPeriod.start,
      end: currentPeriod.readings[currentPeriod.readings.length - 1].timestamp,
      duration: currentPeriod.readings.length,
      minTemp: Math.min(...temps),
      maxTemp: Math.max(...temps),
      avgTemp: temps.reduce((a, b) => a + b, 0) / temps.length,
      type: currentPeriod.type,
    });
  }

  return periods;
}
