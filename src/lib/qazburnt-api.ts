import { hotspots as typedMockHotspots, type Hotspot, type RiskLevel } from "@/data/wildfire";

export type FireDetection = {
  id: string;
  latitude: number;
  longitude: number;
  confidence: number;
  brightness: number | null;
  frp: number | null;
  satellite: string;
  source: string;
  timestamp: string;
  distance_km: number | null;
};

export type WeatherCurrent = {
  latitude: number;
  longitude: number;
  temperature_2m: number;
  relative_humidity_2m: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  precipitation: number;
  observed_at: string;
};

export type WeatherHourlyPoint = {
  time: string;
  temperature_2m: number;
  relative_humidity_2m: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  precipitation: number;
};

export type WeatherResponse = {
  current: WeatherCurrent;
  hourly_24h: WeatherHourlyPoint[];
  mode: "api" | "mock";
};

export type RiskFactor = {
  value: number;
  weight: number;
  contribution: number;
  explanation: string;
};

export type RiskPredictionResponse = {
  probability_percent: number;
  risk_label: RiskLevel;
  explanation: Record<string, RiskFactor>;
  nearest_hotspot_distance_km: number | null;
  hotspot_count: number;
  recommendation: string;
  mode: "api" | "mock";
};

export type ForecastLayer = {
  hours: 6 | 12 | 24;
  polygon: Array<[number, number]>;
  forward_km: number;
  side_km: number;
  rear_km: number;
  area_km2: number;
};

export type ThreatenedSettlement = {
  name: string;
  region: string;
  distance_km: number;
  eta_hours: number;
  population: number;
};

export type SimulationApiRequest = {
  ignition_lat: number;
  ignition_lon: number;
  wind_speed_kmh: number;
  wind_direction_deg: number;
  temperature_c: number;
  relative_humidity_pct: number;
  precipitation_mm: number;
  terrain_type: "steppe" | "forest" | "mountainous" | "urban";
  forecast_hours: 6 | 12 | 24;
};

export type SimulationApiResponse = {
  ignition: [number, number];
  wind_direction_deg: number;
  risk_label: RiskLevel;
  probability_percent: number;
  layers: ForecastLayer[];
  affected_area_km2: number;
  impacted_settlements: ThreatenedSettlement[];
  explanation: Record<string, number | string>;
  mode: "api" | "mock";
};

export type RiskScoreRequest = {
  region: string;
  fire_confidence: number;
  temperature_c: number;
  humidity_pct: number;
  wind_speed_kmh: number;
  dryness_pct?: number;
  terrain_factor: number;
  active_hotspots?: number;
};

export type RiskScoreResponse = {
  region: string;
  score: number;
  risk: RiskLevel;
  label: RiskLevel;
  confidence: number;
  drivers: string[];
  components: RiskFactor[];
  recommendation: string;
};

export type PointIntelligence = {
  fires: FireDetection[];
  weather: WeatherResponse;
  risk: RiskPredictionResponse;
  simulation: SimulationApiResponse | null;
  mode: "api" | "mock";
};

type LiveFiresResponse = {
  data: FireDetection[];
  mode: "api" | "mock";
};

export const dataMode = process.env.NEXT_PUBLIC_QAZBURNT_DATA_MODE ?? "mock";
const apiBaseUrl = process.env.NEXT_PUBLIC_QAZBURNT_API_BASE_URL ?? "http://127.0.0.1:8000";

export function isApiMode() {
  return dataMode === "api";
}

function distanceKm(a: [number, number], b: [number, number]) {
  const radius = 6371;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function destinationPoint([lat, lon]: [number, number], bearing: number, km: number): [number, number] {
  const radius = 6371;
  const angular = km / radius;
  const theta = (bearing * Math.PI) / 180;
  const phi1 = (lat * Math.PI) / 180;
  const lambda1 = (lon * Math.PI) / 180;
  const phi2 = Math.asin(Math.sin(phi1) * Math.cos(angular) + Math.cos(phi1) * Math.sin(angular) * Math.cos(theta));
  const lambda2 =
    lambda1 + Math.atan2(Math.sin(theta) * Math.sin(angular) * Math.cos(phi1), Math.cos(angular) - Math.sin(phi1) * Math.sin(phi2));
  return [(phi2 * 180) / Math.PI, (lambda2 * 180) / Math.PI];
}

function ellipsePolygon(origin: [number, number], direction: number, forward: number, side: number, rear: number): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  for (let index = 0; index <= 72; index += 1) {
    const theta = (Math.PI * 2 * index) / 72;
    const cos = Math.cos(theta);
    const along = cos >= 0 ? forward * cos : rear * cos;
    const cross = side * Math.sin(theta);
    const distance = Math.hypot(along, cross) * (1 + 0.04 * Math.sin(theta * 3));
    const bearing = (direction + (Math.atan2(cross, along) * 180) / Math.PI + 360) % 360;
    points.push(destinationPoint(origin, bearing, distance));
  }
  return points;
}

