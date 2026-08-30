"use client";

import { useParams } from "next/navigation";
import { SeparacaoMateriaisEvent } from "@/components/logistica/separacao-materiais";

export default function Page() {
  const params = useParams<{ id: string }>();
  return <SeparacaoMateriaisEvent eventId={params.id} />;
}
