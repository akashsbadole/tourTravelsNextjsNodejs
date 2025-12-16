import createMiddleware from 'next-intl/middleware';
import authConfig from "./auth.config";
import NextAuth from "next-auth";
import { NextResponse } from "next/server";
const { auth } = NextAuth(authConfig);

// Configure next-intl middleware
const intlMiddleware = createMiddleware({
  // A list of all locales that are supported
  locales: ['en', 'es', 'fr', 'de', 'zh', 'ja', 'ar', 'hi'],
  
  // Used when no locale matches
  defaultLocale: 'en',
  
  // Optional: Configure path prefix
  localePrefix: 'as-needed', // Default is 'always'
  
  // Optional: Configure locale detection
  localeDetection: true
});

export default auth(async (req) => {
  // Run internationalization middleware first
  const intlResponse = intlMiddleware(req);
  
  // Then run auth middleware
  const response = intlResponse || NextResponse.next();
  response.headers.set("x-pathname", req.nextUrl.pathname);
  response.headers.set("x-url", req.nextUrl.href);
  return response;
});

export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/(es|fr|de|zh|ja|ar|hi)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)']
};