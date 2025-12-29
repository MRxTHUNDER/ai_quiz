import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useEffect } from "react";
import Layout from "./layouts/Layout";
import AdminLogin from "@/pages/AdminLogin";
import AdminSignup from "@/pages/AdminSignup";
import ExamsManagement from "@/pages/ExamsManagement";
import UsersManagement from "@/pages/UsersManagement";
import UserDetails from "@/pages/UserDetails";
import { useAuthStore } from "@/store/useAuthStore";
import Questions from "./pages/Questions";

function Protected({ children }: { children: React.ReactNode }) {
  const authUser = useAuthStore((s) => s.authUser);
  const isCheckingAuth = useAuthStore((s) => s.isCheckingAuth);
  if (isCheckingAuth) {
    return <div className="p-6">Loading...</div>;
  }
  if (!authUser) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);
  return (
    <Router>
      <Routes>
        {/* Public routes without Layout */}
        <Route path="/login" element={<AdminLogin />} />
        <Route path="/signup" element={<AdminSignup />} />

        {/* Protected routes with Layout */}
        <Route
          path="/*"
          element={
            <Layout>
              <Routes>
                <Route path="" element={<Navigate to="/questions" replace />} />
                <Route
                  path="questions"
                  element={
                    <Protected>
                      <Questions />
                    </Protected>
                  }
                />
                <Route
                  path="exams"
                  element={
                    <Protected>
                      <ExamsManagement />
                    </Protected>
                  }
                />
                <Route
                  path="users"
                  element={
                    <Protected>
                      <UsersManagement />
                    </Protected>
                  }
                />
                <Route
                  path="users/:userId"
                  element={
                    <Protected>
                      <UserDetails />
                    </Protected>
                  }
                />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
