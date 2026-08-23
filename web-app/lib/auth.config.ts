import type { NextAuthConfig } from "next-auth";

// Config edge-safe: sin imports de Prisma/argon2 (Prisma usa el driver `pg`
// por debajo, que no corre en el runtime Edge de middleware.ts). Solo lo que
// necesita el middleware para decidir si dejar pasar una request o mandarla
// a /login. El provider Credentials (que sí toca Prisma/argon2) se agrega
// en lib/auth.ts, que corre en runtime Node vía el route handler.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    // 12hs cubre un turno de trabajo. `updateAge` más corto que `maxAge`
    // para que el uso activo renueve la sesión antes de que expire.
    maxAge: 60 * 60 * 12,
    updateAge: 60 * 60,
  },
  providers: [],
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
