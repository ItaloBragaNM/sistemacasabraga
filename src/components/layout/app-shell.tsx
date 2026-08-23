"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useState } from "react";
import { CasaBragaMark } from "@/components/brand/mark";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { APP_MODULES } from "@/lib/modules";
import { cn } from "@/lib/utils";

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-6">
      {APP_MODULES.map((module) => (
        <div key={module.id}>
          <p className="font-section mb-2 px-3 text-[0.62rem] text-cream/45">
            {module.label}
          </p>
          <ul className="space-y-0.5">
            {module.pages.map((page) => {
              const active =
                pathname === page.href ||
                (page.href !== "/eventos" && pathname.startsWith(page.href));
              return (
                <li key={page.href}>
                  <Link
                    href={page.href}
                    onClick={onNavigate}
                    className={cn(
                      "font-list block rounded-md px-3 py-2 text-[0.82rem] transition-colors",
                      active
                        ? "bg-terracotta text-cream"
                        : "text-cream/75 hover:bg-white/8 hover:text-cream",
                    )}
                  >
                    {page.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
      <aside className="hidden bg-petrol lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto">
        <div className="border-b border-white/10 px-5 py-6">
          <CasaBragaMark />
        </div>
        <div className="flex-1 px-3 py-6">
          <NavList />
        </div>
        <div className="border-t border-white/10 px-5 py-4">
          <p className="font-list text-[0.7rem] leading-5 text-cream/45">
            Primeira fase: módulo de Eventos.
            <br />
            Os demais módulos entram depois da validação.
          </p>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-forest/10 bg-cream/90 px-4 py-3 backdrop-blur lg:hidden">
          <CasaBragaMark onLight />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button variant="outline" size="icon" className="border-forest/20">
                  <Menu />
                </Button>
              }
            />
            <SheetContent
              side="left"
              className="w-[300px] border-none bg-petrol p-0 text-cream"
            >
              <div className="border-b border-white/10 px-5 py-6">
                <CasaBragaMark />
              </div>
              <div className="px-3 py-6">
                <NavList onNavigate={() => setOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
