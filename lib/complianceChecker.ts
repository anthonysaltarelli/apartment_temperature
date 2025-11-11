import { TemperatureReading, ComplianceStats } from './types';

/**
 * NYC Heating Law Requirements:
 * - Day time (6am - 10pm): Temperature must be >= 68°F
 * - Night time (10pm - 6am): Temperature must be >= 62°F
 */
export function checkCompliance(
  timestamp: Date,
  temperature: number
): { isCompliant: boolean; requiredTemp: number } {
  const hour = timestamp.getHours();

  // Day time: 6am (6) to 10pm (22)
  if (hour >= 6 && hour < 22) {
    return {
      isCompliant: temperature >= 68.0,
      requiredTemp: 68,
    };
  }

  // Night time: 10pm to 6am
  return {
    isCompliant: temperature >= 62.0,
    requiredTemp: 62,
  };
}

export function calculateComplianceStats(readings: TemperatureReading[]): ComplianceStats {
  const totalReadings = readings.length;
  let compliantReadings = 0;
  let dayTimeViolations = 0;
  let nightTimeViolations = 0;

  readings.forEach((reading) => {
    if (reading.isCompliant) {
      compliantReadings++;
    } else {
      const hour = reading.timestamp.getHours();
      if (hour >= 6 && hour < 22) {
        dayTimeViolations++;
      } else {
        nightTimeViolations++;
      }
    }
  });

  const violationReadings = totalReadings - compliantReadings;
  const complianceRate = totalReadings > 0 ? (compliantReadings / totalReadings) * 100 : 0;

  // Calculate total violation hours (readings are every minute, so divide by 60)
  const totalViolationHours = violationReadings / 60;

  return {
    totalReadings,
    compliantReadings,
    violationReadings,
    complianceRate,
    dayTimeViolations,
    nightTimeViolations,
    totalViolationHours,
  };
}
