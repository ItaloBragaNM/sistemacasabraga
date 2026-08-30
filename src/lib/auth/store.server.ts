import { uid } from "@/lib/event-factory";
import { readState, writeState } from "@/lib/store/kv.server";
import { isUserRole } from "./roles";
import { hashPassword } from "./password";
import type { AppUser, PublicUser, UserRole } from "./types";

const KEY = "users";
const FILE = "users.json";

export type UsersState = { users: AppUser[] };

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function isValidUsername(value: string) {
  return /^[a-z0-9._-]{3,32}$/.test(normalizeUsername(value));
}

function toPublicUser(user: AppUser): PublicUser {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function normalizeUser(input: Partial<AppUser>): AppUser | null {
  if (!input.id || !input.username || !input.passwordHash) return null;
  if (!input.role || !isUserRole(input.role)) return null;
  return {
    id: input.id,
    name: (input.name || input.username).trim(),
    username: normalizeUsername(input.username),
    role: input.role,
    passwordHash: input.passwordHash,
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: input.updatedAt || input.createdAt || new Date().toISOString(),
  };
}

export async function readUsers(): Promise<AppUser[]> {
  const stored = await readState<UsersState | AppUser[]>(KEY, FILE);
  const list = Array.isArray(stored) ? stored : stored?.users;
  if (!Array.isArray(list)) return [];
  return list.map(normalizeUser).filter((item): item is AppUser => Boolean(item));
}

async function writeUsers(users: AppUser[]) {
  await writeState<UsersState>(KEY, FILE, { users });
  return users;
}

export async function countUsers() {
  return (await readUsers()).length;
}

export async function findUserById(id: string) {
  return (await readUsers()).find((user) => user.id === id) ?? null;
}

export async function findUserByUsername(username: string) {
  const normalized = normalizeUsername(username);
  return (await readUsers()).find((user) => user.username === normalized) ?? null;
}

export async function listPublicUsers(): Promise<PublicUser[]> {
  return (await readUsers())
    .map(toPublicUser)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export async function createUser(input: {
  name: string;
  username: string;
  password: string;
  role: UserRole;
}) {
  const name = input.name.trim();
  const username = normalizeUsername(input.username);
  if (!name) throw new Error("Informe o nome.");
  if (!isValidUsername(username)) {
    throw new Error("O usuário deve ter 3 a 32 caracteres (letras, números, ponto, hífen ou underline).");
  }
  if (input.password.length < 8) throw new Error("A senha deve ter pelo menos 8 caracteres.");

  const users = await readUsers();
  if (users.some((user) => user.username === username)) {
    throw new Error("Já existe um usuário com este login.");
  }

  const now = new Date().toISOString();
  const created: AppUser = {
    id: uid(),
    name,
    username,
    role: input.role,
    passwordHash: await hashPassword(input.password),
    createdAt: now,
    updatedAt: now,
  };
  await writeUsers([...users, created]);
  return toPublicUser(created);
}

export async function updateUser(
  id: string,
  patch: { name?: string; role?: UserRole; password?: string },
) {
  const users = await readUsers();
  const index = users.findIndex((user) => user.id === id);
  if (index < 0) throw new Error("Usuário não encontrado.");

  const current = users[index];
  const nextRole = patch.role ?? current.role;
  if (current.role === "gestao" && nextRole !== "gestao") {
    const gestaoCount = users.filter((user) => user.role === "gestao").length;
    if (gestaoCount <= 1) throw new Error("Mantenha pelo menos um usuário de Gestão.");
  }

  if (patch.password && patch.password.length < 8) {
    throw new Error("A senha deve ter pelo menos 8 caracteres.");
  }

  const next: AppUser = {
    ...current,
    name: patch.name?.trim() || current.name,
    role: nextRole,
    passwordHash: patch.password ? await hashPassword(patch.password) : current.passwordHash,
    updatedAt: new Date().toISOString(),
  };
  const copy = [...users];
  copy[index] = next;
  await writeUsers(copy);
  return toPublicUser(next);
}

export async function deleteUser(id: string, actorId: string) {
  if (id === actorId) throw new Error("Você não pode excluir o próprio acesso.");
  const users = await readUsers();
  const target = users.find((user) => user.id === id);
  if (!target) throw new Error("Usuário não encontrado.");
  if (target.role === "gestao") {
    const gestaoCount = users.filter((user) => user.role === "gestao").length;
    if (gestaoCount <= 1) throw new Error("Mantenha pelo menos um usuário de Gestão.");
  }
  await writeUsers(users.filter((user) => user.id !== id));
}

export { toPublicUser };
