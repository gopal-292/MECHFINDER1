import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = ["/", "/login", "/signup"];

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const pathname = nextUrl.pathname;

  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/register") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icons") ||
    pathname.match(/\.(png|jpg|jpeg|svg|ico|webp)$/);

  if (isPublic) {
    // Logged-in users shouldn't see login/signup again — bounce them to their dashboard.
    if (session?.user && (pathname === "/login" || pathname === "/signup")) {
      return NextResponse.redirect(
        new URL(homeForRole(session.user.role, session.user.mechanicApproved), nextUrl),
      );
    }
    return NextResponse.next();
  }

  if (!session?.user) {
    const url = new URL("/login", nextUrl);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  const role = session.user.role;
  const approved = session.user.mechanicApproved;

  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL(homeForRole(role, approved), nextUrl));
  }
  if (pathname.startsWith("/mechanic") && role !== "MECHANIC") {
    return NextResponse.redirect(new URL(homeForRole(role, approved), nextUrl));
  }
  if (pathname.startsWith("/dashboard") && role !== "USER") {
    return NextResponse.redirect(new URL(homeForRole(role, approved), nextUrl));
  }

  // Mechanics that aren't approved go to the pending screen.
  if (role === "MECHANIC" && !approved && pathname !== "/mechanic/pending") {
    return NextResponse.redirect(new URL("/mechanic/pending", nextUrl));
  }

  return NextResponse.next();
});

function homeForRole(
  role: "USER" | "MECHANIC" | "ADMIN",
  approved?: boolean,
) {
  if (role === "ADMIN") return "/admin";
  if (role === "MECHANIC") return approved ? "/mechanic/dashboard" : "/mechanic/pending";
  return "/dashboard";
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
