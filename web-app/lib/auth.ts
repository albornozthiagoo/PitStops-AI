import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/lib/auth.config";
import { prisma } from "@/lib/prisma";
import { verifyPassword, verifyDummyPassword } from "@/lib/auth/password";
import { excedioIntentos, registrarIntentoFallido, limpiarIntentos } from "@/lib/auth/rate-limit";

// `code` es lo único de un error de authorize() que llega al cliente (ver
// next-auth/react signIn()) — el mensaje de `message` nunca se expone, así
// que para distinguir "demasiados intentos" de "credenciales inválidas" en
// el form de login hace falta esta subclase con un `code` propio.
class DemasiadosIntentos extends CredentialsSignin {
  code = "demasiados_intentos";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        legajo: {},
        password: {},
      },
      async authorize(credentials) {
        const legajo = typeof credentials?.legajo === "string" ? credentials.legajo.trim() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!legajo || !password) return null;

        // Rate limit por legajo, no por IP: en este MVP el taller entero
        // suele salir por la misma IP (NAT), así que limitar por IP
        // bloquearía a todo el mundo por los errores de uno solo.
        if (excedioIntentos(legajo)) {
          throw new DemasiadosIntentos();
        }

        const tecnico = await prisma.tecnico.findUnique({
          where: { legajo },
          include: { taller: true },
        });

        // Si el legajo no existe, igual corremos un verify() contra un hash
        // dummy antes de devolver null — así el tiempo de respuesta no
        // delata si la cuenta existe o no (mitigación de user enumeration).
        const passwordOk = tecnico
          ? await verifyPassword(tecnico.passwordHash, password)
          : await verifyDummyPassword(password);

        if (!tecnico || !passwordOk) {
          registrarIntentoFallido(legajo);
          return null;
        }

        limpiarIntentos(legajo);

        return {
          id: tecnico.id,
          legajo: tecnico.legajo,
          name: tecnico.nombre,
          email: tecnico.email,
          iniciales: tecnico.iniciales,
          rol: tecnico.rol,
          tallerId: tecnico.tallerId,
          tallerNombre: tecnico.taller.nombre,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user) {
        token.legajo = user.legajo;
        token.iniciales = user.iniciales;
        token.rol = user.rol;
        token.tallerId = user.tallerId;
        token.tallerNombre = user.tallerNombre;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub!;
      session.user.legajo = token.legajo;
      session.user.iniciales = token.iniciales;
      session.user.rol = token.rol;
      session.user.tallerId = token.tallerId;
      session.user.tallerNombre = token.tallerNombre;
      return session;
    },
  },
});
