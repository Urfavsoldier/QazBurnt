import { ArrowRight, BarChart3, Flame, Layers3, MapPinned, Play, Radar, Satellite, Wind } from "lucide-react";
import { ButtonLink, GlassPanel, SectionTitle } from "@/components/ui";
import { Reveal } from "@/components/Reveal";
import { hotspots, riskRank } from "@/data/wildfire";

function KazakhstanPreview() {
  return (
    <div className="relative min-h-[520px] overflow-hidden rounded-[8px] border border-white/10 bg-[#0b0d0d] p-4 sm:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_44%,rgba(255,255,255,0.08),transparent_34rem)]" />
      <GlassPanel className="relative z-10 w-full max-w-[330px] p-4">
        <div className="grid gap-4 text-sm">
          <div className="border-b border-white/10 pb-3">
            <p className="font-black text-white">Время с момента обнаружения</p>
            <p className="mt-1 text-2xl font-black text-white/44">0-72</p>
          </div>
          <div className="border-b border-white/10 pb-3">
            <p className="font-black text-white">Выберите область</p>
            <p className="mt-1 text-2xl font-black text-white/44">Все</p>
          </div>
          <div>
            <p className="font-black text-white">VIIRS вероятность</p>
            <div className="mt-3 grid gap-2">
              {["Все точки", "Высокая", "Средняя", "Низкая"].map((item, index) => (
                <span key={item} className="flex items-center gap-3 text-white/74">
                  <span
                    className={`h-4 w-4 rounded-full border ${
                      index === 0 ? "border-[#ff7a00] bg-[#ff7a00]/20" : "border-white/16"
                    }`}
                  />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </GlassPanel>

      <svg viewBox="0 0 900 430" className="kaz-map-shadow absolute bottom-6 left-1/2 z-0 w-[1050px] max-w-none -translate-x-[42%] text-white/55">
        <path
          d="M92 239 134 166l118-21 96 50 130-88 154 20 98 72 95-4 48 79-66 72-173-2-80 43-122-38-150 35-101-65-89 16Z"
          fill="rgba(255,255,255,0.06)"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path d="M252 145 282 384M348 195l184 154M478 107l-46 242M632 127l2 217M730 199l-96 145" stroke="rgba(255,255,255,0.45)" strokeWidth="2" />
        {[
          [665, 145],
          [690, 164],
          [536, 134],
          [398, 202],
          [722, 248],
        ].map(([x, y], index) => (
          <g key={`${x}-${y}`}>
            <circle cx={x} cy={y} r={index === 0 ? 11 : 8} fill="#ff7a00" />
            <circle cx={x} cy={y} r={index === 0 ? 24 : 18} fill="none" stroke="#ff7a00" strokeOpacity="0.5" />
          </g>
        ))}
      </svg>
    </div>
  );
}

const processCards = [
  {
    icon: Layers3,
    title: "Обнаружение очага",
    text: "Система определяет точку возгорания по спутниковым данным и выбранному региону.",
  },
  {
    icon: Radar,
    title: "Анализ условий",
    text: "Учитываются ветер, температура, сухость топлива и тип местности.",
  },
  {
    icon: BarChart3,
    title: "Прогноз распространения",
    text: "Платформа показывает направление огня и зоны риска на ближайшие часы.",
  },
];

export default function Home() {
  return (
    <main className="bg-[#080909]">
      <section className="relative min-h-[980px] overflow-hidden pt-20">
        <div
          className="absolute inset-0 scale-[1.03] bg-cover bg-[center_top] opacity-65 blur-[1px]"
          style={{ backgroundImage: "url('/assets/qazburnt-frame.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,4,4,0.88),rgba(4,4,4,0.42)_52%,rgba(4,4,4,0.62)),linear-gradient(180deg,rgba(0,0,0,0.10),#080909_95%)]" />
        <div className="relative z-10 mx-auto flex min-h-[900px] max-w-[1800px] items-center px-5 py-16 sm:px-8 lg:px-12">
          <Reveal className="max-w-[1060px]">
            <p className="mb-7 text-xl font-black uppercase tracking-[0.32em] text-[#d8cdbd] sm:text-3xl">
              Система раннего оповещения
            </p>
            <h1 className="text-[4.2rem] font-black leading-[0.92] sm:text-[7.5rem] lg:text-[9.8rem]">
              <span className="outline-title block">Предсказывайте</span>
              <span className="outline-title block">пожары</span>
              <span className="block text-[#ff7a00] drop-shadow-[0_0_30px_rgba(255,122,0,0.45)]">
                до их
              </span>
              <span className="block text-[#ff7a00] drop-shadow-[0_0_30px_rgba(255,122,0,0.45)]">
                распространения
              </span>
            </h1>
            <p className="mt-8 max-w-4xl text-2xl font-semibold leading-10 text-white/85 sm:text-3xl">
              Платформа мониторинга, прогнозирования рисков и симуляции распространения природных пожаров
              на базе спутниковых данных и погодных сценариев.
            </p>
            <div className="mt-12 flex flex-col gap-5 sm:flex-row">
              <ButtonLink href="/map">
                <MapPinned size={24} />
                Открыть карту
              </ButtonLink>
              <ButtonLink href="/simulation" variant="ghost">
                <Play size={24} />
                Запустить симуляцию
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="monitoring" className="px-5 py-24 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1700px]">
          <Reveal>
            <h2 className="text-4xl font-black leading-tight sm:text-6xl">Мониторинг пожаров по всему Казахстану</h2>
          </Reveal>
          <div className="mt-14 grid gap-8 lg:grid-cols-[0.92fr_1.25fr]">
            <Reveal delay={0.05}>
              <KazakhstanPreview />
            </Reveal>
            <Reveal delay={0.12} className="grid content-center gap-5">
              <div className="grid gap-5 sm:grid-cols-3">
                <GlassPanel className="p-6">
                  <Satellite className="text-[#ff8d22]" />
                  <p className="mt-8 text-5xl font-black">{hotspots.length}</p>
                  <p className="mt-2 text-sm font-bold uppercase tracking-[0.22em] text-white/45">термоточек</p>
                </GlassPanel>
                <GlassPanel className="p-6">
                  <Wind className="text-[#ff8d22]" />
                  <p className="mt-8 text-5xl font-black">28</p>
                  <p className="mt-2 text-sm font-bold uppercase tracking-[0.22em] text-white/45">км/ч ветер</p>
                </GlassPanel>
                <GlassPanel className="p-6">
                  <Flame className="text-[#ff8d22]" />
                  <p className="mt-8 text-5xl font-black">{riskRank[0].name.split(" ")[0]}</p>
                  <p className="mt-2 text-sm font-bold uppercase tracking-[0.22em] text-white/45">максимальный риск</p>
                </GlassPanel>
              </div>
              <GlassPanel className="p-8">
                <p className="text-xl leading-9 text-white/72">
                  QazBurnt собирает спутниковые очаги, ранжирует регионы по погодному профилю и выводит
                  приоритеты для оперативных штабов, лесничеств и акиматов.
                </p>
                <div className="mt-8">
                  <ButtonLink href="/analytics" variant="ghost">
                    Смотреть аналитику
                    <ArrowRight size={22} />
                  </ButtonLink>
                </div>
              </GlassPanel>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="px-5 py-24 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1500px]">
          <Reveal>
            <SectionTitle
              title={
                <>
                  <span className="text-white/18">Как работает</span> симуляция?
                </>
              }
            />
          </Reveal>
          <div className="mt-16 grid gap-7 md:grid-cols-3">
            {processCards.map((card, index) => (
              <Reveal key={card.title} delay={index * 0.08}>
                <GlassPanel className="group overflow-hidden p-5">
                  <div className="flex aspect-[1.75] items-center justify-center rounded-[8px] bg-black/58 shadow-[inset_0_0_70px_rgba(255,255,255,0.06)]">
                    <card.icon className="h-24 w-24 text-white drop-shadow-[0_0_28px_rgba(255,255,255,0.45)] transition group-hover:text-[#ff8d22]" strokeWidth={1.2} />
                  </div>
                  <h3 className="mt-8 text-2xl font-black">{card.title}</h3>
                  <p className="mt-4 text-base leading-7 text-white/64">{card.text}</p>
                </GlassPanel>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-32 sm:px-8 lg:px-12">
        <Reveal className="mx-auto max-w-[1500px]">
          <div className="relative overflow-hidden rounded-[8px] bg-[#343534] px-8 py-28 text-center sm:py-36">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,122,0,0.22),transparent_34rem)]" />
            <div className="relative z-10">
              <p className="text-[4.5rem] font-black leading-none text-white sm:text-[8rem] lg:text-[12rem]">
                СИМУЛЯЦИЯ
              </p>
              <p className="mx-auto mt-8 max-w-3xl text-xl leading-8 text-white/72">
                Проверьте сценарий: ветер, сухость, температура, горизонт прогноза и зона возможного поражения.
              </p>
              <div className="mt-10">
                <ButtonLink href="/simulation">
                  Запустить прогноз
                  <ArrowRight size={22} />
                </ButtonLink>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
