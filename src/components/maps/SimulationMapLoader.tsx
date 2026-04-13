"use client";

import dynamic from "next/dynamic";

const SimulationMap = dynamic(() => import("./SimulationMap").then((module) => module.SimulationMap), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-[#080909] pt-20" />,
});

export function SimulationMapLoader() {
  return <SimulationMap />;
}
