"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  ChefHat,
  ChevronDown,
  LineChart,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Truck,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { CasaBragaMark } from "@/components/brand/mark";
import { USER_ROLE_LABELS } from "@/lib/auth/roles";
import type { PublicUser } from "@/lib/auth/types";
import { findPageLabel, modulesVisibleTo, type AppModule } from "@/lib/modules";
import { cn } from "@/lib/utils";

const SIDEBAR_KEY = "casa-braga.sidebar.collapsed";

const MODULE_ICONS: Record<string, LucideIcon> = {
  eventos: CalendarDays,
  comercial: LineChart,
  cozinha: ChefHat,
  logistica: Package,
  veiculos: Truck,
  administrativo: Users,
  financeiro: Wallet,
  cadastros: BookOpen,
  configuracoes: Settings,
};

function useCollapsedSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SIDEBAR_KEY) === "1";
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore sidebar preference after hydration
      setCollapsed(stored);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = () => {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return { collapsed, toggle };
}

function NavList({
  user,
  collapsed,
  onNavigate,
}: {
  user: PublicUser;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <ModuleNav
      key={pathname}
      pathname={pathname}
      user={user}
      collapsed={collapsed}
      onNavigate={onNavigate}
    />
  );
}

function ModuleNav({
  pathname,
  user,
  collapsed,
  onNavigate,
}: {
  pathname: string;
  user: PublicUser;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const modules = modulesVisibleTo(user.role);
  const activeModuleId = findPageLabel(pathname)?.module.id ?? null;
  const [openId, setOpenId] = useState<string | null>(activeModuleId);

  return (
    <nav className="space-y-1">
      {modules.map((group) => {
        const open = openId === group.id;
        const Icon = MODULE_ICONS[group.id] ?? BookOpen;
        if (collapsed) {
          return (
            <CollapsedModule
              key={group.id}
              group={group}
              icon={Icon}
              pathname={pathname}
              active={activeModuleId === group.id}
              onNavigate={onNavigate}
            />
          );
        }
        return (
          <div key={group.id}>
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpenId((current) => (current === group.id ? null : group.id))}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition-colors hover:bg-white/8"
            >
              <span className="flex items-center gap-2">
                <Icon className="size-3.5 text-cream/40" />
                <span className="font-section text-[0.62rem] text-cream/45">{group.label}</span>
              </span>
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

function CollapsedModule({
  group,
  icon: Icon,
  pathname,
  active,
  onNavigate,
}: {
  group: AppModule;
  icon: LucideIcon;
  pathname: string;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="group relative">
      <Link
        href={group.pages[0]?.href ?? "/eventos"}
        title={group.label}
        aria-label={group.label}
        onClick={onNavigate}
        className={cn(
          "flex size-10 items-center justify-center rounded-md transition-colors",
          active ? "bg-terracotta text-cream" : "text-cream/70 hover:bg-white/10 hover:text-cream",
        )}
      >
        <Icon className="size-4" />
      </Link>
      <div className="invisible absolute left-full top-0 z-50 ml-2 min-w-52 rounded-lg bg-petrol py-2 opacity-0 shadow-xl ring-1 ring-white/10 transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <p className="font-section px-3 pb-1 text-[0.62rem] text-cream/45">{group.label}</p>
        <ul>
          {group.pages.map((page) => {
            const pageActive =
              pathname === page.href ||
              (page.href !== "/eventos" && pathname.startsWith(`${page.href}/`));
            return (
              <li key={page.href}>
                <Link
                  href={page.href}
                  onClick={onNavigate}
                  className={cn(
                    "font-list block px-3 py-2 text-[0.82rem]",
                    pageActive ? "bg-terracotta text-cream" : "text-cream/80 hover:bg-white/10",
                  )}
                >
                  {page.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function UserFooter({ user, collapsed }: { user: PublicUser; collapsed?: boolean }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);

  const logout = async () => {
    setWorking(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally {
      setWorking(false);
    }
  };

  if (collapsed) {
    return (
      <div className="border-t border-white/10 p-2">
        <button
          type="button"
          title={`Sair (${user.name})`}
          aria-label="Sair"
          onClick={logout}
          disabled={working}
          className="flex size-10 items-center justify-center rounded-md text-cream/60 hover:bg-white/10 hover:text-cream"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-white/10 px-4 py-4">
      <p className="truncate text-sm text-cream">{user.name}</p>
      <p className="mt-0.5 text-xs font-light text-cream/45">{USER_ROLE_LABELS[user.role]}</p>
      <button
        type="button"
        onClick={logout}
        disabled={working}
        className="mt-3 inline-flex items-center gap-2 text-xs text-cream/60 transition-colors hover:text-cream"
      >
        <LogOut className="size-3.5" />
        {working ? "Saindo…" : "Sair"}
      </button>
    </div>
  );
}

export function AppShell({
  user,
  children,
}: {
  user: PublicUser;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { collapsed, toggle } = useCollapsedSidebar();

  return (
    <div
      className={cn(
        "min-h-screen lg:grid",
        collapsed ? "lg:grid-cols-[72px_minmax(0,1fr)]" : "lg:grid-cols-[272px_minmax(0,1fr)]",
      )}
    >
      <aside className={cn(
        "hidden bg-petrol lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col",
        collapsed ? "lg:overflow-visible" : "lg:overflow-y-auto",
      )}>
        <div
          className={cn(
            "flex border-b border-white/10",
            collapsed ? "flex-col items-center px-2 py-4" : "items-start justify-between gap-2 px-5 py-6",
          )}
        >
          {collapsed ? null : <CasaBragaMark />}
          <button
            type="button"
            aria-label={collapsed ? "Expandir menu" : "Minimizar menu"}
            title={collapsed ? "Expandir menu" : "Minimizar menu"}
            onClick={toggle}
            className="flex size-8 items-center justify-center rounded-md text-cream/50 transition-colors hover:bg-white/10 hover:text-cream"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </button>
        </div>
        <div className={cn("flex-1 py-4", collapsed ? "px-2" : "px-3 py-6")}>
          <NavList user={user} collapsed={collapsed} />
        </div>
        <UserFooter user={user} collapsed={collapsed} />
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
                <NavList user={user} onNavigate={() => setOpen(false)} />
              </div>
              <UserFooter user={user} />
            </aside>
          </div>
        )}

        <main className="px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
