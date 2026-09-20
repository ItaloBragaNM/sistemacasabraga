import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { Toaster } from "sonner";
import { EventsProvider } from "@/components/events/events-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-cream font-sans text-forest">
        <EventsProvider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              className: "font-sans text-sm",
            }}
          />
        </EventsProvider>
      </body>
    </html>
  );
}
