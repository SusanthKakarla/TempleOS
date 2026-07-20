"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatInr } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import type { SupportedLanguage } from "@/types/db";

interface DonationsChartProps {
  data: { date: string; total: number }[];
}

export function DonationsChart({ data }: DonationsChartProps) {
  const t = useTranslations("dashboardHome.charts");
  const locale = useLocale() as SupportedLanguage;

  return (
    <Card className="glass-card gap-3 overflow-hidden rounded-3xl p-5 shadow-sm">
      <CardHeader className="p-0">
        <CardTitle className="text-base">{t("donationsTrend")}</CardTitle>
      </CardHeader>
      <CardContent className="h-64 p-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="donationsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(value: string) => formatDate(value, locale, "d MMM")}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={56}
              tickFormatter={(value: number) => formatInr(value)}
            />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid color-mix(in oklch, var(--foreground) 10%, transparent)",
                borderRadius: "0.75rem",
                fontSize: "0.8rem",
              }}
              labelStyle={{ color: "var(--foreground)", fontWeight: 500 }}
              labelFormatter={(value) => (value ? formatDate(String(value), locale) : "")}
              formatter={(value) => [formatInr(Number(value ?? 0)), t("donationsTrend")]}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="var(--primary)"
              strokeWidth={2}
              fill="url(#donationsFill)"
              activeDot={{ r: 4 }}
              isAnimationActive
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
