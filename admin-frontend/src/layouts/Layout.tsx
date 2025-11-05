import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/Sidebar";

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  const authUser = useAuthStore((s) => s.authUser);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const onLogout = async () => {
    await logout();
    navigate("/login");
  };
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <Link to="/" className="font-semibold">
          Admin
        </Link>
        <div className="flex items-center gap-2">
          {!authUser ? (
            <div className="flex items-center gap-2">
              <Link className="underline text-sm" to="/login">
                Login
              </Link>
              <Link className="underline text-sm" to="/signup">
                Signup
              </Link>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={onLogout}>
              Logout
            </Button>
          )}
        </div>
      </header>
      {authUser && (
        <div className="flex">
          <Sidebar />
          <main className="flex-1">{children}</main>
        </div>
      )}
      {!authUser && <main>{children}</main>}
    </div>
  );
}

export default Layout;
