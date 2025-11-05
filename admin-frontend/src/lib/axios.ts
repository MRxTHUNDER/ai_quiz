import axios from "axios";

export const axiosInstance = axios.create({
  baseURL:
    import.meta.env.MODE === "production"
      ? `${import.meta.env.VITE_API_URL}/api/v1`
      : "http://localhost:8080/api/v1",
  withCredentials: true,
});

// Response interceptor to flatten the response structure
// Transforms { message: "...", data: {...} } to { message: "...", ...data }
axiosInstance.interceptors.response.use(
  (response) => {
    // If response has a data property, flatten it
    if (
      response.data &&
      typeof response.data === "object" &&
      "data" in response.data
    ) {
      return {
        ...response,
        data: {
          message: response.data.message,
          ...response.data.data,
        },
      };
    }
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);
