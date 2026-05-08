import { type NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    const isAuthPage =
      request.nextUrl.pathname === "/login" ||
      request.nextUrl.pathname === "/signup";

    if (isAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/form";
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  const { updateSession } = await import("@/lib/supabase/middleware");
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon.png|apple-touch-icon.png|manifest.json|sw.js|icons/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
