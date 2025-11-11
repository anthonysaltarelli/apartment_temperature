/**
 * Weather API service using Open-Meteo
 * Fetches historical outdoor temperature data
 */

export interface OutdoorTemperatureReading {
  timestamp: Date;
  temperature: number; // in Fahrenheit
}

// NYC coordinates (Upper East Side)
export const NYC_LATITUDE = 40.786701;
export const NYC_LONGITUDE = -73.973149;

/**
 * Fetches historical outdoor temperature data from Open-Meteo
 * @param startDate - Start date for historical data
 * @param endDate - End date for historical data
 * @param latitude - Latitude (defaults to NYC)
 * @param longitude - Longitude (defaults to NYC)
 * @returns Array of outdoor temperature readings
 */
export async function fetchOutdoorTemperature(
  startDate: Date,
  endDate: Date,
  latitude: number = NYC_LATITUDE,
  longitude: number = NYC_LONGITUDE
): Promise<OutdoorTemperatureReading[]> {
  // Format dates as YYYY-MM-DD
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const start = formatDate(startDate);
  const end = formatDate(endDate);

  // Open-Meteo Historical Weather API endpoint
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${start}&end_date=${end}&hourly=temperature_2m&temperature_unit=fahrenheit&timezone=America/New_York`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Weather API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Parse the response
    const timestamps: string[] = data.hourly.time;
    const temperatures: number[] = data.hourly.temperature_2m;

    if (!timestamps || !temperatures) {
      throw new Error('Invalid response format from weather API');
    }

    // Convert to our format
    const readings: OutdoorTemperatureReading[] = timestamps.map((timeStr, index) => ({
      timestamp: new Date(timeStr),
      temperature: temperatures[index],
    }));

    return readings;
  } catch (error) {
    console.error('Error fetching outdoor temperature:', error);
    throw error;
  }
}

/**
 * Finds the closest outdoor temperature reading for a given timestamp
 * @param timestamp - The timestamp to find temperature for
 * @param outdoorReadings - Array of outdoor temperature readings
 * @returns The temperature in Fahrenheit, or null if not found
 */
export function getOutdoorTempForTimestamp(
  timestamp: Date,
  outdoorReadings: OutdoorTemperatureReading[]
): number | null {
  if (outdoorReadings.length === 0) return null;

  // Binary search for closest timestamp (readings should be sorted by timestamp)
  let left = 0;
  let right = outdoorReadings.length - 1;
  let closest = outdoorReadings[0];
  let minDiff = Math.abs(timestamp.getTime() - outdoorReadings[0].timestamp.getTime());

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const diff = Math.abs(timestamp.getTime() - outdoorReadings[mid].timestamp.getTime());

    if (diff < minDiff) {
      minDiff = diff;
      closest = outdoorReadings[mid];
    }

    if (outdoorReadings[mid].timestamp.getTime() < timestamp.getTime()) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  // Only return if within 1 hour (3600000 ms) of the timestamp
  if (minDiff <= 3600000) {
    return closest.temperature;
  }

  return null;
}
