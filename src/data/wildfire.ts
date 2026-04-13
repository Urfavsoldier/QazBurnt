import type { FeatureCollection, Polygon as GeoPolygon } from "geojson";
import analyticsData from "./analytics.json";
import oblastsData from "./kazakhstan-oblasts.json";
import hotspotsData from "./map-hotspots.json";
import regionsData from "./regions.json";
import settlementsData from "./settlements.json";

export type RiskLevel = "низкий" | "средний" | "высокий" | "критический";

export type Region = {
  id: string;
  name: string;
  center: [number, number];
  risk: RiskLevel;
  humidity: number;
  wind: number;
  temperature: number;
};

export type Hotspot = {
  id: string;
  region: string;
  district: string;
  lat: number;
  lng: number;
  confidence: number;
  risk: RiskLevel;
  source: "MODIS" | "VIIRS";
  hoursAgo: number;
  detectedAt: string;
  intensity: number;
};

export type Settlement = {
  name: string;
  region: string;
  lat: number;
  lng: number;
  population: number;
};

export type AnalyticsKpi = {
  label: string;
  value: string;
  delta: string;
  icon: "flame" | "shield" | "users" | "radio";
};

export type TrendPoint = {
  day: string;
  fires: number;
  confirmed?: number;
  forecast?: number;
  confidence?: number;
};

export type ForecastPoint = {
  hour: string;
  risk: number;
  wind: number;
};

export type SeveritySlice = {
  name: string;
  value: number;
  color: string;
};

export type DangerousRegion = {
  region: string;
  score: number;
  fires: number;
  wind: number;
  reason: string;
};

export const regions = regionsData as Region[];
export const hotspots = hotspotsData as Hotspot[];
export const settlements = settlementsData as Settlement[];

export const kazakhstanGeoJson = oblastsData as FeatureCollection<
  GeoPolygon,
  { name: string; risk: RiskLevel }
>;

export const analytics = analyticsData as {
  kpis: AnalyticsKpi[];
  trendData: TrendPoint[];
  forecast24: ForecastPoint[];
  severityPie: SeveritySlice[];
  dangerousRegions: DangerousRegion[];
};

export const riskRank = regions
  .map((region) => ({
    ...region,
    score:
      region.temperature * 1.3 +
      region.wind * 1.6 +
      (45 - region.humidity) * 1.4,
  }))
  .sort((a, b) => b.score - a.score);

export const riskColor: Record<RiskLevel, string> = {
  низкий: "#8fbf7f",
  средний: "#f6c85f",
  высокий: "#ff8a1d",
  критический: "#ff3d00",
};
