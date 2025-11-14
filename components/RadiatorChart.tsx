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
  Area,
  ComposedChart,
  ReferenceArea,
} from 'recharts';
import { format } from 'date-fns';
import { AggregatedRadiatorReading, TimeInterval } from '@/lib/types';

interface RadiatorChartProps {
  data: AggregatedRadiatorReading[];
  interval: TimeInterval;
}

export function RadiatorChart({ data, interval }: RadiatorChartProps) {
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

  const chartData = useMemo(() => {
    // OPTIMIZED: Limit chart data to reasonable number of points to prevent memory issues
    const maxPoints = 5000;
    const samplingRate = data.length > maxPoints ? Math.ceil(data.length / maxPoints) : 1;

    const sampledData = samplingRate > 1
      ? data.filter((_, index) => index % samplingRate === 0)
      : data;

    return sampledData.map((reading) => ({
      timestamp: reading.timestamp.getTime(),
      displayTime: formatTimestamp(reading.timestamp, interval),
      temperature: parseFloat(reading.avgTemperature.toFixed(1)),
      minTemp: parseFloat(reading.minTemperature.toFixed(1)),
      maxTemp: parseFloat(reading.maxTemperature.toFixed(1)),
      status: reading.status,
    }));
  }, [data, interval]);

  // Identify zones by status
  // OPTIMIZED: Merge consecutive zones with same status to reduce render count
  const statusZones = useMemo(() => {
    if (chartData.length === 0) return [];

    const zones: Array<{ start: number; end: number; status: 'on' | 'cooling' | 'off' }> = [];
    let currentZone: { start: number; end: number; status: 'on' | 'cooling' | 'off' } | null = null;

    chartData.forEach((point, index) => {
      const start = point.timestamp;
      const end = index < chartData.length - 1
        ? chartData[index + 1].timestamp
        : point.timestamp + (30 * 60 * 1000);

      if (currentZone && currentZone.status === point.status) {
        // Extend current zone
        currentZone.end = end;
      } else {
        // Save previous zone and start new one
        if (currentZone) {
          zones.push(currentZone);
        }
        currentZone = { start, end, status: point.status };
      }
    });

    // Add the last zone
    if (currentZone) {
      zones.push(currentZone);
    }

    return zones;
  }, [chartData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const statusColor =
        data.status === 'on' ? 'text-red-600' :
        data.status === 'cooling' ? 'text-orange-600' :
        'text-blue-600';

      const statusLabel =
        data.status === 'on' ? 'On/Heating' :
        data.status === 'cooling' ? 'Cooling Down' :
        'Off';

      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium text-sm mb-1">{data.displayTime}</p>
          <div className="space-y-1 text-sm">
            <p className="flex justify-between gap-4">
              <span className="text-muted-foreground">Radiator Temp:</span>
              <span className="font-medium">{data.temperature}°F</span>
            </p>
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
              <span className={`font-medium ${statusColor}`}>
                {statusLabel}
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
          tick={{ fontSize: 12 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />

        {/* Status zones with different colors */}
        {statusZones.map((zone, index) => (
          <ReferenceArea
            key={`status-${index}`}
            x1={zone.start}
            x2={zone.end}
            fill={
              zone.status === 'on' ? '#dc2626' :      // Bright red for On/Heating
              zone.status === 'cooling' ? '#f59e0b' : // Amber/yellow-orange for Cooling
              '#3b82f6'                               // Blue for Off
            }
            fillOpacity={0.2}
            strokeOpacity={0}
          />
        ))}

        {/* Radiator temperature line */}
        <Line
          type="monotone"
          dataKey="temperature"
          stroke="#dc2626"
          strokeWidth={2}
          dot={false}
          name="Radiator Temp"
          isAnimationActive={false}
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
              name="Min Temp"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="maxTemp"
              stroke="#94a3b8"
              strokeWidth={1}
              strokeDasharray="3 3"
              dot={false}
              name="Max Temp"
              isAnimationActive={false}
            />
          </>
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
