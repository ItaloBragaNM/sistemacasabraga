import { CasaBragaMark } from "@/components/brand/mark";

export function ComingSoon({
  moduleName,
  pageName,
}: {
  moduleName: string;
  pageName: string;
}) {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center text-center">
      <div className="mb-8 rounded-full border border-forest/10 bg-forest px-5 py-3">
        <CasaBragaMark compact />
      </div>
      <p className="font-section text-[0.72rem] text-terracotta">{moduleName}</p>
      <h1 className="font-display mt-3 text-5xl tracking-tight text-forest sm:text-6xl">
        {pageName}
      </h1>
      <p className="mt-6 max-w-md text-lg font-light leading-8 text-forest/70">
        Este módulo será desenvolvido em breve.
      </p>
      <p className="font-list mt-3 text-sm text-forest/50">
        Nesta primeira fase, a casa está validando o calendário e a ficha do
        evento — a base para comercial, cozinha, logística e financeiro.
      </p>
    </section>
  );
}
