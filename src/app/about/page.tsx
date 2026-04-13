import { BrainCircuit, CloudSun, DatabaseZap, Map, Satellite, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { GlassPanel, IconBadge, SectionTitle } from "@/components/ui";

const pipeline = [
  {
    icon: Satellite,
    title: "MODIS + VIIRS",
    text: "Спутниковые термоточки нормализуются по времени, уверенности, интенсивности и повторяемости наблюдения.",
  },
  {
    icon: CloudSun,
    title: "Погода",
    text: "В расчет попадают ветер, температура, влажность, осадки и индекс сухости растительного топлива.",
  },
  {
    icon: DatabaseZap,
    title: "Геослой",
    text: "Граница Казахстана, регионы, населенные пункты, дороги и лесные массивы объединяются в один оперативный слой.",
  },
  {
    icon: BrainCircuit,
    title: "ML-риск",
    text: "Модель ранжирует области по вероятности распространения и формирует приоритет реагирования.",
  },
];

export default function AboutPage() {
  return (
    <main className="cinematic-bg min-h-screen pt-28">
      <section className="mx-auto max-w-[1600px] px-5 pb-24 sm:px-8 lg:px-12">
        <Reveal>
          <SectionTitle
            eyebrow="о проекте"
            title={
              <>
                Казахстану нужна система, которая видит пожар <span className="text-[#ff7a00]">до фронта огня</span>
              </>
            }
            muted="QazBurnt задуман как gov-tech платформа для раннего обнаружения, сценарного прогноза и оперативной коммуникации между штабами, лесничествами и местными службами."
          />
        </Reveal>

        <div className="mt-14 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <GlassPanel className="h-full p-8">
              <IconBadge icon={ShieldCheck} />
              <h2 className="mt-8 text-4xl font-black leading-tight">Проблема</h2>
              <p className="mt-6 text-lg leading-9 text-white/68">
                В Казахстане огромные расстояния, степные ветра, труднодоступные лесные массивы и резкие погодные
                переходы. Когда информация о пожаре приходит поздно, решение уже приходится принимать в режиме
                эвакуации, а не предупреждения.
              </p>
              <p className="mt-5 text-lg leading-9 text-white/68">
                QazBurnt переводит разрозненные данные в понятный оперативный экран: где горит, насколько надежен
                сигнал, куда пойдет фронт и какие населенные пункты требуют внимания.
              </p>
            </GlassPanel>
          </Reveal>

          <Reveal delay={0.08}>
            <GlassPanel className="h-full p-8">
              <IconBadge icon={Map} />
              <h2 className="mt-8 text-4xl font-black leading-tight">Почему Казахстан</h2>
              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                {[
                  ["2,7 млн км²", "территория требует спутникового мониторинга"],
                  ["степь и лес", "разные типы топлива меняют скорость огня"],
                  ["ветровые коридоры", "направление фронта быстро меняется"],
                  ["удаленные села", "важна оценка окна реагирования"],
                ].map(([value, text]) => (
                  <div key={value} className="rounded-[8px] border border-white/10 bg-white/[0.04] p-5">
                    <p className="text-3xl font-black text-[#ff8d22]">{value}</p>
                    <p className="mt-3 text-sm leading-6 text-white/62">{text}</p>
                  </div>
                ))}
              </div>
            </GlassPanel>
          </Reveal>
        </div>

        <div className="mt-16">
          <Reveal>
            <SectionTitle
              eyebrow="технологический контур"
              title="От спутникового сигнала до решения штаба"
              muted="MVP использует реалистичные mock-данные, но архитектура уже повторяет промышленный поток: ingestion, геопривязка, нормализация, расчет риска и визуализация."
            />
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {pipeline.map((item, index) => (
              <Reveal key={item.title} delay={index * 0.07}>
                <GlassPanel className="h-full p-6">
                  <item.icon className="text-[#ff8d22]" size={34} />
                  <h3 className="mt-7 text-2xl font-black">{item.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-white/62">{item.text}</p>
                </GlassPanel>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
