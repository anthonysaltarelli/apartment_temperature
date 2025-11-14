export interface TemperatureReading {
  timestamp: Date;
  temperature: number;
  humidity: number;
  isCompliant: boolean;
  requiredTemp: number; // 68 or 62 based on time
  outdoorTemp?: number; // Outdoor temperature in Fahrenheit (optional)
}

export interface AggregatedReading {
  timestamp: Date;
  avgTemperature: number;
  minTemperature: number;
  maxTemperature: number;
  avgHumidity: number;
  isCompliant: boolean;
  violationCount: number;
  totalReadings: number;
  avgOutdoorTemp?: number; // Average outdoor temperature (optional)
}

export interface ComplianceStats {
  totalReadings: number;
  compliantReadings: number;
  violationReadings: number;
  complianceRate: number;
  dayTimeViolations: number; // 6am-10pm, should be >= 68°F
  nightTimeViolations: number; // 10pm-6am, should be >= 62°F
  totalViolationHours: number;
}

export type TimeInterval = '1min' | '5min' | '30min' | '1hour';

export interface RadiatorReading {
  timestamp: Date;
  temperature: number;
  humidity: number;
  status: 'on' | 'cooling' | 'off';
}

export interface AggregatedRadiatorReading {
  timestamp: Date;
  avgTemperature: number;
  minTemperature: number;
  maxTemperature: number;
  avgHumidity: number;
  status: 'on' | 'cooling' | 'off';
  totalReadings: number;
}
