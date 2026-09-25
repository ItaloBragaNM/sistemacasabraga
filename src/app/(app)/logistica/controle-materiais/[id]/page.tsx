"use client";

import { useParams } from "next/navigation";
import { ControleMateriaisEvento } from "@/components/logistica/controle-materiais";

export default function Page() {
  const params = useParams<{ id: string }>();
  return <ControleMateriaisEvento eventId={params.id} />;
}
