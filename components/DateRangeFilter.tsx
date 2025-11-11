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
  const [isOpen, setIsOpen] = React.useState(false);

  const presets = [
    { label: 'All Data', days: null },
    { label: 'Last 1 Day', days: 1 },
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
    setIsOpen(false);
  };

  const handleCalendarSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from && range?.to) {
      onDateRangeChange({
        from: startOfDay(range.from),
        to: endOfDay(range.to),
      });
      setIsOpen(false);
    }
  };

  const formatDateRange = () => {
    if (!dateRange.from || !dateRange.to) return 'Select date range';

    const from = format(dateRange.from, 'MMM dd, yyyy');
    const to = format(dateRange.to, 'MMM dd, yyyy');

    if (from === to) return from;
    return `${from} - ${to}`;
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

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'justify-start text-left font-normal min-w-[280px]',
              !dateRange && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            defaultMonth={dateRange.from}
            selected={{ from: dateRange.from, to: dateRange.to }}
            onSelect={handleCalendarSelect}
            numberOfMonths={2}
            disabled={(date) =>
              date < startOfDay(availableRange.start) || date > endOfDay(availableRange.end)
            }
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
