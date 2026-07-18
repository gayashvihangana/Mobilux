import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

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
  const isAuthPage = ["/login", "/register"].includes(nextUrl.pathname);

  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(
      new URL(user.role === "ADMIN" ? "/admin" : "/dashboard", nextUrl),
    );
  }

  if ((isAdminArea || isCustomerArea) && !isLoggedIn) {
    const login = new URL("/login", nextUrl);
    login.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(login);
  }

  if (isAdminArea && user?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
