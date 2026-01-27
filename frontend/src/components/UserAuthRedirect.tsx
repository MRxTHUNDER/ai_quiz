import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

const UserAuthRedirect = ({ children }: { children: React.ReactNode }) => {
  const authUser = useAuthStore((s) => s.authUser);
  const isCheckingAuth = useAuthStore((s) => s.isCheckingAuth);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isCheckingAuth && authUser) {
      navigate("/dashboard", { replace: true });
    }
  }, [authUser, isCheckingAuth, navigate]);

  if (isCheckingAuth) {
    return <div className="p-6">Loading...</div>;
  }

  return <>{children}</>;
};

export default UserAuthRedirect;

