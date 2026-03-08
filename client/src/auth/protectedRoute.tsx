import React from "react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthContext } from "../Context/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  redirectTo = "/login",
}) => {
  const { isAuthenticated, loading, userId } = useAuthContext();
  const location = useLocation();
  
  // Debug logging
  console.log('🛡️ ProtectedRoute:', { loading, isAuthenticated, userId });

  // If still loading after 3 seconds, force render to avoid infinite loading
  const [forceShow, setForceShow] = React.useState(false);
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.warn('⚠️ Force showing content after timeout');
        setForceShow(true);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading && !forceShow) {
    return <LoadingScreen />;
  }

  // If user is logged in, show content even if still loading (fallback)
  if (isAuthenticated || forceShow) {
    return <>{children}</>;
  }

  return <Navigate to={redirectTo} state={{ from: location }} replace />;
};

// ── Loading screen shown while session is being checked ────
const LoadingScreen: React.FC = () => (
  <div style={{
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0d0f1a",
    color: "rgba(255,255,255,0.4)",
    fontFamily: "'DM Sans', sans-serif",
    gap: "12px",
    fontSize: "15px",
  }}>
    <span style={{
      width: 20,
      height: 20,
      border: "2px solid rgba(255,255,255,0.15)",
      borderTopColor: "#5680E9",
      borderRadius: "50%",
      display: "inline-block",
      animation: "spin 0.7s linear infinite",
    }} />
    Checking session…
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

export default ProtectedRoute;