import { NextResponse } from "next/server";

// Gate the demo app: no session cookie → role chooser. (Prototype only, not real auth.)
export function proxy(request) {
  if (!request.cookies.get("sirh_session")) {
    const url = request.nextUrl.clone();
    url.pathname = "/demo";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/app/:path*"] };
