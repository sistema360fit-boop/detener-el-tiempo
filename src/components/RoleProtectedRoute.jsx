/**
 * Componente de protección de rutas por rol
 * Envuelve cualquier página y verifica que el usuario tenga permiso para acceder
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { canAccessPage, getDefaultPage, getCurrentUser } from "@/lib/roles";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RoleProtectedRoute({ children, pageName }) {
  const navigate = useNavigate();
  const user = getCurrentUser();

  useEffect(() => {
    // Si no hay usuario, redirigir a login
    if (!user) {
      navigate(createPageUrl("Acceso"));
      return;
    }

    // Verificar permiso para esta página
    if (!canAccessPage(pageName, user.rol)) {
      // Redirigir a la página designada del rol
      const defaultPage = getDefaultPage(user.rol);
      navigate(createPageUrl(defaultPage));
    }
  }, [user, pageName, navigate]);

  // Si no hay usuario o no tiene permiso, no renderizar nada
  // (el useEffect redirigirá)
  if (!user || !canAccessPage(pageName, user.rol)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Acceso Denegado
          </h1>
          <p className="text-gray-600 mb-6">
            No tienes permiso para acceder a esta página.
          </p>
          <Button 
            onClick={() => navigate(createPageUrl(getDefaultPage(user?.rol)))}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a mi sección
          </Button>
        </div>
      </div>
    );
  }

  return children;
}
