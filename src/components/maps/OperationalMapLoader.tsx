"use client";

import dynamic from "next/dynamic";

const OperationalMap = dynamic(() => import("./OperationalMap").then((module) => module.OperationalMap), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-[#070808] pt-20" />,
});

export function OperationalMapLoader() {
  return <OperationalMap />;
}
