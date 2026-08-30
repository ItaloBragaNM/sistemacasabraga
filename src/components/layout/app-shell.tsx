"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { useState } from "react";
import { CasaBragaMark } from "@/components/brand/mark";
import { APP_MODULES, findPageLabel } from "@/lib/modules";
import { cn } from "@/lib/utils";

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return <ModuleNav key={pathname} pathname={pathname} onNavigate={onNavigate} />;
}

function ModuleNav({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const activeModuleId = findPageLabel(pathname)?.module.id ?? null;
  const [openId, setOpenId] = useState<string | null>(activeModuleId);

  return (
    <nav className="space-y-1">
      {APP_MODULES.map((group) => {
        const open = openId === group.id;
        return (
          <div key={group.id}>
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpenId((current) => (current === group.id ? null : group.id))}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition-colors hover:bg-white/8"
            >
              <span className="font-section text-[0.62rem] text-cream/45">{group.label}</span>
              <ChevronDown
                className={cn(
                  "size-3.5 text-cream/35 transition-transform",
                  open && "rotate-180",
                )}
              />
            </button>
            {open ? (
              <ul className="mb-3 space-y-0.5">
                {group.pages.map((page) => {
                  const active =
                    pathname === page.href ||
                    (page.href !== "/eventos" && pathname.startsWith(`${page.href}/`));
                  return (
                    <li key={page.href}>
                      <Link
                        href={page.href}
                        onClick={onNavigate}
                        className={cn(
                          "font-list block rounded-md px-3 py-2 text-[0.82rem] transition-colors",
                          active
                            ? "bg-terracotta text-cream"
                            : "text-cream/75 hover:bg-white/10 hover:text-cream",
                        )}
                      >
                        {page.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        );
      })}
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
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-forest/10 bg-cream/90 px-4 py-3 backdrop-blur lg:hidden">
          <CasaBragaMark onLight />
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setOpen(true)}
            className="flex size-10 items-center justify-center rounded-lg border border-forest/20 text-forest"
          >
            <Menu className="size-5" />
          </button>
        </header>

        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Fechar menu"
              className="absolute inset-0 bg-black/40"
              onClick={() => setOpen(false)}
            />
            <aside className="relative flex h-full w-[300px] flex-col bg-petrol text-cream shadow-2xl">
              <div className="flex items-start justify-between border-b border-white/10 px-5 py-6">
                <CasaBragaMark />
                <button
                  type="button"
                  aria-label="Fechar menu"
                  onClick={() => setOpen(false)}
                  className="flex size-9 items-center justify-center text-cream/70"
                >
                  <X className="size-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-6">
                <NavList onNavigate={() => setOpen(false)} />
              </div>
            </aside>
          </div>
        )}

        <main className="px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
