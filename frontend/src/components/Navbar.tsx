import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Zap, User, LogOut } from "lucide-react";
import Button from "./Button";
import { useAuthStore } from "../store/useAuthStore";
import { getUIFlags, type UIFlags } from "../lib/uiFlags";

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [uiFlags, setUiFlags] = useState<UIFlags>({ questionsPageEnabled: true });
  const location = useLocation();
  const navigate = useNavigate();
  const { authUser, logout, checkAuth, isCheckingAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
    loadUIFlags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const navItems = [
    { name: "Home", path: "/" },
    { name: "Contact", path: "/contact" },
    { name: "Dashboard", path: "/dashboard" },
  ];

  // Additional nav items only for authenticated users
  // Only show Questions if it's enabled
  const authNavItems = uiFlags.questionsPageEnabled
    ? [{ name: "Questions", path: "/questions" }]
    : [];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="p-2 bg-blue-600 rounded-lg group-hover:bg-blue-700 transition-colors">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">
              Quiz Genius AI
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-700 hover:text-blue-600"
                }`}
              >
                {item.name}
              </Link>
            ))}
            {authUser &&
              authNavItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-700 hover:text-blue-600"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            {!isCheckingAuth && (
              <>
                {authUser ? (
                  <div className="flex items-center space-x-4 ml-4">
                    <span className="text-sm text-gray-700">
                      {authUser.firstname || authUser.email}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await logout();
                        navigate("/login");
                      }}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate("/login")}
                    >
                      Sign In
                    </Button>
                    <Button size="sm" onClick={() => navigate("/signup")}>
                      <User className="h-4 w-4 mr-2" />
                      Sign Up
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md text-gray-700 hover:text-blue-600 hover:bg-gray-100 transition-colors"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-100 py-4">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsMenuOpen(false)}
                className={`block px-4 py-2 text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                }`}
              >
                {item.name}
              </Link>
            ))}
            {authUser &&
              authNavItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block px-4 py-2 text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? "text-blue-600 bg-blue-50"
                      : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            {!isCheckingAuth && (
              <div className="px-4 pt-4 space-y-3 border-t border-gray-100 mt-4">
                {authUser ? (
                  <>
                    <div className="px-4 py-2 text-sm text-gray-700">
                      {authUser.firstname || authUser.email}
                    </div>
                    <button
                      onClick={async () => {
                        setIsMenuOpen(false);
                        await logout();
                        navigate("/login");
                      }}
                      className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 border-2 border-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate("/login");
                      }}
                      className="w-full px-4 py-2 text-sm font-medium text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate("/signup");
                      }}
                      className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Sign Up
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
