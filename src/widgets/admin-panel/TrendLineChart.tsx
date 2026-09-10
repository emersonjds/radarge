"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { formatDate } from "@/shared/lib/format";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export interface TrendLineChartProps {
  points: { date: string; attendance: number }[];
}

export function TrendLineChart({ points }: TrendLineChartProps) {
  const options: ApexOptions = {
    chart: { type: "area", fontFamily: "var(--font-outfit)", toolbar: { show: false } },
    colors: ["#465fff"],
    stroke: { curve: "smooth", width: 2 },
    fill: { type: "gradient", gradient: { opacityFrom: 0.35, opacityTo: 0 } },
    dataLabels: { enabled: false },
    legend: { show: false },
    xaxis: {
      categories: points.map((point) => formatDate(point.date)),
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    // min pinned alongside max: a flat series (every point equal) makes ApexCharts
    // pick its own range and overshoot past 100%, which attendance never does.
    yaxis: { min: 0, max: 100, labels: { formatter: (value) => `${Math.round(value)}%` } },
    grid: { borderColor: "#f2f4f7" },
    tooltip: { y: { formatter: (value) => `${Math.round(value)}%` } },
  };

  const series = [
    { name: "Frequência", data: points.map((point) => Math.round(point.attendance)) },
  ];

  return <ReactApexChart options={options} series={series} type="area" height={230} />;
}
