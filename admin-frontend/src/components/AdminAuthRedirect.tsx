import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";

const AdminAuthRedirect = ({ children }: { children: React.ReactNode }) => {
  const authUser = useAuthStore((s) => s.authUser);
  const isCheckingAuth = useAuthStore((s) => s.isCheckingAuth);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isCheckingAuth && authUser) {
      navigate("/questions", { replace: true });
    }
  }, [authUser, isCheckingAuth, navigate]);

  if (isCheckingAuth) {
    return <div className="p-6">Loading...</div>;
  }

  return <>{children}</>;
};

export default AdminAuthRedirect;

