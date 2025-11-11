'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
  ReferenceArea,
} from 'recharts';
import { format } from 'date-fns';
import { AggregatedReading, TimeInterval } from '@/lib/types';

interface TemperatureChartProps {
  data: AggregatedReading[];
  interval: TimeInterval;
}

export function TemperatureChart({ data, interval }: TemperatureChartProps) {
  // Define format function first
  const formatTimestamp = (date: Date, interval: TimeInterval): string => {
    switch (interval) {
      case '1min':
      case '5min':
        return format(date, 'MM/dd h:mm a');
      case '30min':
        return format(date, 'MM/dd h:mm a');
      case '1hour':
        return format(date, 'MM/dd ha');
    }
  };

  // Prepare chart data with formatted timestamps
  const chartData = useMemo(() => {
    return data.map((reading) => ({
      timestamp: reading.timestamp.getTime(),
      displayTime: formatTimestamp(reading.timestamp, interval),
      temperature: parseFloat(reading.avgTemperature.toFixed(1)),
      minTemp: parseFloat(reading.minTemperature.toFixed(1)),
      maxTemp: parseFloat(reading.maxTemperature.toFixed(1)),
      outdoorTemp: reading.avgOutdoorTemp !== undefined ? parseFloat(reading.avgOutdoorTemp.toFixed(1)) : undefined,
      isCompliant: reading.isCompliant,
      violationCount: reading.violationCount,
    }));
  }, [data, interval]);

  // Identify violation zones for highlighting
  const violationZones = useMemo(() => {
    const zones: Array<{ start: number; end: number }> = [];
    let currentZoneStart: number | null = null;

    chartData.forEach((point, index) => {
      // Mark as violation if the interval is not compliant OR has any violations
      const hasViolations = !point.isCompliant || (point as any).violationCount > 0;

      if (hasViolations) {
        if (currentZoneStart === null) {
          currentZoneStart = point.timestamp;
        }
      } else {
        if (currentZoneStart !== null) {
          zones.push({
            start: currentZoneStart,
            end: chartData[index - 1]?.timestamp || currentZoneStart,
          });
          currentZoneStart = null;
        }
      }
    });

    // Close last zone if still open
    if (currentZoneStart !== null && chartData.length > 0) {
      zones.push({
        start: currentZoneStart,
        end: chartData[chartData.length - 1].timestamp,
      });
    }

    return zones;
  }, [chartData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isViolation = !data.isCompliant;

      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium text-sm mb-1">{data.displayTime}</p>
          <div className="space-y-1 text-sm">
            <p className="flex justify-between gap-4">
              <span className="text-muted-foreground">Indoor Temp:</span>
              <span
                className={`font-medium ${
                  isViolation ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {data.temperature}°F
              </span>
            </p>
            {data.outdoorTemp !== undefined && (
              <p className="flex justify-between gap-4">
                <span className="text-muted-foreground">Outdoor Temp:</span>
                <span className="text-blue-600 font-medium">{data.outdoorTemp}°F</span>
              </p>
            )}
            {interval !== '1min' && (
              <>
                <p className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Min:</span>
                  <span>{data.minTemp}°F</span>
                </p>
                <p className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Max:</span>
                  <span>{data.maxTemp}°F</span>
                </p>
              </>
            )}
            <p className="flex justify-between gap-4">
              <span className="text-muted-foreground">Status:</span>
              <span
                className={`font-medium ${
                  isViolation ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {isViolation ? 'Non-Compliant' : 'Compliant'}
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="timestamp"
          type="number"
          domain={['dataMin', 'dataMax']}
          tickFormatter={(timestamp) => {
            const date = new Date(timestamp);
            return formatTimestamp(date, interval);
          }}
          tick={{ fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis
          label={{ value: 'Temperature (°F)', angle: -90, position: 'insideLeft' }}
          domain={[55, 'dataMax + 2']}
          tick={{ fontSize: 12 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />

        {/* Violation zones - highlighted in red */}
        {violationZones.map((zone, index) => (
          <ReferenceArea
            key={`violation-${index}`}
            x1={zone.start}
            x2={zone.end}
            fill="#ef4444"
            fillOpacity={0.15}
            strokeOpacity={0}
          />
        ))}

        {/* Reference lines for legal thresholds */}
        <ReferenceLine
          y={68}
          stroke="#ef4444"
          strokeDasharray="5 5"
          label={{ value: '68°F (Day)', position: 'right', fontSize: 11 }}
        />
        <ReferenceLine
          y={62}
          stroke="#f97316"
          strokeDasharray="5 5"
          label={{ value: '62°F (Night)', position: 'right', fontSize: 11 }}
        />
        <ReferenceLine
          y={55}
          stroke="#0891b2"
          strokeDasharray="3 3"
          label={{ value: '55°F (Outdoor Threshold)', position: 'right', fontSize: 11 }}
        />

        {/* Indoor temperature line */}
        <Line
          type="monotone"
          dataKey="temperature"
          stroke="#2563eb"
          strokeWidth={2}
          dot={false}
          name="Indoor Temp"
          isAnimationActive={false}
        />

        {/* Outdoor temperature line */}
        <Line
          type="monotone"
          dataKey="outdoorTemp"
          stroke="#0891b2"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={false}
          name="Outdoor Temp"
          isAnimationActive={false}
          connectNulls={true}
        />

        {/* Min/Max range for aggregated intervals */}
        {interval !== '1min' && (
          <>
            <Line
              type="monotone"
              dataKey="minTemp"
              stroke="#94a3b8"
              strokeWidth={1}
              strokeDasharray="3 3"
              dot={false}
              name="Min Indoor"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="maxTemp"
              stroke="#94a3b8"
              strokeWidth={1}
              strokeDasharray="3 3"
              dot={false}
              name="Max Indoor"
              isAnimationActive={false}
            />
          </>
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
