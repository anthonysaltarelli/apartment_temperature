'use client';

import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangeFilterProps {
  dateRange: DateRange;
  availableRange: { start: Date; end: Date };
  onDateRangeChange: (range: DateRange) => void;
}

export function DateRangeFilter({
  dateRange,
  availableRange,
  onDateRangeChange,
}: DateRangeFilterProps) {
  const [isFromOpen, setIsFromOpen] = React.useState(false);
  const [isToOpen, setIsToOpen] = React.useState(false);

  const presets = [
    { label: 'All Data', days: null },
    { label: 'Last 1 Day', days: 1 },
    { label: 'Last 3 Days', days: 3 },
    { label: 'Last 7 Days', days: 7 },
    { label: 'Last 14 Days', days: 14 },
    { label: 'Last 30 Days', days: 30 },
  ];

  const handlePresetChange = (value: string) => {
    if (value === 'all') {
      onDateRangeChange({
        from: startOfDay(availableRange.start),
        to: endOfDay(availableRange.end),
      });
    } else {
      const days = parseInt(value);
      const end = endOfDay(availableRange.end);
      const start = startOfDay(subDays(end, days - 1));
      onDateRangeChange({
        from: start > availableRange.start ? start : startOfDay(availableRange.start),
        to: end,
      });
    }
  };

  const handleFromDateSelect = (date: Date | undefined) => {
    if (date) {
      const newFrom = startOfDay(date);
      // Ensure 'to' is not before 'from'
      const newTo = dateRange.to < newFrom ? endOfDay(date) : dateRange.to;
      onDateRangeChange({
        from: newFrom,
        to: newTo,
      });
      setIsFromOpen(false);
    }
  };

  const handleToDateSelect = (date: Date | undefined) => {
    if (date) {
      const newTo = endOfDay(date);
      // Ensure 'from' is not after 'to'
      const newFrom = dateRange.from > newTo ? startOfDay(date) : dateRange.from;
      onDateRangeChange({
        from: newFrom,
        to: newTo,
      });
      setIsToOpen(false);
    }
  };

  return (
    <div className="flex gap-2 items-center flex-wrap">
      <Select onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Quick Select" />
        </SelectTrigger>
        <SelectContent>
          {presets.map((preset) => (
            <SelectItem
              key={preset.label}
              value={preset.days === null ? 'all' : preset.days.toString()}
            >
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">From:</span>
        <Popover open={isFromOpen} onOpenChange={setIsFromOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'justify-start text-left font-normal w-[160px]',
                !dateRange && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from ? format(dateRange.from, 'MMM dd, yyyy') : 'Select date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateRange.from}
              onSelect={handleFromDateSelect}
              defaultMonth={dateRange.from}
              disabled={(date) =>
                date < startOfDay(availableRange.start) ||
                date > endOfDay(availableRange.end) ||
                date > dateRange.to
              }
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">To:</span>
        <Popover open={isToOpen} onOpenChange={setIsToOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'justify-start text-left font-normal w-[160px]',
                !dateRange && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.to ? format(dateRange.to, 'MMM dd, yyyy') : 'Select date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateRange.to}
              onSelect={handleToDateSelect}
              defaultMonth={dateRange.to}
              disabled={(date) =>
                date < startOfDay(availableRange.start) ||
                date > endOfDay(availableRange.end) ||
                date < dateRange.from
              }
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
