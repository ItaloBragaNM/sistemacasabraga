"use client";

import { Eye, EyeOff } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CasaBragaMark } from "@/components/brand/mark";
import { fieldControlClass, Field } from "@/components/events/field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/eventos";
  const [setupRequired, setSetupRequired] = useState(false);
  const [checking, setChecking] = useState(true);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        const json = (await res.json()) as { user?: { id: string } | null; setupRequired?: boolean };
        if (!active) return;
        if (json.user) {
          router.replace(next.startsWith("/") ? next : "/eventos");
          return;
        }
        setSetupRequired(Boolean(json.setupRequired));
      } catch {
        if (active) setError("Não foi possível verificar o acesso.");
      } finally {
        if (active) setChecking(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [next, router]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (setupRequired && password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setWorking(true);
    try {
      const res = await fetch(setupRequired ? "/api/auth/setup" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          setupRequired ? { name, username, password } : { username, password },
        ),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error || "Não foi possível entrar.");
        return;
      }
      router.replace(next.startsWith("/") ? next : "/eventos");
      router.refresh();
    } catch {
      setError("Não foi possível entrar. Tente de novo.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-lg border border-forest/10 bg-cream p-8">
      <CasaBragaMark onLight />
      {checking ? (
        <p className="mt-8 text-sm text-forest/50">Verificando acesso…</p>
      ) : (
        <>
      <p className="mt-6 text-[13px] font-medium text-forest/50">
        {setupRequired ? "Primeiro acesso" : "Entrar"}
      </p>
      <h1 className="page-title mt-1">
        {setupRequired ? "Criar usuário de Gestão" : "Acesso à casa"}
      </h1>
      <p className="mt-2 text-sm text-forest/60">
        {setupRequired
          ? "Ainda não há usuários. Crie o primeiro acesso de Gestão para abrir o sistema."
          : "Entre com o usuário e a senha cadastrados em Configurações do Sistema."}
      </p>

        <form className="mt-8 space-y-4" onSubmit={submit}>
          {setupRequired ? (
            <Field label="Nome">
              <input
                className={fieldControlClass}
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                required
              />
            </Field>
          ) : null}
          <Field label="Usuário">
            <input
              className={fieldControlClass}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </Field>
          <PasswordField
            label="Senha"
            value={password}
            onChange={setPassword}
            autoComplete={setupRequired ? "new-password" : "current-password"}
            minLength={setupRequired ? 8 : undefined}
          />
          {setupRequired ? (
            <PasswordField
              label="Confirmar senha"
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
              minLength={8}
            />
          ) : null}
          {error ? <p className="text-sm text-terracotta">{error}</p> : null}
          <Button
            type="submit"
            disabled={working}
            className="h-11 w-full bg-forest text-cream hover:bg-petrol"
          >
            {working ? "Entrando…" : setupRequired ? "Criar acesso" : "Entrar"}
          </Button>
        </form>
        </>
      )}
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label}>
      <div className="relative">
        <input
          className={cn(fieldControlClass, "pr-11")}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          required
          minLength={minLength}
        />
        <button
          type="button"
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visible}
          className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-forest/45 hover:text-forest"
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </Field>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md rounded-lg border border-forest/10 bg-cream p-8 text-sm text-forest/50">
          Carregando…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
