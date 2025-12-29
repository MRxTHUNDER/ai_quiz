import { create } from "zustand";
import { axiosInstance } from "../lib/axios";

export const useAuthStore = create<any>((set) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isCheckingAuth: true,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/admin/profile");
      if (res.data && res.data.user) {
        set({ authUser: res.data.user });
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
      set({ authUser: res.data.user });
      window.location.href = "/";
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data: any) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/admin/signin", data);
      set({ authUser: res.data.user });
      window.location.href = "/";
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
