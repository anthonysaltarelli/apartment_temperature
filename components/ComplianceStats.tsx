'use client';

import { ComplianceStats } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ComplianceStatsProps {
  stats: ComplianceStats;
}

export function ComplianceStatsComponent({ stats }: ComplianceStatsProps) {
  const formatNumber = (num: number, decimals: number = 0): string => {
    return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const isCompliant = stats.complianceRate >= 95; // Consider 95%+ as compliant

  const totalHours = stats.totalReadings / 60;
  const compliantHours = stats.compliantReadings / 60;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Compliance Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">
              {formatNumber(stats.complianceRate, 1)}%
            </div>
            <Badge variant={isCompliant ? 'default' : 'destructive'} className="text-xs">
              {isCompliant ? 'Compliant' : 'Non-Compliant'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {formatNumber(compliantHours, 1)} of {formatNumber(totalHours, 1)} hours
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Violations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-red-600">
            {formatNumber(stats.totalViolationHours, 1)}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            hours of non-compliance
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Daytime Violations
          </CardTitle>
          <CardDescription className="text-xs">6am - 10pm (must be ≥68°F)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-orange-600">
            {formatNumber(stats.dayTimeViolations / 60, 1)}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            hours of non-compliance
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Nighttime Violations
          </CardTitle>
          <CardDescription className="text-xs">10pm - 6am (must be ≥62°F)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-orange-600">
            {formatNumber(stats.nightTimeViolations / 60, 1)}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            hours of non-compliance
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
