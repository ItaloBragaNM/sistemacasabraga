import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { Toaster } from "sonner";
import { EventsProvider } from "@/components/events/events-provider";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
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
    <html lang="pt-BR" className={`${poppins.variable} h-full antialiased`}>
      <body className={`${poppins.className} min-h-full bg-cream font-sans text-forest`}>
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
