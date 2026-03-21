import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";

export const useAuthStore = create<any>((set) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isCheckingAuth: true,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/admin/profile");
      const user = res.data?.data?.user || res.data?.user;
      if (user) {
        set({ authUser: user });
      } else {
        console.error("[checkAuth] Invalid response structure:", res.data);
        set({ authUser: null });
      }
    } catch (error: any) {
      console.error("[checkAuth] Error checking auth:", error);
      console.error("[checkAuth] Error response:", error.response?.data);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data: any) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/admin/signup", data);
      const user = res.data?.data?.user || res.data?.user;
      if (user) {
        set({ authUser: user });
        toast.success("Admin account created successfully");
        window.location.href = "/";
      } else {
        console.error("[signup] Invalid response structure:", res.data);
        toast.error("Signup failed. Please try again.");
      }
    } catch (err: any) {
      const message =
        err.response?.data?.message || "Signup failed. Please try again.";
      toast.error(message);
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data: any) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/admin/signin", data);
      const user = res.data?.data?.user || res.data?.user;
      if (user) {
        set({ authUser: user });
        toast.success("Signed in successfully");
        window.location.href = "/";
      } else {
        console.error("[login] Invalid response structure:", res.data);
        toast.error("Login failed. Please try again.");
      }
    } catch (err: any) {
      const message =
        err.response?.data?.message || "Invalid email or password.";
      toast.error(message);
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    await axiosInstance.post("/admin/logout");
    set({ authUser: null });
    window.location.href = "/login";
  },
}));