function hoursAgo(date: string) {
  const detected = new Date(date).getTime();
  if (Number.isNaN(detected)) return 0;
  return Math.max(0, Math.round((Date.now() - detected) / 36e5));
}

function mockPointIntelligence(lat: number, lon: number, radiusKm: number): PointIntelligence {
  const origin: [number, number] = [lat, lon];
  const fires = typedMockHotspots
    .map((item) => {
      const distance = distanceKm(origin, [item.lat, item.lng]);
      return {
        id: item.id,
        latitude: item.lat,
        longitude: item.lng,
        confidence: item.confidence,
        brightness: item.intensity,
        frp: item.intensity,
        satellite: item.source,
        source: "mock",
        timestamp: new Date(Date.now() - item.hoursAgo * 36e5).toISOString(),
        distance_km: Number(distance.toFixed(1)),
      };
    })
    .filter((item) => item.distance_km <= radiusKm)
    .sort((a, b) => (a.distance_km ?? 9999) - (b.distance_km ?? 9999));

  const temperature = Number((26 + Math.max(0, 48 - lat) * 0.8 + Math.max(0, lon - 70) * 0.12).toFixed(1));
  const humidity = Math.max(18, Math.min(58, Math.round(44 - Math.max(0, 48 - lat) * 1.3)));
  const wind = Number((15 + Math.max(0, lon - 68) * 0.22).toFixed(1));
  const windDirection = Math.round((70 + lon * 1.5) % 360);
  const precipitation = humidity > 52 ? 0.2 : 0;
  const observedAt = new Date().toISOString();
  const weather: WeatherResponse = {
    mode: "mock",
    current: {
      latitude: lat,
      longitude: lon,
      temperature_2m: temperature,
      relative_humidity_2m: humidity,
      wind_speed_10m: wind,
      wind_direction_10m: windDirection,
      precipitation,
      observed_at: observedAt,
    },
    hourly_24h: Array.from({ length: 24 }, (_, hour) => ({
      time: new Date(Date.now() + hour * 36e5).toISOString(),
      temperature_2m: Number((temperature + (hour >= 10 && hour <= 17 ? 2.2 : -1.1)).toFixed(1)),
      relative_humidity_2m: Math.max(12, Math.min(90, humidity + (hour < 7 ? 5 : -3))),
      wind_speed_10m: Number((wind + (hour % 5) * 0.6).toFixed(1)),
      wind_direction_10m: (windDirection + hour * 3) % 360,
      precipitation: hour === 18 ? precipitation : 0,
    })),
  };

  const nearest = fires[0]?.distance_km ?? null;
  const hotspotFactor = Math.min(100, fires.reduce((sum, item) => sum + Math.max(0, 1 - (item.distance_km ?? radiusKm) / radiusKm) * item.confidence, 0));
  const dryness = 100 - humidity;
  const probability = Math.round(Math.max(0, Math.min(100, hotspotFactor * 0.35 + temperature * 0.55 + wind * 0.42 + dryness * 0.15 - precipitation * 5)));
  const riskLabel = riskFromConfidence(probability);
  const explanation: Record<string, RiskFactor> = {
    hotspot_factor: { value: hotspotFactor, weight: 0.35, contribution: Number((hotspotFactor * 0.35).toFixed(2)), explanation: "Локальные mock-очаги с учетом расстояния." },
    temperature_factor: { value: temperature, weight: 0.25, contribution: Number((temperature * 0.55).toFixed(2)), explanation: "Температура повышает вероятность горения." },
    wind_factor: { value: wind, weight: 0.2, contribution: Number((wind * 0.42).toFixed(2)), explanation: "Ветер ускоряет фронт." },
    dryness_factor: { value: dryness, weight: 0.15, contribution: Number((dryness * 0.15).toFixed(2)), explanation: "Низкая влажность повышает сухость топлива." },
    rain_penalty: { value: precipitation, weight: 0.05, contribution: -precipitation * 5, explanation: "Осадки снижают риск." },
  };
  const rate = Math.max(0.25, 0.42 * (1 + wind / 38) * (1 + dryness / 115) * (1 + Math.max(0, temperature - 18) / 44));
  const layers = ([6, 12, 24] as const).map((hours) => {
    const forward = rate * hours * (1 + wind / 52);
    const side = rate * hours * 0.72;
    const rear = rate * hours * 0.42;
    return {
      hours,
      polygon: ellipsePolygon(origin, windDirection, forward, side, rear),
      forward_km: Number(forward.toFixed(2)),
      side_km: Number(side.toFixed(2)),
      rear_km: Number(rear.toFixed(2)),
      area_km2: Number((Math.PI * ((forward + rear) / 2) * side).toFixed(2)),
    };
  });

  return {
    fires,
    weather,
    risk: {
      probability_percent: probability,
      risk_label: riskLabel,
      explanation,
      nearest_hotspot_distance_km: nearest,
      hotspot_count: fires.length,
      recommendation: probability >= 82 ? "Нужен оперативный штаб и контроль эвакуационных маршрутов." : "Продолжать мониторинг ветра и спутниковых очагов.",
      mode: "mock",
    },
    simulation: {
      ignition: origin,
      wind_direction_deg: windDirection,
      risk_label: riskLabel,
      probability_percent: probability,
      layers,
      affected_area_km2: layers[2].area_km2,
      impacted_settlements: [],
      explanation: { model: "mock_directional_ellipse", base_spread_rate_kmh: Number(rate.toFixed(2)) },
      mode: "mock",
    },
    mode: "mock",
  };
}

