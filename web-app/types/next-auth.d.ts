import type { DefaultSession } from "next-auth";
import type { RolTecnico } from "@/generated/prisma/client";

// Módulo augmentation: los campos que agregamos en los callbacks jwt/session
// de lib/auth.ts (ver ahí) no existen en los tipos default de next-auth.
declare module "next-auth" {
  interface User {
    legajo: string;
    iniciales: string;
    rol: RolTecnico;
    tallerId: string;
    tallerNombre: string;
  }

  interface Session {
    user: {
      id: string;
      legajo: string;
      iniciales: string;
      rol: RolTecnico;
      tallerId: string;
      tallerNombre: string;
    } & DefaultSession["user"];
  }
}

// `next-auth/jwt.d.ts` re-exporta `JWT` de `@auth/core/jwt` con
// `export * from`, y los callbacks internos de `@auth/core` (los que de
// verdad tipan el `token` que llega a jwt()/session() en lib/auth.ts)
// importan `JWT` directo de `@auth/core/jwt` — un `declare module
// "next-auth/jwt"` no hace merge ahí (limitación conocida de TS con
// `export *`). Hay que augmentar el módulo de origen.
declare module "@auth/core/jwt" {
  interface JWT {
    legajo: string;
    iniciales: string;
    rol: RolTecnico;
    tallerId: string;
    tallerNombre: string;
  }
}
