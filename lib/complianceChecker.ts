import { TemperatureReading, ComplianceStats } from './types';

/**
 * NYC Heating Law Requirements (October 1 - May 31):
 * - Day time (6am - 10pm): Temperature must be >= 68°F IF outdoor temp < 55°F
 * - Night time (10pm - 6am): Temperature must be >= 62°F (regardless of outdoor temp)
 *
 * @param timestamp - The timestamp of the reading
 * @param temperature - Indoor temperature in Fahrenheit
 * @param outdoorTemp - Outdoor temperature in Fahrenheit (optional)
 * @returns Compliance status and required temperature
 */
export function checkCompliance(
  timestamp: Date,
  temperature: number,
  outdoorTemp?: number
): { isCompliant: boolean; requiredTemp: number } {
  const hour = timestamp.getHours();
  const month = timestamp.getMonth(); // 0-11 (0=Jan, 9=Oct, 4=May)

  // Check if we're in heating season (October 1 - May 31)
  // October = 9, November = 10, December = 11, January = 0, February = 1, March = 2, April = 3, May = 4
  const isHeatingSeason = month >= 9 || month <= 4;

  // If not in heating season, no heating requirements apply
  if (!isHeatingSeason) {
    return {
      isCompliant: true,
      requiredTemp: 0,
    };
  }

  // Day time: 6am to 10pm (not including 10pm)
  if (hour >= 6 && hour < 22) {
    // Daytime requirement: 68°F only if outdoor temp < 55°F
    // If we don't have outdoor temp data, assume requirement applies (conservative approach)
    const requirementApplies = outdoorTemp === undefined || outdoorTemp < 55;

    if (!requirementApplies) {
      // Outdoor temp >= 55°F, no heating requirement
      return {
        isCompliant: true,
        requiredTemp: 68, // Still show 68 as the threshold for context
      };
    }

    return {
      isCompliant: temperature >= 68.0,
      requiredTemp: 68,
    };
  }

  // Night time: 10pm to 6am - always requires >= 62°F (regardless of outdoor temp)
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
