"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { formatDateTime } from "@/lib/dates";
import type { PublicUser } from "@/lib/auth/types";
import type { AppNotification } from "@/lib/notificacoes/types";
import { cn } from "@/lib/utils";

export function NotificationsBell({
  user,
  tone = "light",
}: {
  user: PublicUser;
  tone?: "light" | "dark";
}) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/notificacoes", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { data: AppNotification[] };
      setItems(Array.isArray(json.data) ? json.data : []);
    } catch {
      /* ignore polling errors */
    }
  };

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 25_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onPointer);
    return () => window.removeEventListener("mousedown", onPointer);
  }, [open]);

  const unread = items.filter((item) => !item.readBy.includes(user.id));

  const mark = async (ids?: string[]) => {
    try {
      const res = await fetch("/api/notificacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ids ? { ids } : { readAll: true }),
      });
      if (!res.ok) return;
      const json = (await res.json()) as { data: AppNotification[] };
      setItems(Array.isArray(json.data) ? json.data : []);
    } catch {
      /* ignore */
    }
  };

  const dark = tone === "dark";

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-label="Notificações"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "relative flex size-9 items-center justify-center rounded-md transition-colors",
          dark
            ? "text-cream/70 hover:bg-white/10 hover:text-cream"
            : "border border-forest/20 text-forest hover:bg-forest/5",
        )}
      >
        <Bell className="size-4" />
        {unread.length > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-terracotta px-1 text-[10px] font-semibold text-cream">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          className={cn(
            "absolute z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-forest/10 bg-white shadow-xl",
            dark ? "right-0" : "right-0",
          )}
        >
          <div className="flex items-center justify-between border-b border-forest/10 px-3 py-2">
            <p className="text-sm font-semibold text-forest">Notificações</p>
            {unread.length > 0 ? (
              <button
                type="button"
                className="text-xs text-forest/55 hover:text-forest"
                onClick={() => void mark()}
              >
                Marcar todas como lidas
              </button>
            ) : null}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm font-light text-forest/50">
                Nenhuma notificação ainda.
              </p>
            ) : (
              items.slice(0, 40).map((item) => {
                const isUnread = !item.readBy.includes(user.id);
                const inner = (
                  <div className={cn("px-3 py-2.5", isUnread && "bg-forest/[0.04]")}>
                    <p className="text-sm text-forest">{item.summary}</p>
                    <p className="mt-0.5 text-[11px] text-forest/45">{formatDateTime(item.createdAt)}</p>
                  </div>
                );
                return item.action === "excluir" ? (
                  <div key={item.id}>{inner}</div>
                ) : (
                  <Link
                    key={item.id}
                    href={`/eventos/${item.eventId}`}
                    onClick={() => {
                      if (isUnread) void mark([item.id]);
                      setOpen(false);
                    }}
                    className="block hover:bg-cream"
                  >
                    {inner}
                  </Link>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
