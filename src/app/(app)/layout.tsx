import { redirect } from "next/navigation";
import { CadastrosProvider } from "@/components/cadastros/cadastros-provider";
import { FichasTecnicasProvider } from "@/components/cozinha/fichas-tecnicas-provider";
import { AppShell } from "@/components/layout/app-shell";
import { LogisticaProvider } from "@/components/logistica/logistica-provider";
import { MaoDeObraProvider } from "@/components/mao-de-obra/mao-de-obra-provider";
import { VeiculosUsoProvider } from "@/components/veiculos/veiculos-uso-provider";
import { getSessionUser } from "@/lib/auth/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <CadastrosProvider>
      <LogisticaProvider>
        <VeiculosUsoProvider>
          <MaoDeObraProvider>
            <FichasTecnicasProvider>
              <AppShell user={user}>{children}</AppShell>
            </FichasTecnicasProvider>
          </MaoDeObraProvider>
        </VeiculosUsoProvider>
      </LogisticaProvider>
    </CadastrosProvider>
  );
}
