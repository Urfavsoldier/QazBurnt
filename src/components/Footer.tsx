import Link from "next/link";
import { Flame, RadioTower, ShieldAlert } from "lucide-react";

const footerLinks = [
  { href: "/map", label: "Карта" },
  { href: "/simulation", label: "Симуляция" },
  { href: "/analytics", label: "Аналитика" },
  { href: "/about", label: "О проекте" },
];

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#070808]">
      <div className="mx-auto grid max-w-[1700px] gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[1.2fr_0.8fr_0.8fr] lg:px-12">
        <div>
          <Link href="/" className="flex items-center gap-3 text-2xl font-black">
            <Flame className="text-[#ff7a00]" fill="currentColor" />
            QazBurnt
          </Link>
          <p className="mt-4 max-w-xl text-sm leading-7 text-white/56">
            Платформа раннего мониторинга, прогнозирования риска и симуляции распространения природных
            пожаров для Казахстана.
          </p>
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/38">навигация</p>
          <div className="mt-4 grid gap-3">
            {footerLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm font-bold text-white/62 transition hover:text-[#ff8d22]">
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/38">контур данных</p>
          <div className="mt-4 grid gap-3 text-sm font-bold text-white/62">
            <span className="flex items-center gap-2">
              <RadioTower size={16} className="text-[#ff8d22]" />
              MODIS + VIIRS
            </span>
            <span className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-[#ff8d22]" />
              Погодный риск
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
