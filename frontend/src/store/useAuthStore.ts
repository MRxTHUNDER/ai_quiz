import { create } from "zustand";
import { axiosInstance } from "../lib/axio";

export const useAuthStore = create<any>((set) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/user/profile");
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
      const res = await axiosInstance.post("/user/signup", data);
      set({ authUser: res.data.user });
      window.location.href = "/";
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data: any) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/user/signin", data);
      set({ authUser: res.data.user });
      window.location.href = "/";
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    await axiosInstance.post("/user/logout");
    set({ authUser: null });
    window.location.href = "/login";
  },

  updateProfile: async (data: any) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/user/me", data);
      set({ authUser: res.data.user });
    } finally {
      set({ isUpdatingProfile: false });
    }
  },
}));