function riskFromConfidence(confidence: number): RiskLevel {
  if (confidence >= 88) return "критический";
  if (confidence >= 76) return "высокий";
  if (confidence >= 60) return "средний";
  return "низкий";
}

function toHotspot(event: FireDetection): Hotspot {
  const detected = new Date(event.timestamp);
  return {
    id: event.id,
    region: "Казахстан",
    district: event.distance_km == null ? "Спутниковая детекция" : `${event.distance_km.toFixed(1)} км от выбранной точки`,
    lat: event.latitude,
    lng: event.longitude,
    confidence: event.confidence,
    risk: riskFromConfidence(event.confidence),
    source: event.satellite.toUpperCase().includes("MODIS") ? "MODIS" : "VIIRS",
    hoursAgo: hoursAgo(event.timestamp),
    detectedAt: Number.isNaN(detected.getTime())
      ? event.timestamp
      : detected.toLocaleString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
    intensity: Math.round(event.frp ?? event.brightness ?? event.confidence),
  };
}

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, { cache: "no-store", ...init });
  if (!response.ok) throw new Error(`QazBurnt API returned ${response.status}`);
  return (await response.json()) as T;
}

export async function getLiveFireDetections(
  lat?: number,
  lon?: number,
  radiusKm = 150,
): Promise<{ data: FireDetection[]; mode: "api" | "mock" }> {
  const mockResponse = {
    data: typedMockHotspots.map((item) => ({
      id: item.id,
      latitude: item.lat,
      longitude: item.lng,
      confidence: item.confidence,
      brightness: item.intensity,
      frp: item.intensity,
      satellite: item.source,
      source: "mock",
      timestamp: new Date(Date.now() - item.hoursAgo * 36e5).toISOString(),
      distance_km: null,
    })),
    mode: "mock" as const,
  };

  if (!isApiMode()) return mockResponse;

  try {
    const params = new URLSearchParams();
    if (lat != null && lon != null) {
      params.set("lat", String(lat));
      params.set("lon", String(lon));
      params.set("radius_km", String(radiusKm));
    }
    const suffix = params.size > 0 ? `?${params.toString()}` : "";
    const payload = await getJson<LiveFiresResponse>(`/fires/live${suffix}`);
    return { data: payload.data, mode: payload.mode };
  } catch {
    return mockResponse;
  }
}

export async function getLiveHotspots(): Promise<{ data: Hotspot[]; mode: "api" | "mock" }> {
  if (!isApiMode()) {
    return { data: typedMockHotspots, mode: "mock" };
  }

  try {
    const payload = await getLiveFireDetections();
    return { data: payload.data.map(toHotspot), mode: payload.mode };
  } catch {
    return { data: typedMockHotspots, mode: "mock" };
  }
}

export async function getWeatherCurrent(lat: number, lon: number): Promise<WeatherResponse | null> {
  if (!isApiMode()) return null;
  try {
    return await getJson<WeatherResponse>(`/weather/current?lat=${lat}&lon=${lon}`);
  } catch {
    return null;
  }
}

