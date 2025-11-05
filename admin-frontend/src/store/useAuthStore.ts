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
      set({ authUser: res.data.user });
    } catch {
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
