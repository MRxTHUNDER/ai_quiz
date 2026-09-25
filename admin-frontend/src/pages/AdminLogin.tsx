import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { axiosInstance } from "@/lib/axios";
import { Eye, EyeOff } from "lucide-react";

// Using shadcn/ui components (to be installed)
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function AdminLogin() {
  const login = useAuthStore((s) => s.login);
  const isLoggingIn = useAuthStore((s) => s.isLoggingIn);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login({ email, password, adminPassword });
  };

  const onPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetMessage("");
    try {
      await axiosInstance.post("/auth/password-reset", {
        email,
        role: "admin",
        ...(otpSent ? { otp, newPassword } : {}),
      });
      if (otpSent) {
        setResetMessage("Password reset successfully. You can now sign in.");
        setForgotPassword(false);
        setOtpSent(false);
        setOtp("");
        setNewPassword("");
      } else {
        setOtpSent(true);
        setResetMessage("Email exists. An OTP was sent to your email.");
      }
    } catch (err: any) {
      setResetMessage(err.response?.data?.message || "Unable to reset password");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-6">
      <Card className="w-full max-w-xl p-8 shadow-lg">
        <CardHeader className="space-y-2 pb-6 items-center">
          <CardTitle className="text-3xl font-semibold">Admin Login</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {forgotPassword ? <form className="space-y-6" onSubmit={onPasswordReset}>
            <p className="text-sm text-muted-foreground">Enter your admin email to receive an OTP.</p>
            <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 text-base" />
            {otpSent && <>
              <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit OTP" required className="h-12 text-base" />
              <Input type="password" minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" required className="h-12 text-base" />
            </>}
            {resetMessage && <p className="text-sm text-blue-600">{resetMessage}</p>}
            <Button type="submit" className="h-12 w-full text-base" disabled={resetLoading}>{resetLoading ? "Please wait..." : otpSent ? "Reset Password" : "Send OTP"}</Button>
            <button type="button" onClick={() => { setForgotPassword(false); setResetMessage(""); }} className="w-full text-sm underline">Back to login</button>
          </form> : <form className="space-y-6" onSubmit={onSubmit}>
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
                  placeholder="Enter your password"
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
              disabled={isLoggingIn}
            >
              {isLoggingIn ? "Logging in..." : "Login"}
            </Button>
            <button type="button" onClick={() => setForgotPassword(true)} className="w-full text-sm underline">Forgot password?</button>
          </form>}

          <p className="mt-6 text-center text-base">
            Don&apos;t have an account?{" "}
            <Link className="underline" to="/signup">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminLogin;
