"use client";

import L from "leaflet";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Compass,
  Flame,
  Gauge,
  MapPin,
  MousePointer2,
  ThermometerSun,
  Trees,
  UsersRound,
  Wind,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Circle,
  GeoJSON,
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMapEvents,
} from "react-leaflet";
import { kazakhstanGeoJson, riskColor, settlements, type RiskLevel } from "@/data/wildfire";
import { GlassPanel, IconBadge } from "@/components/ui";
import { runApiSimulation, type SimulationApiResponse } from "@/lib/qazburnt-api";

type LatLng = [number, number];
type ForecastHours = 6 | 12 | 24;

const oblastBorders = kazakhstanGeoJson;

const forecastOptions: ForecastHours[] = [6, 12, 24];

function distanceKm(a: LatLng, b: LatLng) {
  const radius = 6371;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function destinationPoint([lat, lng]: LatLng, bearing: number, km: number): LatLng {
  const radius = 6371;
  const angular = km / radius;
  const theta = (bearing * Math.PI) / 180;
  const phi1 = (lat * Math.PI) / 180;
  const lambda1 = (lng * Math.PI) / 180;
  const phi2 = Math.asin(
    Math.sin(phi1) * Math.cos(angular) +
      Math.cos(phi1) * Math.sin(angular) * Math.cos(theta),
  );
  const lambda2 =
    lambda1 +
    Math.atan2(
      Math.sin(theta) * Math.sin(angular) * Math.cos(phi1),
      Math.cos(angular) - Math.sin(phi1) * Math.sin(phi2),
    );

  return [(phi2 * 180) / Math.PI, (lambda2 * 180) / Math.PI];
}

function calculateRadius({
  hours,
  windSpeed,
  temperature,
  dryness,
}: {
  hours: number;
  windSpeed: number;
  temperature: number;
  dryness: number;
}) {
  const baseSpread = hours * 0.62;
  const windFactor = 1 + windSpeed / 34;
  const heatFactor = 1 + Math.max(0, temperature - 16) / 38;
  const fuelFactor = 1 + dryness / 115;
  return Math.round(baseSpread * windFactor * heatFactor * fuelFactor);
}

function ellipse(origin: LatLng, radiusKm: number, direction: number, wind: number) {
  const points: LatLng[] = [];
  const stretch = 1 + wind / 34;
  const cross = Math.max(0.46, 1 - wind / 88);

  for (let angle = 0; angle <= 360; angle += 10) {
    const radians = (angle * Math.PI) / 180;
    const x = Math.cos(radians) * radiusKm * stretch;
    const y = Math.sin(radians) * radiusKm * cross;
    const distance = Math.sqrt(x * x + y * y);
    const localBearing = (direction + (Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
    points.push(destinationPoint(origin, localBearing, distance));
  }

  return points;
}

function riskTone(score: number) {
  if (score >= 82) return { label: "Критический", color: "#ff3d00", text: "Нужен оперативный штаб и проверка эвакуационных маршрутов." };
  if (score >= 64) return { label: "Высокий", color: "#ff7a00", text: "Вероятно быстрое продвижение фронта при сохранении ветра." };
  if (score >= 42) return { label: "Средний", color: "#f6c85f", text: "Фронт контролируемый, но сухое топливо ускоряет кромку." };
  return { label: "Низкий", color: "#8fbf7f", text: "Сценарий требует наблюдения без немедленной эвакуации." };
}

function MapClick({ onSelect }: { onSelect: (point: LatLng) => void }) {
  useMapEvents({
    click(event) {
      onSelect([event.latlng.lat, event.latlng.lng]);
    },
  });
  return null;
}

function Slider({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-2">
      <div className="flex justify-between gap-4 text-sm font-bold">
        <span className="text-white/72">{label}</span>
        <span className="text-[#ffb15f]">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full"
      />
    </label>
  );
}

function SmallMetric({
  label,
  value,
  icon: Icon,
  tone = "#ff7a00",
}: {
  label: string;
  value: string;
  icon: typeof Flame;
  tone?: string;
}) {
  return (
    <motion.div
      layout
      className="rounded-[8px] border border-white/10 bg-black/42 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl"
    >
      <Icon size={18} style={{ color: tone }} />
      <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-white/42">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </motion.div>
  );
}

export function SimulationMap() {
  const [ignition, setIgnition] = useState<LatLng>([50.08, 79.12]);
  const [windSpeed, setWindSpeed] = useState(27);
  const [windDirection, setWindDirection] = useState(82);
  const [temperature, setTemperature] = useState(33);
  const [dryness, setDryness] = useState(78);
  const [forecastHours, setForecastHours] = useState<ForecastHours>(12);
  const [apiSimulation, setApiSimulation] = useState<SimulationApiResponse | null>(null);
  const [simulationSource, setSimulationSource] = useState<"api" | "local">("local");

  const radii = useMemo(
    () =>
      forecastOptions.map((hours) => ({
        hours,
        radius: calculateRadius({ hours, windSpeed, temperature, dryness }),
      })),
    [dryness, temperature, windSpeed],
  );

  const localRadius = radii.find((item) => item.hours === forecastHours)?.radius ?? radii[1].radius;
  const localRiskScore = Math.min(
    98,
    Math.round(windSpeed * 1.25 + dryness * 0.45 + Math.max(0, temperature - 18) * 1.1 + forecastHours * 0.72),
  );
  const localRisk = riskTone(localRiskScore);
  const localConfidence = Math.min(96, Math.round(61 + windSpeed * 0.34 + dryness * 0.12 + forecastHours * 0.55));
  const localAreaKm = Math.round(Math.PI * localRadius * localRadius * (1 + windSpeed / 55));
  const selectedApiLayer = apiSimulation?.layers.find((item) => item.hours === forecastHours);
  const selectedRadius = selectedApiLayer?.forward_km ?? localRadius;
  const spreadPolygon = useMemo(
    () => selectedApiLayer?.polygon ?? ellipse(ignition, selectedRadius, windDirection, windSpeed),
    [ignition, selectedApiLayer, selectedRadius, windDirection, windSpeed],
  );
  const risk = apiSimulation ? riskTone(apiSimulation.probability_percent) : localRisk;
  const displayedRiskScore = apiSimulation?.probability_percent ?? localRiskScore;
  const confidence = apiSimulation ? Math.min(96, 62 + Math.round(apiSimulation.probability_percent * 0.28)) : localConfidence;
  const areaKm = selectedApiLayer?.area_km2 ?? localAreaKm;

  useEffect(() => {
    let cancelled = false;
    runApiSimulation({
      ignition_lat: ignition[0],
      ignition_lon: ignition[1],
      wind_speed_kmh: windSpeed,
      wind_direction_deg: windDirection,
      temperature_c: temperature,
      relative_humidity_pct: Math.max(0, 100 - dryness),
      precipitation_mm: 0,
      terrain_type: "steppe",
      forecast_hours: forecastHours,
    }).then((result) => {
      if (!cancelled) {
        setApiSimulation(result);
        setSimulationSource(result ? "api" : "local");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [dryness, forecastHours, ignition, temperature, windDirection, windSpeed]);

  const windEnd = useMemo(
    () => destinationPoint(ignition, windDirection, Math.max(34, selectedRadius * 1.7)),
    [ignition, selectedRadius, windDirection],
  );

  const windSteps = useMemo(
    () =>
      [0.42, 0.7, 0.98].map((factor) => ({
        point: destinationPoint(ignition, windDirection, Math.max(18, selectedRadius * factor)),
        factor,
      })),
    [ignition, selectedRadius, windDirection],
  );

  const speedKmh = Math.max(1, Number((selectedRadius / forecastHours).toFixed(1)));

  const affectedSettlements = useMemo(
    () =>
      settlements
        .map((settlement) => {
          const distance = distanceKm(ignition, [settlement.lat, settlement.lng]);
          const arrival = Math.max(1, Math.round(distance / speedKmh));
          return { ...settlement, distance: Math.round(distance), arrival };
        })
        .filter((settlement) => settlement.distance <= selectedRadius * (1.1 + dryness / 210))
        .sort((a, b) => a.arrival - b.arrival),
    [dryness, ignition, selectedRadius, speedKmh],
  );

  const ignitionIcon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: '<div class="simulation-ignition"><div class="fire-pulse"></div><span></span><span></span><span></span></div>',
        iconSize: [90, 90],
        iconAnchor: [45, 45],
      }),
    [],
  );

  const arrowIcon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: `<div class="simulation-wind-arrow" style="transform: rotate(${windDirection - 90}deg)"></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      }),
    [windDirection],
  );

  return (
    <main className="cinematic-bg min-h-screen pt-20">
      <section className="grid min-h-[calc(100vh-5rem)] grid-cols-1 lg:grid-cols-[430px_1fr]">
        <motion.aside
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="z-20 border-r border-white/10 bg-[#090a09]/90 p-4 backdrop-blur-2xl sm:p-6"
        >
          <div className="flex items-start gap-4">
            <IconBadge icon={Flame} />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#ff8d22]">симуляция</p>
              <h1 className="mt-2 text-3xl font-black leading-tight">Прогноз фронта огня</h1>
              <p className="mt-3 text-sm leading-6 text-white/58">
                Нажмите на карту, задайте ветер и сухость. Контур покажет, куда сместится фронт за выбранный горизонт.
              </p>
            </div>
          </div>

          <GlassPanel className="mt-6 p-3">
            <div className="grid grid-cols-3 gap-2">
              {forecastOptions.map((hours) => (
                <button
                  key={hours}
                  type="button"
                  onClick={() => setForecastHours(hours)}
                  className={`rounded-[8px] px-4 py-3 text-sm font-black transition ${
                    forecastHours === hours
                      ? "bg-[#ff7a00] text-white orange-glow"
                      : "border border-white/10 bg-white/[0.04] text-white/62 hover:border-[#ff7a00]/50 hover:text-white"
                  }`}
                >
                  {hours} ч
                </button>
              ))}
            </div>
          </GlassPanel>

          <GlassPanel className="mt-5 p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/44">уровень риска</p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <p className="text-3xl font-black" style={{ color: risk.color }}>
                {risk.label}
              </p>
              <span className="text-4xl font-black text-[#ff7a00]">{displayedRiskScore}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/58">{risk.text}</p>
          </GlassPanel>

          <div className="mt-7 grid gap-5">
            <Slider label="Скорость ветра" value={windSpeed} min={0} max={52} unit=" км/ч" onChange={setWindSpeed} />
            <Slider label="Направление ветра" value={windDirection} min={0} max={359} unit="°" onChange={setWindDirection} />
            <Slider label="Температура" value={temperature} min={10} max={46} unit="°C" onChange={setTemperature} />
            <Slider label="Сухость топлива" value={dryness} min={10} max={100} unit="%" onChange={setDryness} />
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3">
            <SmallMetric label="радиус" value={`${selectedRadius} км`} icon={Compass} />
            <SmallMetric label="площадь" value={`${areaKm} км²`} icon={Trees} />
            <SmallMetric label="уверенность" value={`${confidence}%`} icon={Gauge} />
            <SmallMetric label="под угрозой" value={`${affectedSettlements.length}`} icon={UsersRound} tone={risk.color} />
          </div>

          <GlassPanel className="mt-5 p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <MousePointer2 className="text-[#ff8d22]" size={20} />
                <p className="text-sm font-black uppercase tracking-[0.2em] text-white/48">точка очага</p>
              </div>
              <span className="text-sm font-black text-[#ffb15f]">{ignition[0].toFixed(3)}, {ignition[1].toFixed(3)}</span>
            </div>
            <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-white/42">
              Источник расчета: {simulationSource === "api" ? "QazBurnt API" : "локальная модель"}
            </p>
          </GlassPanel>
        </motion.aside>

        <div className="relative min-h-[720px] overflow-hidden">
          <MapContainer center={ignition} zoom={6} minZoom={4} maxZoom={9} className="absolute inset-0 h-full w-full">
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            <GeoJSON
              data={oblastBorders}
              style={(feature) => {
                const featureRisk = (feature?.properties?.risk ?? "средний") as RiskLevel;
                return {
                  color: "rgba(255,255,255,0.52)",
                  weight: 1.25,
                  fillColor: riskColor[featureRisk],
                  fillOpacity: 0.08,
                };
              }}
            />
            <MapClick onSelect={setIgnition} />

            {apiSimulation?.layers.map((layer) => (
              <Polygon
                key={`api-${layer.hours}`}
                positions={layer.polygon}
                pathOptions={{
                  color: layer.hours === forecastHours ? "#ff7a00" : "rgba(255,255,255,0.55)",
                  fillColor: layer.hours === 24 ? "#ff3d00" : "#ff7a00",
                  fillOpacity: layer.hours === forecastHours ? 0.18 : 0.055,
                  opacity: layer.hours === forecastHours ? 0.88 : 0.38,
                  weight: layer.hours === forecastHours ? 2 : 1,
                  dashArray: layer.hours === forecastHours ? undefined : "8 10",
                }}
              />
            ))}

            {!apiSimulation && radii.map((item) => (
              <Circle
                key={item.hours}
                center={ignition}
                radius={item.radius * 1000}
                pathOptions={{
                  color: item.hours === forecastHours ? "#ff7a00" : "rgba(255,255,255,0.5)",
                  fillColor: item.hours === forecastHours ? "#ff7a00" : "#ffffff",
                  fillOpacity: item.hours === forecastHours ? 0.09 : 0.025,
                  opacity: item.hours === forecastHours ? 0.88 : 0.34,
                  weight: item.hours === forecastHours ? 2 : 1,
                  dashArray: item.hours === forecastHours ? undefined : "8 10",
                }}
              />
            ))}

            <Circle center={ignition} radius={selectedRadius * 1000 * 0.34} pathOptions={{ color: "#ff3d00", fillColor: "#ff3d00", fillOpacity: 0.26, weight: 1 }} />
            <Circle center={ignition} radius={selectedRadius * 1000 * 0.66} pathOptions={{ color: "#ff8a1d", fillColor: "#ff8a1d", fillOpacity: 0.14, weight: 1 }} />
            <Polygon positions={spreadPolygon} pathOptions={{ color: "#ff7a00", fillColor: "#ff7a00", fillOpacity: 0.2, weight: 2 }} />
            <Polyline positions={[ignition, windEnd]} pathOptions={{ color: "#ffb15f", weight: 3, opacity: 0.9, dashArray: "10 12" }} />

            {windSteps.map((step) => (
              <Marker key={step.factor} position={step.point} icon={arrowIcon}>
                <Tooltip direction="top" opacity={0.95} className="qaz-fire-tooltip">
                  Вектор ветра {windDirection}°
                </Tooltip>
              </Marker>
            ))}

            {affectedSettlements.map((settlement) => (
              <Marker
                key={settlement.name}
                position={[settlement.lat, settlement.lng]}
                icon={L.divIcon({
                  className: "",
                  html: '<div class="threat-village"></div>',
                  iconSize: [18, 18],
                  iconAnchor: [9, 9],
                })}
              >
                <Tooltip direction="top" opacity={1} className="qaz-fire-tooltip">
                  <strong>{settlement.name}</strong>
                  <br />
                  Подход фронта: {settlement.arrival} ч
                </Tooltip>
              </Marker>
            ))}

            <Marker position={ignition} icon={ignitionIcon}>
              <Popup>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ff8d22]">очаг</p>
                  <h3 className="mt-1 text-lg font-black">Выбранная точка возгорания</h3>
                  <p className="mt-2 text-sm text-white/65">
                    Прогноз: {forecastHours} ч, ветер {windSpeed} км/ч, сухость {dryness}%.
                  </p>
                </div>
              </Popup>
            </Marker>
          </MapContainer>

          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_54%_44%,transparent_0,rgba(0,0,0,0.14)_34%,rgba(0,0,0,0.7)_100%)]" />

          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-none absolute left-5 right-5 top-5 z-[600] hidden gap-4 lg:grid xl:grid-cols-4"
          >
            <GlassPanel className="p-5">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/44">уровень риска</p>
              <p className="mt-3 text-3xl font-black" style={{ color: risk.color }}>{risk.label} · {displayedRiskScore}</p>
              <p className="mt-2 text-sm leading-6 text-white/58">{risk.text}</p>
            </GlassPanel>
            <GlassPanel className="p-5">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/44">скорость кромки</p>
              <p className="mt-3 text-3xl font-black">{speedKmh} км/ч</p>
              <p className="mt-2 text-sm leading-6 text-white/58">Расчет по ветру, температуре и сухости топлива.</p>
            </GlassPanel>
            <GlassPanel className="p-5">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/44">ветровой вектор</p>
              <p className="mt-3 text-3xl font-black">{windSpeed} км/ч</p>
              <p className="mt-2 text-sm leading-6 text-white/58">Направление: {windDirection}°.</p>
            </GlassPanel>
            <GlassPanel className="p-5">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/44">горизонт</p>
              <p className="mt-3 text-3xl font-black">{forecastHours} ч</p>
              <p className="mt-2 text-sm leading-6 text-white/58">Контур обновляется мгновенно.</p>
            </GlassPanel>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="pointer-events-none absolute bottom-5 left-5 right-5 z-[600] grid gap-4 xl:left-auto xl:w-[470px]"
          >
            <GlassPanel className="p-5">
              <div className="flex items-center gap-3">
                <Wind className="text-[#ff8d22]" />
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-white/44">сценарий распространения</p>
                  <p className="text-xl font-black">Фронт смещается по ветру на {selectedRadius} км</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <span className="rounded-[8px] border border-white/10 bg-white/[0.04] p-3">
                  <ThermometerSun className="mb-2 text-[#ffb15f]" size={18} />
                  {temperature}°C
                </span>
                <span className="rounded-[8px] border border-white/10 bg-white/[0.04] p-3">
                  <Gauge className="mb-2 text-[#ffb15f]" size={18} />
                  {dryness}% сухость
                </span>
                <span className="rounded-[8px] border border-white/10 bg-white/[0.04] p-3">
                  <Compass className="mb-2 text-[#ffb15f]" size={18} />
                  {confidence}% доверие
                </span>
              </div>
            </GlassPanel>

            <GlassPanel className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <UsersRound className="text-[#ff8d22]" />
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-white/44">населенные пункты под угрозой</p>
                </div>
                <span className="text-lg font-black text-[#ffb15f]">{affectedSettlements.length}</span>
              </div>
              <div className="mt-4 grid gap-2">
                {affectedSettlements.length > 0 ? (
                  affectedSettlements.slice(0, 4).map((settlement) => (
                    <div key={settlement.name} className="flex items-center justify-between gap-3 rounded-[8px] border border-white/10 bg-white/[0.04] px-3 py-2">
                      <span className="flex items-center gap-2 text-sm font-bold">
                        <MapPin size={15} className="text-[#ff8d22]" />
                        {settlement.name}
                      </span>
                      <span className="text-xs font-black text-white/54">{settlement.arrival} ч / {settlement.distance} км</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-white/62">Крупные села вне текущего контура. Продолжайте мониторинг ветра.</p>
                )}
              </div>
            </GlassPanel>
          </motion.div>

          <div className="pointer-events-none absolute bottom-5 left-5 z-[610] hidden items-center gap-2 rounded-[8px] border border-[#ff7a00]/30 bg-black/55 px-4 py-3 text-sm font-bold text-white/72 backdrop-blur-xl xl:flex">
            <AlertTriangle size={18} className="text-[#ff8d22]" />
            Клик по карте меняет точку возгорания.
          </div>
        </div>
      </section>
    </main>
  );
}
