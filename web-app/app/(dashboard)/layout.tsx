import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // El middleware (middleware.ts) ya redirige a /login sin sesión — esto es
  // una segunda capa de defensa por si algún día el matcher del middleware
  // deja de cubrir alguna ruta de este grupo.
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          nombre={session.user.name ?? session.user.legajo}
          iniciales={session.user.iniciales}
          rol={session.user.rol}
          tallerNombre={session.user.tallerNombre}
        />
        <div className="flex-1 min-h-0">{children}</div>
      </div>
    </div>
  );
}
