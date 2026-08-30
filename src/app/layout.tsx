import type { Metadata } from "next";
import { Cormorant_Garamond, Geist_Mono, Montserrat, Oswald } from "next/font/google";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { EventsProvider } from "@/components/events/events-provider";
import "./globals.css";

const hatton = Cormorant_Garamond({
  variable: "--font-hatton",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const barrels = Oswald({
  variable: "--font-barrels",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const sauce = localFont({
  variable: "--font-sauce",
  src: [
    { path: "../fonts/open-sauce-one-light.woff2", weight: "300", style: "normal" },
    { path: "../fonts/open-sauce-one-regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/open-sauce-one-bold.woff2", weight: "700", style: "normal" },
  ],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Casa Braga — Gestão de Eventos",
  description:
    "Sistema operacional da Casa Braga para calendário, ficha de evento e produção da casa.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${hatton.variable} ${barrels.variable} ${montserrat.variable} ${sauce.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-cream text-forest">
        <EventsProvider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              className: "font-[family-name:var(--font-sauce)]",
            }}
          />
        </EventsProvider>
      </body>
    </html>
  );
}
