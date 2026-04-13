"use client";

import L from "leaflet";
import { motion } from "framer-motion";
import { Activity, AlertTriangle, CloudRain, Clock, Filter, Flame, Navigation, RadioTower, ShieldAlert, ThermometerSun, Wind } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, Marker, Polygon, TileLayer, Tooltip, useMapEvents } from "react-leaflet";
import { hotspots, kazakhstanGeoJson, regions, riskColor, settlements, type Hotspot, type RiskLevel } from "@/data/wildfire";
import { GlassPanel, MetricCard } from "@/components/ui";
import { getLiveHotspots, getPointIntelligence, scoreRisk, type PointIntelligence, type RiskScoreResponse } from "@/lib/qazburnt-api";

const riskOptions: Array<RiskLevel | "all"> = ["all", "низкий", "средний", "высокий", "критический"];
const oblastBorders = kazakhstanGeoJson;

const riskLabel: Record<RiskLevel | "all", string> = {
  all: "Все точки",
  низкий: "Низкий",
  средний: "Средний",
  высокий: "Высокий",
  критический: "Критический",
};

const terrainFactorByRegion: Record<string, number> = {
  "Абайская область": 1.35,
  "Восточно-Казахстанская область": 1.45,
  "Акмолинская область": 1.05,
  "Павлодарская область": 1.18,
  "Костанайская область": 1.12,
  "Алматинская область": 1.28,
  "Туркестанская область": 1.1,
};

type LatLng = [number, number];

function MapClick({ onSelect }: { onSelect: (point: LatLng) => void }) {
  useMapEvents({
    click(event) {
      onSelect([event.latlng.lat, event.latlng.lng]);
    },
  });
  return null;
}

function RiskCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <motion.div
      layout
      className="rounded-[8px] border border-white/10 bg-black/42 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-black uppercase tracking-[0.18em] text-white/46">{label}</span>
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 18px ${color}` }} />
      </div>
      <p className="mt-3 text-3xl font-black text-white">{count}</p>
    </motion.div>
  );
}

function HoverCard({
  hotspot,
  riskScore,
  riskMode,
}: {
  hotspot: Hotspot | null;
  riskScore: RiskScoreResponse | null;
  riskMode: "api" | "mock";
}) {
  if (!hotspot) {
    return (
      <GlassPanel className="pointer-events-none p-5">
        <div className="flex items-center gap-3">
          <Flame className="text-[#ff7a00]" />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/42">наведение</p>
            <p className="text-lg font-black">Выберите очаг на карте</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-white/58">
          Наведите курсор на оранжевую точку, чтобы увидеть область, район, уверенность, источник и время фиксации.
        </p>
      </GlassPanel>
    );
  }

  return (
    <motion.div
      key={hotspot.id}
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28 }}
    >
      <GlassPanel className="pointer-events-none overflow-hidden p-5">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ff8d22]">{hotspot.source}</p>
            <h2 className="mt-2 text-2xl font-black leading-tight">{hotspot.region}</h2>
            <p className="mt-1 text-sm font-semibold text-white/58">{hotspot.district}</p>
          </div>
          <span className="rounded-[8px] border border-[#ff7a00]/30 bg-[#ff7a00]/12 px-3 py-2 text-sm font-black text-[#ffb15f]">
            {riskLabel[hotspot.risk]}
          </span>
        </div>
        {riskScore ? (
          <div className="mt-5 rounded-[8px] border border-[#ff7a00]/24 bg-[#ff7a00]/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ffb15f]">
                риск-скоринг {riskMode === "api" ? "API" : "local"}
              </p>
              <span className="text-3xl font-black text-[#ff7a00]">{riskScore.score}</span>
            </div>
            <p className="mt-2 text-sm font-black text-white">Класс: {riskLabel[riskScore.label]}</p>
            <p className="mt-2 text-xs leading-5 text-white/58">
              {riskScore.drivers.slice(0, 2).join(". ")}
            </p>
          </div>
        ) : null}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-[8px] border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs text-white/44">Уверенность</p>
            <p className="mt-1 text-xl font-black">{hotspot.confidence}%</p>
          </div>
          <div className="rounded-[8px] border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs text-white/44">Интенсивность</p>
            <p className="mt-1 text-xl font-black">{hotspot.intensity}</p>
          </div>
          <div className="rounded-[8px] border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs text-white/44">Давность</p>
            <p className="mt-1 text-xl font-black">{hotspot.hoursAgo} ч</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-white/62">
          Последняя фиксация: <span className="font-bold text-white">{hotspot.detectedAt}</span>. Рекомендован
          повторный спутниковый контроль и проверка ветрового коридора.
        </p>
      </GlassPanel>
    </motion.div>
  );
}

function PointPanel({
  point,
  insight,
  loading,
}: {
  point: LatLng | null;
  insight: PointIntelligence | null;
  loading: boolean;
}) {
  if (!point) {
    return (
      <GlassPanel className="pointer-events-auto p-5">
        <div className="flex items-start gap-4">
          <Navigation className="mt-1 text-[#ff8d22]" />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/45">анализ точки</p>
            <h2 className="mt-2 text-2xl font-black">Кликните по карте Казахстана</h2>
            <p className="mt-3 text-sm leading-6 text-white/62">
              QazBurnt рассчитает риск, подтянет ближайшие термоточки, погоду и построит прогноз распространения на 6, 12 и 24 часа.
            </p>
          </div>
        </div>
      </GlassPanel>
    );
  }

  const weather = insight?.weather.current;
  const forecastLayers = insight?.simulation?.layers ?? [];

  return (
    <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35 }}>
      <GlassPanel className="pointer-events-auto overflow-hidden p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ff8d22]">живая оценка</p>
            <h2 className="mt-2 text-2xl font-black">Выбранная точка</h2>
            <p className="mt-1 text-sm font-bold text-white/52">
              {point[0].toFixed(4)}, {point[1].toFixed(4)}
            </p>
          </div>
          <span className="rounded-[8px] border border-[#ff7a00]/30 bg-[#ff7a00]/12 px-3 py-2 text-sm font-black text-[#ffb15f]">
            {loading ? "Расчет" : insight ? riskLabel[insight.risk.risk_label] : "Mock"}
          </span>
        </div>

        {loading ? (
          <div className="mt-5 rounded-[8px] border border-white/10 bg-white/[0.04] p-4 text-sm font-bold text-white/62">
            Получаем FIRMS, Open-Meteo и запускаем модель распространения...
          </div>
        ) : insight ? (
          <>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[8px] border border-[#ff7a00]/25 bg-[#ff7a00]/10 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ffb15f]">Вероятность пожара</p>
                <p className="mt-2 text-4xl font-black text-[#ff7a00]">{insight.risk.probability_percent}%</p>
              </div>
              <div className="rounded-[8px] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-white/42">Ближайший очаг</p>
                <p className="mt-2 text-3xl font-black">
                  {insight.risk.nearest_hotspot_distance_km == null ? "нет" : `${insight.risk.nearest_hotspot_distance_km} км`}
                </p>
              </div>
            </div>

            {weather ? (
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <span className="rounded-[8px] border border-white/10 bg-white/[0.04] p-3">
                  <ThermometerSun className="mb-2 text-[#ffb15f]" size={18} />
                  Температура: <b>{weather.temperature_2m}°C</b>
                </span>
                <span className="rounded-[8px] border border-white/10 bg-white/[0.04] p-3">
                  <Wind className="mb-2 text-[#ffb15f]" size={18} />
                  Ветер: <b>{weather.wind_speed_10m} км/ч</b>
                </span>
                <span className="rounded-[8px] border border-white/10 bg-white/[0.04] p-3">
                  <CloudRain className="mb-2 text-[#ffb15f]" size={18} />
                  Осадки: <b>{weather.precipitation} мм</b>
                </span>
                <span className="rounded-[8px] border border-white/10 bg-white/[0.04] p-3">
                  <Activity className="mb-2 text-[#ffb15f]" size={18} />
                  Влажность: <b>{weather.relative_humidity_2m}%</b>
                </span>
              </div>
            ) : null}

            <div className="mt-4 grid grid-cols-3 gap-3">
              {forecastLayers.map((layer) => (
                <div key={layer.hours} className="rounded-[8px] border border-white/10 bg-black/42 p-3">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-white/42">{layer.hours} часов</p>
                  <p className="mt-2 text-xl font-black text-white">{layer.area_km2.toFixed(1)} км²</p>
                  <p className="mt-1 text-xs text-white/48">фронт {layer.forward_km.toFixed(1)} км</p>
                </div>
              ))}
            </div>

            <p className="mt-4 text-sm leading-6 text-white/62">{insight.risk.recommendation}</p>
            <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-[#ffb15f]">
              Источник: {insight.mode === "api" ? "NASA FIRMS + Open-Meteo" : "mock fallback"}
            </p>
          </>
        ) : (
          <p className="mt-4 text-sm leading-6 text-white/62">
            API недоступен, поэтому карта остается в локальном режиме. В mock режиме основной мониторинг продолжает работать.
          </p>
        )}
      </GlassPanel>
    </motion.div>
  );
}

export function OperationalMap() {
  const [region, setRegion] = useState("Все");
  const [risk, setRisk] = useState<RiskLevel | "all">("all");
  const [time, setTime] = useState(72);
  const [hoveredHotspot, setHoveredHotspot] = useState<Hotspot | null>(null);
  const [liveHotspots, setLiveHotspots] = useState<Hotspot[]>(hotspots);
  const [dataSource, setDataSource] = useState<"api" | "mock">("mock");
  const [hoverRiskScore, setHoverRiskScore] = useState<RiskScoreResponse | null>(null);
  const [riskScoreMode, setRiskScoreMode] = useState<"api" | "mock">("mock");
  const [selectedPoint, setSelectedPoint] = useState<LatLng | null>(null);
  const [pointInsight, setPointInsight] = useState<PointIntelligence | null>(null);
  const [pointLoading, setPointLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getLiveHotspots().then((result) => {
      if (!cancelled) {
        setLiveHotspots(result.data);
        setDataSource(result.mode);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!hoveredHotspot) {
      return;
    }
    const regionProfile = regions.find((item) => item.name === hoveredHotspot.region);
    const humidity = regionProfile?.humidity ?? 32;
    scoreRisk({
      region: hoveredHotspot.region,
      fire_confidence: hoveredHotspot.confidence,
      temperature_c: regionProfile?.temperature ?? 30,
      humidity_pct: humidity,
      wind_speed_kmh: regionProfile?.wind ?? 18,
      dryness_pct: Math.max(0, 100 - humidity),
      terrain_factor: terrainFactorByRegion[hoveredHotspot.region] ?? 1,
      active_hotspots: liveHotspots.filter((hotspot) => hotspot.region === hoveredHotspot.region).length,
    }).then((result) => {
      if (!cancelled) {
        setHoverRiskScore(result.data);
        setRiskScoreMode(result.mode);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [hoveredHotspot, liveHotspots]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedPoint) {
      return;
    }
    getPointIntelligence(selectedPoint[0], selectedPoint[1], 150).then((result) => {
      if (!cancelled) {
        setPointInsight(result);
        setPointLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedPoint]);

  const filteredHotspots = useMemo(
    () =>
      liveHotspots.filter((hotspot) => {
        const matchesRegion = region === "Все" || hotspot.region === region;
        const matchesRisk = risk === "all" || hotspot.risk === risk;
        const matchesTime = hotspot.hoursAgo <= time;
        return matchesRegion && matchesRisk && matchesTime;
      }),
    [liveHotspots, region, risk, time],
  );

  const averageConfidence =
    filteredHotspots.length === 0
      ? 0
      : Math.round(filteredHotspots.reduce((sum, hotspot) => sum + hotspot.confidence, 0) / filteredHotspots.length);

  const threatened = settlements.filter((settlement) =>
    filteredHotspots.some((hotspot) => hotspot.region === settlement.region && hotspot.risk !== "низкий"),
  );

  const riskCounts = useMemo(
    () =>
      riskOptions
        .filter((item): item is RiskLevel => item !== "all")
        .map((item) => ({
          risk: item,
          count: filteredHotspots.filter((hotspot) => hotspot.risk === item).length,
          color: riskColor[item],
        })),
    [filteredHotspots],
  );

  const fireIcon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: '<div class="fire-pulse"></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
    [],
  );

  const handlePointSelect = (point: LatLng) => {
    setSelectedPoint(point);
    setPointInsight(null);
    setPointLoading(true);
  };

  const pointIcon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: '<div class="simulation-ignition"><div class="fire-pulse"></div><span></span><span></span><span></span></div>',
        iconSize: [70, 70],
        iconAnchor: [35, 35],
      }),
    [],
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070808] pt-20">
      <MapContainer center={[48.2, 67.4]} zoom={5} minZoom={4} maxZoom={8} className="absolute inset-0 z-0 h-full w-full">
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        <GeoJSON
          data={oblastBorders}
          style={(feature) => {
            const featureRisk = (feature?.properties?.risk ?? "средний") as RiskLevel;
            return {
              color: "rgba(255,255,255,0.6)",
              weight: 1.45,
              fillColor: riskColor[featureRisk],
              fillOpacity: featureRisk === "критический" ? 0.18 : 0.085,
            };
          }}
          onEachFeature={(feature, layer) => {
            layer.bindTooltip(feature.properties.name, {
              direction: "center",
              className: "qaz-oblast-tooltip",
              opacity: 0.8,
            });
          }}
        />
        <MapClick onSelect={handlePointSelect} />
        {pointInsight?.simulation?.layers.map((layer) => (
          <Polygon
            key={layer.hours}
            positions={layer.polygon}
            pathOptions={{
              color: layer.hours === 24 ? "#ff3d00" : layer.hours === 12 ? "#ff7a00" : "#ffb15f",
              fillColor: layer.hours === 24 ? "#ff3d00" : "#ff7a00",
              fillOpacity: layer.hours === 24 ? 0.12 : layer.hours === 12 ? 0.16 : 0.2,
              opacity: 0.8,
              weight: layer.hours === 24 ? 1 : 2,
              dashArray: layer.hours === 24 ? "8 10" : undefined,
            }}
          />
        ))}
        {selectedPoint ? (
          <Marker position={selectedPoint} icon={pointIcon}>
            <Tooltip direction="top" offset={[0, -20]} opacity={1} className="qaz-fire-tooltip">
              Точка анализа риска
            </Tooltip>
          </Marker>
        ) : null}
        {filteredHotspots.map((hotspot) => (
          <Marker
            key={hotspot.id}
            position={[hotspot.lat, hotspot.lng]}
            icon={fireIcon}
            eventHandlers={{
              mouseover: () => setHoveredHotspot(hotspot),
              mouseout: () => setHoveredHotspot(null),
            }}
          >
            <Tooltip direction="top" offset={[0, -18]} opacity={1} className="qaz-fire-tooltip">
              <div className="min-w-56">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ff8d22]">{hotspot.source}</p>
                <h3 className="mt-1 text-base font-black">{hotspot.region}</h3>
                <p className="mt-1 text-sm text-white/70">{hotspot.district}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <span className="text-white/50">Уверенность</span>
                  <span className="text-right font-bold">{hotspot.confidence}%</span>
                  <span className="text-white/50">Риск</span>
                  <span className="text-right font-bold text-[#ffb15f]">{riskLabel[hotspot.risk]}</span>
                </div>
              </div>
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>

      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_62%_30%,transparent_0,rgba(0,0,0,0.2)_38%,rgba(0,0,0,0.78)_100%)]" />

      <section className="relative z-20 grid min-h-[calc(100vh-5rem)] grid-cols-1 gap-5 p-4 sm:p-6 lg:grid-cols-[380px_1fr] lg:p-8">
        <motion.aside
          initial={{ opacity: 0, x: -22 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-auto self-start"
        >
          <GlassPanel className="overflow-hidden">
            <div className="border-b border-white/10 p-5">
              <div className="flex items-center gap-3">
                <Filter className="text-[#ff8d22]" />
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-white/42">оперативный слой</p>
                  <h1 className="text-2xl font-black">Мониторинг пожаров</h1>
                </div>
              </div>
            </div>

            <div className="grid gap-5 p-5">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-white/72">Время с момента обнаружения</span>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={6}
                    max={72}
                    step={6}
                    value={time}
                    onChange={(event) => setTime(Number(event.target.value))}
                    className="w-full"
                  />
                  <span className="w-16 text-right text-lg font-black">{time} ч</span>
                </div>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-white/72">Выберите область</span>
                <select
                  value={region}
                  onChange={(event) => setRegion(event.target.value)}
                  className="rounded-[8px] border border-white/12 bg-black/45 px-4 py-3 text-white outline-none transition focus:border-[#ff7a00]"
                >
                  <option>Все</option>
                  {regions.map((item) => (
                    <option key={item.id}>{item.name}</option>
                  ))}
                  <option>Павлодарская область</option>
                  <option>Восточно-Казахстанская область</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-white/72">VIIRS вероятность</span>
                <select
                  value={risk}
                  onChange={(event) => setRisk(event.target.value as RiskLevel | "all")}
                  className="rounded-[8px] border border-white/12 bg-black/45 px-4 py-3 text-white outline-none transition focus:border-[#ff7a00]"
                >
                  {riskOptions.map((option) => (
                    <option key={option} value={option}>
                      {riskLabel[option]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </GlassPanel>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <MetricCard label="активные очаги" value={filteredHotspots.length} />
            <MetricCard label="средняя точность" value={averageConfidence} suffix="%" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {riskCounts.map((item) => (
              <RiskCard key={item.risk} label={riskLabel[item.risk]} count={item.count} color={item.color} />
            ))}
          </div>
        </motion.aside>

        <div className="pointer-events-none flex flex-col justify-between gap-5">
          <motion.div
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="grid gap-4 md:grid-cols-4"
          >
            <MetricCard label="активные пожары" value={filteredHotspots.length} />
            <MetricCard label="критические" value={filteredHotspots.filter((item) => item.risk === "критический").length} />
            <MetricCard label="под угрозой" value={threatened.length} suffix="нас. п." />
            <MetricCard label="горизонт" value={24} suffix="часа" />
          </motion.div>

          <div className="ml-auto grid w-full max-w-xl gap-4">
            <PointPanel point={selectedPoint} insight={pointInsight} loading={pointLoading} />
            <HoverCard hotspot={hoveredHotspot} riskScore={hoverRiskScore} riskMode={riskScoreMode} />

            <GlassPanel className="pointer-events-auto p-5">
              <div className="flex items-start gap-4">
                <ShieldAlert className="mt-1 text-[#ff7a00]" />
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-white/45">сводка</p>
                  <h2 className="mt-2 text-2xl font-black">Наиболее напряженная зона: Абайская область</h2>
                  <p className="mt-3 text-sm leading-6 text-white/64">
                    Модель отмечает плотную группу VIIRS-точек, сухой хвойный массив и ветер до 28 км/ч.
                    Приоритет: патруль Бескарагайского направления и готовность эвакуационных маршрутов.
                  </p>
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-[#ffb15f]">
                    Источник данных: {dataSource === "api" ? "QazBurnt API" : "локальный mock"}
                  </p>
                  <div className="mt-5 grid grid-cols-3 gap-3 text-center text-xs font-bold text-white/62">
                    <span className="rounded-[8px] border border-white/10 bg-white/[0.04] p-3">
                      <Activity className="mx-auto mb-2 text-[#ff8d22]" size={18} />
                      MODIS
                    </span>
                    <span className="rounded-[8px] border border-white/10 bg-white/[0.04] p-3">
                      <RadioTower className="mx-auto mb-2 text-[#ff8d22]" size={18} />
                      VIIRS
                    </span>
                    <span className="rounded-[8px] border border-white/10 bg-white/[0.04] p-3">
                      <Clock className="mx-auto mb-2 text-[#ff8d22]" size={18} />
                      Live
                    </span>
                  </div>
                </div>
              </div>
            </GlassPanel>
          </div>
        </div>
      </section>

      <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 hidden -translate-x-1/2 items-center gap-2 rounded-[8px] border border-[#ff7a00]/30 bg-black/55 px-4 py-3 text-sm font-bold text-white/72 backdrop-blur-xl lg:flex">
        <AlertTriangle size={18} className="text-[#ff8d22]" />
        Кликните по точке для живого риска, прогноза 6/12/24 часа и ближайших очагов.
      </div>
    </main>
  );
}
