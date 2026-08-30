import { redirect } from "next/navigation";
import { CadastrosProvider } from "@/components/cadastros/cadastros-provider";
import { AppShell } from "@/components/layout/app-shell";
import { LogisticaProvider } from "@/components/logistica/logistica-provider";
import { getSessionUser } from "@/lib/auth/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <CadastrosProvider>
      <LogisticaProvider>
        <AppShell user={user}>{children}</AppShell>
      </LogisticaProvider>
    </CadastrosProvider>
  );
}
