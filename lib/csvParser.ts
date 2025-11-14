import Papa from 'papaparse';
import { TemperatureReading, RadiatorReading } from './types';
import { checkCompliance } from './complianceChecker';

interface CSVRow {
  Date: string;
  Time: string;
  Temperature_Fahrenheit: string;
  'Relative_Humidity(%)': string;
}

export async function parseTemperatureCSV(csvText: string): Promise<TemperatureReading[]> {
  return new Promise((resolve, reject) => {
    // Remove BOM from the beginning of the file
    const cleanedText = csvText.replace(/^\uFEFF/, '');

    // Split into lines and skip the first line (header description)
    const lines = cleanedText.split('\n');
    const csvData = lines.slice(1).join('\n'); // Skip first line "Timestamp for sample frequency..."

    Papa.parse<CSVRow>(csvData, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => {
        // Remove BOM and trim
        return header.replace(/^\uFEFF/, '').trim();
      },
      transform: (value) => {
        // Remove BOM from values
        return value.replace(/^\uFEFF/, '').trim();
      },
      complete: (results) => {
        try {
          console.log('Parsed rows:', results.data.length);
          console.log('First row:', results.data[0]);

          const readings: TemperatureReading[] = results.data
            .filter(row => {
              // More defensive filtering
              return row && row.Date && row.Time && row.Temperature_Fahrenheit;
            })
            .map((row) => {
              // Parse date and time
              const dateStr = row.Date.replace(/^\uFEFF/, '').trim();
              const timeStr = row.Time.trim();

              // Convert to a proper date object
              const [month, day, year] = dateStr.split('/');
              const timestamp = new Date(`${month}/${day}/${year} ${timeStr}`);

              const temperature = parseFloat(row.Temperature_Fahrenheit);
              const humidity = parseFloat(row['Relative_Humidity(%)']);

              const { isCompliant, requiredTemp } = checkCompliance(timestamp, temperature);

              return {
                timestamp,
                temperature,
                humidity,
                isCompliant,
                requiredTemp,
              };
            })
            .filter(reading => {
              const isValid = !isNaN(reading.temperature) &&
                             !isNaN(reading.humidity) &&
                             !isNaN(reading.timestamp.getTime());
              return isValid;
            });

          console.log('Valid readings:', readings.length);

          // Sort by timestamp
          readings.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

          resolve(readings);
        } catch (error) {
          console.error('Parse error:', error);
          reject(error);
        }
      },
      error: (error: Error) => {
        console.error('CSV parse error:', error);
        reject(error);
      },
    });
  });
}

export async function loadTemperatureData(): Promise<TemperatureReading[]> {
  const response = await fetch('/temperature_export.csv');
  const csvText = await response.text();
  return parseTemperatureCSV(csvText);
}

// Classify radiator state based on temperature patterns
function classifyRadiatorState(
  currentTemp: number,
  previousTemp: number | null,
  nextTemp: number | null
): 'on' | 'cooling' | 'off' {
  const OFF_THRESHOLD = 70; // Below this is considered off
  const TEMP_CHANGE_THRESHOLD = 0.3; // Minimum temperature change to detect heating/cooling

  // If temperature is below 70°F, it's off
  if (currentTemp < OFF_THRESHOLD) {
    return 'off';
  }

  // Check if temperature is increasing (heating/on)
  if (previousTemp !== null) {
    const tempChange = currentTemp - previousTemp;

    if (tempChange > TEMP_CHANGE_THRESHOLD) {
      // Temperature is rising - radiator is on/heating
      return 'on';
    } else if (tempChange < -TEMP_CHANGE_THRESHOLD) {
      // Temperature is declining - radiator is cooling down
      return 'cooling';
    }
  }

  // If we can't determine from previous temp, check next temp
  if (nextTemp !== null) {
    const nextTempChange = nextTemp - currentTemp;

    if (nextTempChange > TEMP_CHANGE_THRESHOLD) {
      // About to heat up - consider it on
      return 'on';
    } else if (nextTempChange < -TEMP_CHANGE_THRESHOLD) {
      // About to cool down - consider it cooling
      return 'cooling';
    }
  }

  // If temperature is stable above 70°F, it's likely at peak or cooling very slowly
  // Default to cooling since radiators typically cool after reaching peak
  return currentTemp >= 90 ? 'on' : 'cooling';
}

export async function parseRadiatorCSV(csvText: string): Promise<RadiatorReading[]> {
  return new Promise((resolve, reject) => {
    const cleanedText = csvText.replace(/^\uFEFF/, '');
    const lines = cleanedText.split('\n');
    const csvData = lines.slice(1).join('\n');

    // Filter threshold: 11/11/2025 at 3:30 PM
    const filterDate = new Date('11/11/2025 3:30 PM');

    Papa.parse<CSVRow>(csvData, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.replace(/^\uFEFF/, '').trim(),
      transform: (value) => value.replace(/^\uFEFF/, '').trim(),
      complete: (results) => {
        try {
          const rawReadings = results.data
            .filter(row => row && row.Date && row.Time && row.Temperature_Fahrenheit)
            .map((row) => {
              const dateStr = row.Date.replace(/^\uFEFF/, '').trim();
              const timeStr = row.Time.trim();
              const [month, day, year] = dateStr.split('/');
              const timestamp = new Date(`${month}/${day}/${year} ${timeStr}`);
              const temperature = parseFloat(row.Temperature_Fahrenheit);
              const humidity = parseFloat(row['Relative_Humidity(%)']);

              return {
                timestamp,
                temperature,
                humidity,
              };
            })
            .filter(reading =>
              !isNaN(reading.temperature) &&
              !isNaN(reading.humidity) &&
              !isNaN(reading.timestamp.getTime()) &&
              reading.timestamp >= filterDate // Only include data from 11/11/2025 3:30 PM onwards
            );

          // Sort by timestamp
          rawReadings.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

          // Classify states based on temperature patterns
          const readings: RadiatorReading[] = rawReadings.map((reading, index) => {
            const previousTemp = index > 0 ? rawReadings[index - 1].temperature : null;
            const nextTemp = index < rawReadings.length - 1 ? rawReadings[index + 1].temperature : null;

            const status = classifyRadiatorState(reading.temperature, previousTemp, nextTemp);

            return {
              ...reading,
              status,
            };
          });

          resolve(readings);
        } catch (error) {
          console.error('Parse error:', error);
          reject(error);
        }
      },
      error: (error: Error) => {
        console.error('CSV parse error:', error);
        reject(error);
      },
    });
  });
}

export async function loadRadiatorData(): Promise<RadiatorReading[]> {
  const response = await fetch('/radiator_temperature.csv');
  const csvText = await response.text();
  return parseRadiatorCSV(csvText);
}
