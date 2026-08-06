import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { homePathFor, isShopStaff } from "@/lib/permissions";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const user = req.auth?.user;
  const isLoggedIn = !!user;

  const isAdminArea = nextUrl.pathname.startsWith("/admin");
  const isCustomerArea =
    nextUrl.pathname.startsWith("/dashboard") ||
    nextUrl.pathname.startsWith("/repairs") ||
    nextUrl.pathname.startsWith("/orders") ||
    nextUrl.pathname.startsWith("/profile") ||
    nextUrl.pathname.startsWith("/bill");
  const isAuthPage = ["/login", "/register", "/staff/login"].includes(
    nextUrl.pathname,
  );
  // The marketing landing page is for visitors. Someone who is signed in
  // opening the bare domain (bookmark, home-screen shortcut, typed URL)
  // wants their own workspace, not the sales pitch.
  const isLanding = nextUrl.pathname === "/";

  if ((isAuthPage || isLanding) && isLoggedIn) {
    return NextResponse.redirect(new URL(homePathFor(user), nextUrl));
  }

  if ((isAdminArea || isCustomerArea) && !isLoggedIn) {
    // Send the shop team to their own entrance rather than the customer one.
    const login = new URL(isAdminArea ? "/staff/login" : "/login", nextUrl);
    login.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(login);
  }

  // Technicians belong in /admin too — which page they may open inside it is
  // decided by requirePermission, which can read the database. This is still
  // only the cheap first pass.
  if (isAdminArea && !isShopStaff(user)) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
