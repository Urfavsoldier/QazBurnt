import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function PageSection({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`px-5 py-24 sm:px-8 lg:px-12 ${className}`}>
      <div className="mx-auto max-w-[1700px]">{children}</div>
    </section>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost";
}) {
  const classes =
    variant === "primary"
      ? "bg-[#ff7a00] text-white orange-glow hover:bg-[#ff8d22]"
      : "border border-white/55 bg-black/18 text-white hover:border-[#ff7a00] hover:bg-[#ff7a00]/10";

  return (
    <Link
      href={href}
      className={`inline-flex min-h-16 items-center justify-center gap-3 rounded-[8px] px-7 text-base font-black tracking-wide transition sm:px-9 sm:text-lg ${classes}`}
    >
      {children}
    </Link>
  );
}

export function GlassPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`glass rounded-[8px] ${className}`}>{children}</div>;
}

export function IconBadge({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-[8px] border border-[#ff7a00]/25 bg-[#ff7a00]/12 text-[#ffb15f] shadow-[0_0_24px_rgba(255,122,0,0.2)]">
      <Icon size={24} />
    </div>
  );
}

export function MetricCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string | number;
  suffix?: string;
}) {
  return (
    <GlassPanel className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/45">{label}</p>
      <div className="mt-3 flex items-end gap-2">
        <span className="text-3xl font-black text-white sm:text-4xl">{value}</span>
        {suffix ? <span className="pb-1 text-sm font-bold text-[#ffb15f]">{suffix}</span> : null}
      </div>
    </GlassPanel>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  muted,
}: {
  eyebrow?: string;
  title: ReactNode;
  muted?: string;
}) {
  return (
    <div className="mx-auto max-w-5xl text-center">
      {eyebrow ? (
        <p className="mb-5 text-sm font-black uppercase tracking-[0.32em] text-[#ff8d22]">{eyebrow}</p>
      ) : null}
      <h2 className="text-4xl font-black leading-[0.95] text-white sm:text-6xl lg:text-7xl">
        {title}
      </h2>
      {muted ? <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-white/62">{muted}</p> : null}
    </div>
  );
}
