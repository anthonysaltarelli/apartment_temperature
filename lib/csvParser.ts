import Papa from 'papaparse';
import { TemperatureReading } from './types';
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
