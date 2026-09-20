import Link from "next/link";

export default function SemAcessoPage() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center">
      <p className="text-[13px] font-medium text-forest/50">Acesso</p>
      <h1 className="page-title mt-2">Sem permissão neste módulo</h1>
      <p className="mt-4 text-sm leading-6 text-forest/65">
        Seu tipo de usuário não inclui esta área. Volte ao calendário ou peça à
        Gestão para ajustar o cadastro.
      </p>
      <Link
        href="/eventos"
        className="mt-8 inline-flex h-10 w-fit items-center rounded-lg bg-forest px-4 text-sm text-cream hover:bg-petrol"
      >
        Ir para Eventos
      </Link>
    </section>
  );
}
