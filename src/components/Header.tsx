"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Menu, X } from "lucide-react";
import { useState } from "react";

const links = [
  { href: "/map", label: "карта" },
  { href: "/simulation", label: "симуляция" },
  { href: "/analytics", label: "аналитика" },
  { href: "/about", label: "о проекте" },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-[1000] border-b border-white/8 bg-black/28 backdrop-blur-2xl">
      <div className="mx-auto flex h-20 max-w-[1800px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link href="/" className="flex items-center gap-3 text-2xl font-black sm:text-3xl">
          <span>QazBurnt</span>
        </Link>

        <nav className="hidden items-center gap-12 lg:flex">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative text-lg font-bold lowercase tracking-[0.08em] transition ${
                  active ? "text-white" : "text-white/72 hover:text-white"
                }`}
              >
                {link.label}
                {active ? (
                  <span className="absolute -bottom-5 left-1/2 h-1 w-16 -translate-x-1/2 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.75)]" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/map"
          aria-label="Открыть оперативную карту"
          className="hidden h-12 w-12 items-center justify-center rounded-[8px] bg-white text-black shadow-[0_0_24px_rgba(255,255,255,0.22)] transition hover:bg-[#ff7a00] hover:text-white sm:flex"
        >
          <Flame size={24} fill="currentColor" />
        </Link>

        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-[8px] border border-white/15 bg-white/5 text-white lg:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label="Открыть навигацию"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-white/10 bg-[#090a09]/95 px-5 py-5 shadow-2xl lg:hidden">
          <div className="grid gap-3">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-[8px] border border-white/10 bg-white/[0.04] px-4 py-3 text-lg font-bold"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}
