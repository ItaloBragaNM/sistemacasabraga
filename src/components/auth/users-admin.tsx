"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CadastrosHeader, EmptyBlock, LoadingBlock, Modal } from "@/components/cadastros/ui";
import { fieldControlClass, Field } from "@/components/events/field";
import { Button } from "@/components/ui/button";
import { ROLE_MODULES, USER_ROLE_LABELS } from "@/lib/auth/roles";
import { USER_ROLES, type PublicUser, type UserRole } from "@/lib/auth/types";
import { APP_MODULES } from "@/lib/modules";

function roleModulesLabel(role: UserRole) {
  const allowed = ROLE_MODULES[role];
  if (allowed === "*") return "Todos os módulos";
  return APP_MODULES.filter((mod) => allowed.includes(mod.id))
    .map((mod) => mod.label)
    .join(", ");
}

export function UsersAdmin() {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PublicUser | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/users", { cache: "no-store" });
    const json = (await res.json()) as { users?: PublicUser[]; error?: string };
    if (!res.ok) throw new Error(json.error || "Falha ao carregar usuários.");
    setUsers(json.users ?? []);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await load();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível carregar os usuários.");
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [load]);

  const sorted = useMemo(
    () => [...users].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [users],
  );

  const startNew = () => {
    setEditing(null);
    setOpen(true);
  };

  const remove = async (user: PublicUser) => {
    if (!window.confirm(`Excluir o acesso de ${user.name}?`)) return;
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Não foi possível excluir.");
      toast.success("Usuário excluído.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir.");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <CadastrosHeader
        eyebrow="Configurações do Sistema"
        title="Cadastro de Usuários"
        description="Crie os acessos da casa. O tipo de usuário define quais módulos aparecem no menu e o que cada pessoa pode abrir."
        action={
          <Button className="h-10 bg-forest px-5 text-cream hover:bg-petrol" onClick={startNew}>
            <Plus data-icon="inline-start" />
            Novo usuário
          </Button>
        }
      />

      {!ready ? (
        <LoadingBlock />
      ) : sorted.length === 0 ? (
        <EmptyBlock
          title="Nenhum usuário"
          description="Cadastre o time para cada pessoa entrar com usuário e senha."
          action={
            <Button className="bg-forest text-cream hover:bg-petrol" onClick={startNew}>
              <Plus data-icon="inline-start" />
              Novo usuário
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-forest/10 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-forest/10">
                <th className="field-label py-3 pl-5 font-normal">Nome</th>
                <th className="field-label py-3 font-normal">Usuário</th>
                <th className="field-label py-3 font-normal">Tipo</th>
                <th className="field-label py-3 font-normal">Módulos</th>
                <th className="field-label py-3 pr-5 text-right font-normal">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((user) => (
                <tr key={user.id} className="border-b border-forest/8 last:border-0">
                  <td className="py-3 pl-5 font-medium">{user.name}</td>
                  <td className="py-3 font-list text-forest/70">{user.username}</td>
                  <td className="py-3">{USER_ROLE_LABELS[user.role]}</td>
                  <td className="max-w-sm py-3 text-xs font-light text-forest/60">
                    {roleModulesLabel(user.role)}
                  </td>
                  <td className="py-3 pr-5">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        aria-label={`Editar ${user.name}`}
                        className="flex size-8 items-center justify-center rounded-lg text-forest/50 hover:bg-forest/5 hover:text-forest"
                        onClick={() => {
                          setEditing(user);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Excluir ${user.name}`}
                        className="flex size-8 items-center justify-center rounded-lg text-forest/40 hover:bg-terracotta/10 hover:text-terracotta"
                        onClick={() => remove(user)}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <UserForm
        key={open ? editing?.id ?? "new" : "closed"}
        open={open}
        user={editing}
        onClose={() => setOpen(false)}
        onSaved={async () => {
          setOpen(false);
          await load();
        }}
      />
    </div>
  );
}

function UserForm({
  open,
  user,
  onClose,
  onSaved,
}: {
  open: boolean;
  user: PublicUser | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(user?.name ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [role, setRole] = useState<UserRole>(user?.role ?? "comercial");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [working, setWorking] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password || !user) {
      if (password.length < 8) {
        toast.error("A senha deve ter pelo menos 8 caracteres.");
        return;
      }
      if (password !== confirm) {
        toast.error("As senhas não coincidem.");
        return;
      }
    }
    setWorking(true);
    try {
      const res = await fetch(user ? `/api/users/${user.id}` : "/api/users", {
        method: user ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          user
            ? { name, role, password: password.trim() || undefined }
            : { name, username, role, password },
        ),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Não foi possível salvar.");
      toast.success(user ? "Usuário atualizado." : "Usuário cadastrado.");
      await onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={user ? "Editar usuário" : "Novo usuário"}>
      <form className="space-y-4" onSubmit={submit}>
        <Field label="Nome">
          <input
            className={fieldControlClass}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </Field>
        <Field label="Usuário (login)">
          <input
            className={fieldControlClass}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required={!user}
            disabled={Boolean(user)}
            autoComplete="off"
          />
        </Field>
        <Field label="Tipo">
          <select
            className={fieldControlClass}
            value={role}
            onChange={(event) => setRole(event.target.value as UserRole)}
          >
            {USER_ROLES.map((item) => (
              <option key={item} value={item}>
                {USER_ROLE_LABELS[item]}
              </option>
            ))}
          </select>
        </Field>
        <p className="text-xs font-light text-forest/55">{roleModulesLabel(role)}</p>
        <Field label={user ? "Nova senha (opcional)" : "Senha"}>
          <input
            className={fieldControlClass}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={user ? undefined : 8}
            required={!user}
          />
        </Field>
        <Field label="Confirmar senha">
          <input
            className={fieldControlClass}
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
            required={!user || Boolean(password)}
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" className="h-10" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={working} className="h-10 bg-forest text-cream hover:bg-petrol">
            {working ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
