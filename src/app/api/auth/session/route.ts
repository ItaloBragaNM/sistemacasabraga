import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/server";
import { countUsers } from "@/lib/auth/store.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  const setupRequired = (await countUsers()) === 0;
  return NextResponse.json({ user, setupRequired });
}
