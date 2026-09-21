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
      <CasaBragaMark onLight />
      <p className="mt-6 text-[13px] font-medium text-forest/50">{moduleName}</p>
      <h1 className="page-title mt-2">{pageName}</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-forest/60">
        Este módulo será desenvolvido em breve.
      </p>
    </section>
  );
}