export async function predictRisk(lat: number, lon: number, radiusKm = 150): Promise<RiskPredictionResponse | null> {
  if (!isApiMode()) return null;
  try {
    return await getJson<RiskPredictionResponse>(`/risk/predict?lat=${lat}&lon=${lon}&radius_km=${radiusKm}`);
  } catch {
    return null;
  }
}

export async function runApiSimulation(payload: SimulationApiRequest): Promise<SimulationApiResponse | null> {
  if (!isApiMode()) return null;

  try {
    return await getJson<SimulationApiResponse>("/simulation/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    return null;
  }
}

export async function getPointIntelligence(lat: number, lon: number, radiusKm = 150): Promise<PointIntelligence | null> {
  if (!isApiMode()) return mockPointIntelligence(lat, lon, radiusKm);

  try {
    const [fires, weather, risk] = await Promise.all([
      getLiveFireDetections(lat, lon, radiusKm),
      getWeatherCurrent(lat, lon),
      predictRisk(lat, lon, radiusKm),
    ]);
    if (!weather || !risk) return mockPointIntelligence(lat, lon, radiusKm);
    const simulation = await runApiSimulation({
      ignition_lat: lat,
      ignition_lon: lon,
      wind_speed_kmh: weather.current.wind_speed_10m,
      wind_direction_deg: weather.current.wind_direction_10m,
      temperature_c: weather.current.temperature_2m,
      relative_humidity_pct: weather.current.relative_humidity_2m,
      precipitation_mm: weather.current.precipitation,
      terrain_type: "steppe",
      forecast_hours: 24,
    });
    const mode = fires.mode === "api" && weather.mode === "api" && risk.mode === "api" && simulation?.mode === "api" ? "api" : "mock";
    return { fires: fires.data, weather, risk, simulation, mode };
  } catch {
    return mockPointIntelligence(lat, lon, radiusKm);
  }
}

export function calculateLocalRiskScore(payload: RiskScoreRequest): RiskScoreResponse {
  const dryness = payload.dryness_pct ?? Math.max(0, Math.min(100, 100 - payload.humidity_pct));
  const normalize = (value: number, lower: number, upper: number) =>
    Math.max(0, Math.min(100, ((value - lower) / (upper - lower)) * 100));
  const components = [
    {
      value: payload.fire_confidence,
      weight: 0.28,
      explanation: "Уверенность спутниковой термоточки.",
      contribution: payload.fire_confidence * 0.28,
    },
    {
      value: payload.temperature_c,
      weight: 0.22,
      explanation: "Температура поддерживает активное горение.",
      contribution: normalize(payload.temperature_c, 8, 42) * 0.22,
    },
    {
      value: payload.wind_speed_kmh,
      weight: 0.2,
      explanation: "Ветер ускоряет фронт огня.",
      contribution: normalize(payload.wind_speed_kmh, 0, 55) * 0.2,
    },
    {
      value: dryness,
      weight: 0.2,
      explanation: "Сухость топлива повышает интенсивность.",
      contribution: dryness * 0.2,
    },
    {
      value: payload.terrain_factor,
      weight: 0.1,
      explanation: "Рельеф и лесистость усложняют реагирование.",
      contribution: normalize(payload.terrain_factor, 0.5, 1.7) * 0.1,
    },
  ];
  const hotspotBonus = Math.min(payload.active_hotspots ?? 0, 8) * 1.4;
  const score = Math.round(Math.min(100, components.reduce((sum, item) => sum + item.contribution, 0) + hotspotBonus));
  const risk: RiskLevel = score >= 82 ? "критический" : score >= 60 ? "высокий" : score >= 35 ? "средний" : "низкий";
  return {
    region: payload.region,
    score,
    risk,
    label: risk,
    confidence: Math.min(96, 58 + Math.round(payload.fire_confidence * 0.18) + (payload.active_hotspots ?? 0) * 3),
    drivers: components
      .filter((item) => item.contribution >= 10)
      .map((item) => item.explanation),
    components: components.map((item) => ({ ...item, contribution: Number(item.contribution.toFixed(2)) })),
    recommendation: risk === "критический" ? "Развернуть оперативный штаб." : "Продолжать мониторинг и уточнять прогноз.",
  };
}

export async function scoreRisk(payload: RiskScoreRequest): Promise<{ data: RiskScoreResponse; mode: "api" | "mock" }> {
  if (!isApiMode()) {
    return { data: calculateLocalRiskScore(payload), mode: "mock" };
  }

  try {
    const response = await getJson<RiskScoreResponse>("/risk/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return { data: response, mode: "api" };
  } catch {
    return { data: calculateLocalRiskScore(payload), mode: "mock" };
  }
}
