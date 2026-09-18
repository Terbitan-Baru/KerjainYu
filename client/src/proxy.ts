import { NextRequest, NextResponse } from "next/server";
import { ROUTES } from "@/lib/routes";
import { callRefreshToken } from "@/lib/api/auth/refreshToken";

const PUBLIC_ROUTES = [ROUTES.LOGIN, ROUTES.REGISTER, ROUTES.LANDING];

// Middleware ini punya dua tanggung jawab:
//   1. Menolak akses ke halaman terproteksi kalau sama sekali tidak ada
//      cookie sesi (accessToken maupun refreshToken).
//   2. Kalau accessToken tidak ada (kemungkinan besar sudah habis masa
//      berlakunya di browser) tapi refreshToken ada, coba refresh DI SINI
//      dulu sebelum halaman dirender.
//
// Kenapa refresh harus terjadi di middleware, bukan di getSession()
// (Server Component, dipanggil dari layout.tsx)? Next.js App Router
// melarang cookies().set() dipanggil dari Server Component — cuma boleh
// dari Server Action atau Route Handler/Middleware. getSession() sempat
// mencoba melakukan refresh sendiri dan gagal secara diam-diam karena
// pelanggaran aturan ini.
//
// PENTING: middleware ini TIDAK melakukan decode JWT atau cek expired
// sendiri. Dia hanya cek APAKAH cookie accessToken itu ADA atau TIDAK.
// Keputusan "token ini valid atau sudah expired" sepenuhnya diserahkan ke
// backend lewat panggilan /auth/refresh (lihat lib/api/auth/refreshToken.ts).
// Ini sengaja dijaga supaya cuma ada SATU sumber kebenaran soal validitas
// token — backend — dan FE tidak perlu ikut menebak-nebak lewat decode JWT.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get("accessToken")?.value;
  const refreshToken = request.cookies.get("refreshToken")?.value;
  const hasSession = Boolean(accessToken || refreshToken);
  const isAuthRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  if (!hasSession && !isAuthRoute) {
    const loginUrl = new URL(ROUTES.LOGIN, request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!accessToken && refreshToken && !isAuthRoute) {
    const result = await callRefreshToken(`refreshToken=${refreshToken}`);

    if (!result.ok) {
      const loginUrl = new URL(ROUTES.LOGIN, request.url);
      loginUrl.searchParams.set("next", pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete("accessToken");
      response.cookies.delete("refreshToken");
      return response;
    }

    const requestHeaders = new Headers(request.headers);
    const newCookiePairs = result.setCookies.map((c) => c.split(";")[0]);
    const existingCookieHeader = requestHeaders.get("cookie") ?? "";
    const filteredExisting = existingCookieHeader
      .split(";")
      .map((c) => c.trim())
      .filter((c) => c && !c.startsWith("accessToken=") && !c.startsWith("refreshToken="));
    requestHeaders.set("cookie", [...filteredExisting, ...newCookiePairs].join("; "));

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    for (const setCookie of result.setCookies) {
      response.headers.append("Set-Cookie", setCookie);
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};