"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/date";
import type { SupportedLanguage } from "@/types/db";

interface MessagesChartProps {
  data: { date: string; inbound: number; outbound: number }[];
}

export function MessagesChart({ data }: MessagesChartProps) {
  const t = useTranslations("dashboardHome.charts");
  const locale = useLocale() as SupportedLanguage;

  return (
    <Card className="glass-card gap-3 overflow-hidden rounded-3xl p-5 shadow-sm">
      <CardHeader className="p-0">
        <CardTitle className="text-base">{t("messagesTrend")}</CardTitle>
      </CardHeader>
      <CardContent className="h-64 p-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2}>
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
              width={32}
              allowDecimals={false}
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
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}
            />
            <Bar
              dataKey="inbound"
              name={t("inbound")}
              fill="var(--emerald)"
              radius={[4, 4, 0, 0]}
              maxBarSize={18}
              isAnimationActive
            />
            <Bar
              dataKey="outbound"
              name={t("outbound")}
              fill="var(--primary)"
              radius={[4, 4, 0, 0]}
              maxBarSize={18}
              isAnimationActive
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
