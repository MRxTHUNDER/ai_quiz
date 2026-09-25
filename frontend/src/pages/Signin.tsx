import { useState } from "react";
import { Link } from "react-router-dom";
import { Zap, Mail, Lock } from "lucide-react";
import Button from "../components/Button";
import { useAuthStore } from "../store/useAuthStore";
import { axiosInstance } from "../lib/axio";

function Signin() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const { login, isLoggingIn } = useAuthStore();
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetOtp, setResetOtp] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(formData);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetMessage("");
    try {
      await axiosInstance.post("/auth/password-reset", {
        email: formData.email,
        role: "user",
        ...(otpSent ? { otp: resetOtp, newPassword: resetNewPassword } : {}),
      });
      if (otpSent) {
        setResetMessage("Password reset successfully. You can now sign in.");
        setForgotPassword(false);
        setOtpSent(false);
        setResetOtp("");
        setResetNewPassword("");
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Header */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center space-x-2 mb-4">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              Quiz Genius AI
            </span>
          </Link>
          <h2 className="text-3xl font-bold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Sign up
            </Link>
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {forgotPassword ? (
            <form className="space-y-6" onSubmit={handlePasswordReset}>
              <p className="text-sm text-gray-600">Enter your email to receive an OTP.</p>
              <input type="email" required value={formData.email} onChange={handleInputChange} name="email" placeholder="Email address" className="block w-full px-3 py-3 border border-gray-300 rounded-lg" />
              {otpSent && <>
                <input required value={resetOtp} onChange={(e) => setResetOtp(e.target.value)} placeholder="6-digit OTP" className="block w-full px-3 py-3 border border-gray-300 rounded-lg" />
                <input required minLength={6} type="password" value={resetNewPassword} onChange={(e) => setResetNewPassword(e.target.value)} placeholder="New password" className="block w-full px-3 py-3 border border-gray-300 rounded-lg" />
              </>}
              {resetMessage && <p className="text-sm text-blue-600">{resetMessage}</p>}
              <Button type="submit" variant="primary" size="lg" className="w-full" disabled={resetLoading}>{resetLoading ? "Please wait..." : otpSent ? "Reset Password" : "Send OTP"}</Button>
              <button type="button" onClick={() => { setForgotPassword(false); setResetMessage(""); }} className="w-full text-sm text-blue-600">Back to sign in</button>
            </form>
          ) : <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
              >
                {isLoggingIn ? "Signing In..." : "Sign In"}
              </Button>
            </div>
            <button type="button" onClick={() => setForgotPassword(true)} className="text-sm text-blue-600 hover:text-blue-500">Forgot password?</button>
          </form>}
        </div>
      </div>
    </div>
  );
}

export default Signin;
