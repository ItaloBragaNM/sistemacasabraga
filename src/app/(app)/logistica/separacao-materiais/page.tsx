import { Suspense } from "react";
import { SeparacaoMateriais } from "@/components/logistica/separacao-materiais";

export default function Page() {
  return (
    <Suspense
      fallback={
        <p className="py-16 text-center text-sm font-light text-forest/50">Carregando…</p>
      }
    >
      <SeparacaoMateriais />
    </Suspense>
  );
}
