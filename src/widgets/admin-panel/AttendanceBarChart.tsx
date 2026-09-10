"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export interface AttendanceBarChartProps {
  data: { groupId: string; label: string; attendance: number }[];
}

export function AttendanceBarChart({ data }: AttendanceBarChartProps) {
  const options: ApexOptions = {
    chart: { type: "bar", fontFamily: "var(--font-outfit)", toolbar: { show: false } },
    colors: ["#465fff"],
    plotOptions: { bar: { borderRadius: 5, columnWidth: "45%" } },
    dataLabels: { enabled: false },
    legend: { show: false },
    xaxis: {
      categories: data.map((point) => point.label),
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    // min pinned alongside max: a flat series (every bar equal) makes ApexCharts
    // pick its own range and overshoot past 100%, which attendance never does.
    yaxis: { min: 0, max: 100, labels: { formatter: (value) => `${Math.round(value)}%` } },
    grid: { borderColor: "#f2f4f7", yaxis: { lines: { show: true } } },
    tooltip: { y: { formatter: (value) => `${Math.round(value)}%` } },
  };

  const series = [{ name: "Frequência", data: data.map((point) => Math.round(point.attendance)) }];

  return <ReactApexChart options={options} series={series} type="bar" height={230} />;
}
