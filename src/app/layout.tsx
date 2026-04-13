import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "QazBurnt | Wildfire intelligence",
  description:
    "Платформа мониторинга, прогнозирования и симуляции распространения природных пожаров в Казахстане.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full scroll-smooth">
      <body className="min-h-full bg-[#080909] text-white antialiased">
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
