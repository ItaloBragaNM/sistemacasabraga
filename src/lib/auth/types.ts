export const USER_ROLES = [
  "gestao",
  "comercial",
  "logistica",
  "gerencia",
  "financeiro",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type AppUser = {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};

export type PublicUser = Omit<AppUser, "passwordHash">;

export type SessionPayload = {
  sub: string;
  username: string;
  name: string;
  role: UserRole;
  iat: number;
  exp: number;
};
