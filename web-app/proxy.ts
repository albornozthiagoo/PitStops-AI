import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

// Postura "deny by default": todo lo que matchea el `config.matcher` de más
// abajo requiere sesión, salvo la lista explícita de acá. Así una ruta nueva
// que alguien agregue mañana queda protegida automáticamente sin tener que
// acordarse de sumarla a un allow-list de rutas protegidas.
const RUTAS_PUBLICAS = ["/login"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const esPublica =
    RUTAS_PUBLICAS.includes(pathname) ||
    pathname.startsWith("/api/auth") ||
    // El webhook de Telegram se autentica con TELEGRAM_WEBHOOK_SECRET (ver
    // app/api/webhooks/telegram/route.ts), no con sesión de técnico.
    pathname.startsWith("/api/webhooks");

  if (esPublica) {
    if (req.auth && pathname === "/login") {
      return Response.redirect(new URL("/dashboard", req.nextUrl.origin));
    }
    return;
  }

  if (!req.auth) {
    // A una API sin sesión hay que devolverle un 401 limpio, no un redirect:
    // un `fetch()` por default sigue el redirect y termina "viendo" la
    // página HTML de /login con status 200 — el caller nunca se entera de
    // que en realidad no estaba autenticado.
    if (pathname.startsWith("/api")) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }
    return Response.redirect(new URL("/login", req.nextUrl.origin));
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
