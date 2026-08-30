import Link from "next/link";

export default function SemAcessoPage() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center">
      <p className="font-section text-[0.68rem] text-terracotta">Acesso</p>
      <h1 className="font-display mt-2 text-4xl text-forest sm:text-5xl">
        Sem permissão neste módulo
      </h1>
      <p className="mt-4 text-sm font-light leading-6 text-forest/65">
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
