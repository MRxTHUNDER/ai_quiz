import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { Eye, EyeOff } from "lucide-react";

// Using shadcn/ui components (to be installed)
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function AdminSignup() {
  const signup = useAuthStore((s) => s.signup);
  const isSigningUp = useAuthStore((s) => s.isSigningUp);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signup({ firstName, lastName, email, password, adminPassword });
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-6">
      <Card className="w-full max-w-xl p-8 shadow-lg">
        <CardHeader className="space-y-2 pb-6 items-center">
          <CardTitle className="text-3xl font-semibold">Admin Signup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form className="space-y-6" onSubmit={onSubmit}>
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-3">
                <Label htmlFor="firstName" className="text-base">
                  First name
                </Label>
                <Input
                  id="firstName"
                placeholder="Enter first name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="lastName" className="text-base">
                  Last name
                </Label>
                <Input
                  id="lastName"
                placeholder="Enter last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-12 text-base"
                />
              </div>
            </div>
            <div className="space-y-3">
              <Label htmlFor="email" className="text-base">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="password" className="text-base">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 pr-12 text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <Label htmlFor="adminPassword" className="text-base">
                Admin Secret
              </Label>
              <div className="relative">
                <Input
                  id="adminPassword"
                  type={showAdminPassword ? "text" : "password"}
                  placeholder="Enter admin secret"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                  className="h-12 pr-12 text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-label={
                    showAdminPassword ? "Hide admin secret" : "Show admin secret"
                  }
                >
                  {showAdminPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="h-12 w-full text-base"
              disabled={isSigningUp}
            >
              {isSigningUp ? "Creating..." : "Create admin"}
            </Button>
          </form>

          <p className="mt-6 text-center text-base">
            Already have an account?{" "}
            <Link className="underline" to="/login">
              Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminSignup;
