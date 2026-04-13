"use client";

import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Flame, RadioTower, ShieldAlert, TrendingUp, UsersRound, Wind } from "lucide-react";
import { GlassPanel, IconBadge, SectionTitle } from "@/components/ui";
import { Reveal } from "@/components/Reveal";
import { analytics, type AnalyticsKpi } from "@/data/wildfire";

const { dangerousRegions, forecast24, kpis, severityPie, trendData } = analytics;

const kpiIcons = {
  flame: Flame,
  shield: ShieldAlert,
  users: UsersRound,
  radio: RadioTower,
};

const tooltipStyle = {
  background: "rgba(10,10,9,0.96)",
  border: "1px solid rgba(255,122,0,0.28)",
  borderRadius: 8,
  color: "white",
  boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
};

function KpiCard({ item, index }: { item: AnalyticsKpi; index: number }) {
  const Icon = kpiIcons[item.icon];

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: index * 0.06 }}
    >
      <GlassPanel className="h-full p-5">
        <div className="flex items-center justify-between gap-4">
          <Icon className="text-[#ff8d22]" size={25} />
          <span className="rounded-[8px] border border-[#ff7a00]/25 bg-[#ff7a00]/10 px-3 py-1 text-xs font-black text-[#ffb15f]">
            live
          </span>
        </div>
        <p className="mt-8 text-xs font-black uppercase tracking-[0.22em] text-white/42">{item.label}</p>
        <p className="mt-3 text-5xl font-black text-[#ff7a00] drop-shadow-[0_0_22px_rgba(255,122,0,0.25)]">
          {item.value}
        </p>
        <p className="mt-3 text-sm font-bold text-white/58">{item.delta}</p>
      </GlassPanel>
    </motion.div>
  );
}

function DangerousRegions() {
  return (
    <GlassPanel className="p-5 sm:p-7">
      <div className="mb-7 flex items-center gap-4">
        <IconBadge icon={AlertTriangle} />
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/42">приоритет реагирования</p>
          <h2 className="text-2xl font-black">Самые опасные регионы</h2>
        </div>
      </div>

      <div className="grid gap-4">
        {dangerousRegions.map((region, index) => (
          <motion.div
            key={region.region}
            initial={{ opacity: 0, x: 18 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: index * 0.06 }}
            className="rounded-[8px] border border-white/10 bg-white/[0.04] p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-black">{region.region}</h3>
                <p className="mt-1 text-sm text-white/52">{region.reason}</p>
              </div>
              <span className="text-2xl font-black text-[#ff7a00]">{region.score}</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${region.score}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.12 + index * 0.05 }}
                className="h-full rounded-full bg-[#ff7a00] shadow-[0_0_18px_rgba(255,122,0,0.65)]"
              />
            </div>
            <div className="mt-3 flex gap-4 text-xs font-bold text-white/52">
              <span>{region.fires} очагов</span>
              <span>{region.wind} км/ч ветер</span>
            </div>
          </motion.div>
        ))}
      </div>
    </GlassPanel>
  );
}

export function AnalyticsDashboard() {
  return (
    <main className="cinematic-bg min-h-screen pt-28">
      <section className="mx-auto max-w-[1700px] px-5 pb-24 sm:px-8 lg:px-12">
        <Reveal>
          <SectionTitle
            eyebrow="аналитический центр"
            title={
              <>
                Оперативная картина риска на <span className="text-[#ff7a00]">24 часа</span>
              </>
            }
            muted="QazBurnt объединяет спутниковые термоточки, ветер, сухость топлива и прогноз распространения в единую панель решений."
          />
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kpis.map((item, index) => (
            <KpiCard key={item.label} item={item} index={index} />
          ))}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <GlassPanel className="p-5 sm:p-7">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <IconBadge icon={TrendingUp} />
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-white/42">тренд пожаров</p>
                  <h2 className="text-2xl font-black">Очаги за последние 7 дней</h2>
                </div>
              </div>
              <p className="hidden max-w-sm text-right text-sm leading-6 text-white/52 sm:block">
                Воскресный рост связан с усилением ветра и падением влажности в восточных областях.
              </p>
            </div>
            <div className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="trendFires" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff7a00" stopOpacity={0.72} />
                      <stop offset="95%" stopColor="#ff7a00" stopOpacity={0.03} />
                    </linearGradient>
                    <linearGradient id="confirmedFires" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ffffff" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#ffffff" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.55)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.55)" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="confirmed" name="подтверждено" stroke="#ffffff" fill="url(#confirmedFires)" strokeWidth={2} isAnimationActive />
                  <Area type="monotone" dataKey="fires" name="очаги" stroke="#ff7a00" fill="url(#trendFires)" strokeWidth={3} isAnimationActive />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassPanel>

          <GlassPanel className="p-5 sm:p-7">
            <div className="mb-8 flex items-center gap-4">
              <IconBadge icon={Flame} />
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-white/42">тяжесть</p>
                <h2 className="text-2xl font-black">Структура угроз</h2>
              </div>
            </div>
            <div className="grid items-center gap-6 md:grid-cols-[1fr_0.8fr] xl:grid-cols-1 2xl:grid-cols-[1fr_0.8fr]">
              <div className="h-[310px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityPie}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={76}
                      outerRadius={122}
                      paddingAngle={3}
                      isAnimationActive
                    >
                      {severityPie.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid gap-3">
                {severityPie.map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-[8px] border border-white/10 bg-white/[0.04] px-4 py-3">
                    <span className="flex items-center gap-3 text-sm font-bold text-white/72">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color, boxShadow: `0 0 14px ${item.color}` }} />
                      {item.name}
                    </span>
                    <span className="text-lg font-black text-white">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </GlassPanel>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.86fr_1.14fr]">
          <DangerousRegions />

          <GlassPanel className="p-5 sm:p-7">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <IconBadge icon={Wind} />
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-white/42">24 часа</p>
                  <h2 className="text-2xl font-black">Прогноз индекса риска</h2>
                </div>
              </div>
              <div className="hidden rounded-[8px] border border-[#ff7a00]/30 bg-[#ff7a00]/10 px-4 py-3 text-right sm:block">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ffb15f]">пик риска</p>
                <p className="text-2xl font-black text-white">16:00</p>
              </div>
            </div>
            <div className="h-[390px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecast24}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fill: "rgba(255,255,255,0.55)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.55)" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="wind" name="ветер" stroke="rgba(255,255,255,0.55)" strokeWidth={2} dot={false} isAnimationActive />
                  <Line
                    type="monotone"
                    dataKey="risk"
                    name="индекс риска"
                    stroke="#ff7a00"
                    strokeWidth={4}
                    dot={{ r: 4, fill: "#ff7a00", stroke: "#0a0a09", strokeWidth: 2 }}
                    activeDot={{ r: 7, fill: "#ffb15f", stroke: "#ff7a00", strokeWidth: 2 }}
                    isAnimationActive
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {["Ветер усиливается после полудня", "Сухость топлива выше нормы", "Восток требует патруля"].map((item) => (
                <div key={item} className="rounded-[8px] border border-white/10 bg-white/[0.04] p-4 text-sm font-bold leading-6 text-white/62">
                  {item}
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>
      </section>
    </main>
  );
}
