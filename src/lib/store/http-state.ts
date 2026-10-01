import { NextResponse } from "next/server";
import { unwrapPutPayload } from "@/lib/store/sync";

export function jsonState<T>(data: T, updatedAt: string | null) {
  return NextResponse.json({ data, updatedAt });
}

export function jsonConflict<T>(data: T, updatedAt: string) {
  return NextResponse.json({ error: "conflict", data, updatedAt }, { status: 409 });
}

export async function parseStatePut(request: Request) {
  const payload = await request.json();
  return unwrapPutPayload(payload);
}
