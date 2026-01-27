import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Layout from "./layouts/Layout";
import Home from "./pages/Home";
import Contact from "./pages/Contact";
import Dashboard from "./pages/Dashboard";
import StartTest from "./pages/StartTest";
import Tests from "./pages/Tests";
import TakeTest from "./pages/TakeTest";
import TestResult from "./pages/TestResult";
import Signup from "./pages/Signup";
import Signin from "./pages/Signin";
import Questions from "./pages/Questions";
import { useAuthStore } from "./store/useAuthStore";
import UserAuthRedirect from "./components/UserAuthRedirect";
import ProtectedRoute from "./components/ProtectedRoute";
import { getUIFlags, type UIFlags } from "./lib/uiFlags";

function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const [uiFlags, setUiFlags] = useState<UIFlags>({ questionsPageEnabled: true });

  useEffect(() => {
    checkAuth();
    loadUIFlags();
  }, [checkAuth]);

  const loadUIFlags = async () => {
    try {
      const flags = await getUIFlags();
      setUiFlags(flags);
    } catch (error) {
      console.error("Error loading UI flags:", error);
      // Default to enabled if error
      setUiFlags({ questionsPageEnabled: true });
    }
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/signup"
          element={
            <UserAuthRedirect>
              <Signup />
            </UserAuthRedirect>
          }
        />
        <Route
          path="/login"
          element={
            <UserAuthRedirect>
              <Signin />
            </UserAuthRedirect>
          }
        />
        <Route
          path="/*"
          element={
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/contact" element={<Contact />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/start-test"
                  element={
                    <ProtectedRoute>
                      <StartTest />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/test"
                  element={
                    <ProtectedRoute>
                      <Tests />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/test/available"
                  element={
                    <ProtectedRoute>
                      <Tests />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/test/:testId/take"
                  element={
                    <ProtectedRoute>
                      <TakeTest />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/test/:attemptId/result"
                  element={
                    <ProtectedRoute>
                      <TestResult />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/questions"
                  element={
                    uiFlags.questionsPageEnabled ? (
                      <ProtectedRoute>
                        <Questions />
                      </ProtectedRoute>
                    ) : (
                      <Navigate to="/dashboard" replace />
                    )
                  }
                />
                <Route
                  path="/upload-pdf"
                  element={
                    uiFlags.questionsPageEnabled ? (
                      <ProtectedRoute>
                        <Questions />
                      </ProtectedRoute>
                    ) : (
                      <Navigate to="/dashboard" replace />
                    )
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
