import { NextResponse, type NextRequest } from "next/server";
import { canAccessModule, isPublicPath, moduleIdFromPath } from "@/lib/auth/roles";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth/session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const payload = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (isPublicPath(pathname)) {
    if (payload && pathname === "/login") {
      return NextResponse.redirect(new URL("/eventos", request.url));
    }
    return NextResponse.next();
  }

  if (!payload) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });
    }
    const login = new URL("/login", request.url);
    if (pathname !== "/") login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  const moduleId = moduleIdFromPath(pathname);
  if (moduleId && !canAccessModule(payload.role, moduleId)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Você não tem acesso a este módulo." },
        { status: 403 },
      );
    }
    return NextResponse.redirect(new URL("/sem-acesso", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
