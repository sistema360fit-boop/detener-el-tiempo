/**
 * Componente de protección de rutas por rol
 * Envuelve cualquier página y verifica que el usuario tenga permiso para acceder
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { canAccessPage, getDefaultPage, getCurrentUser } from "@/lib/roles";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RoleProtectedRoute({ children, pageName }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Obtener usuario del localStorage
    const currentUser = getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (loading || !user) return;

    // Verificar permiso para esta página
    const hasAccess = canAccessPage(pageName, user.rol);
    
    if (!hasAccess) {
      // Intentar con la página por defecto del rol
      const defaultPage = getDefaultPage(user.rol);
      const defaultHasAccess = canAccessPage(defaultPage, user.rol);
      
      // Si la página por defecto tampoco tiene acceso, usar Home
      const targetPage = defaultHasAccess ? defaultPage : 'Home';
      navigate(createPageUrl(targetPage), { replace: true });
    }
  }, [user, pageName, navigate, loading]);

  // Mientras carga, no mostrar nada
  if (loading) {
    return null;
  }

  // Si no hay usuario, no renderizar nada (el otro useEffect redirigirá)
  if (!user) {
    return null;
  }

  // Verificación final antes de renderizar
  if (!canAccessPage(pageName, user.rol)) {
    const defaultPage = getDefaultPage(user.rol);
    const defaultHasAccess = canAccessPage(defaultPage, user.rol);
    const targetPage = defaultHasAccess ? defaultPage : 'Home';
    
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
            onClick={() => navigate(createPageUrl(targetPage), { replace: true })}
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
