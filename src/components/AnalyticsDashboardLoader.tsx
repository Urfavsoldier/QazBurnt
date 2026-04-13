"use client";

import dynamic from "next/dynamic";

const AnalyticsDashboard = dynamic(() => import("./AnalyticsDashboard").then((module) => module.AnalyticsDashboard), {
  ssr: false,
  loading: () => <div className="cinematic-bg min-h-screen pt-28" />,
});

export function AnalyticsDashboardLoader() {
  return <AnalyticsDashboard />;
}
