import axios from "axios";

export const axiosInstance = axios.create({
  baseURL:
    import.meta.env.MODE === "production"
      ? `${import.meta.env.VITE_API_URL}/api/v1`
      : "http://localhost:8080/api/v1",
  withCredentials: true,
});

// Response interceptor to flatten the response structure
// Transforms { message: "...", data: {...}, pagination: {...} } to { message: "...", ...data, pagination: {...} }
axiosInstance.interceptors.response.use(
  (response) => {
    // If response has a data property, flatten it while preserving other top-level fields
    if (
      response.data &&
      typeof response.data === "object" &&
      "data" in response.data
    ) {
      const { data, message, ...otherFields } = response.data;

      // If data is an array, keep it as a property. Otherwise, spread it.
      if (Array.isArray(data)) {
        return {
          ...response,
          data: {
            message: message,
            data: data, // Keep array as data property
            ...otherFields, // Preserve pagination, count, etc.
          },
        };
      } else if (data && typeof data === "object") {
        return {
          ...response,
          data: {
            message: message,
            ...data, // Spread object properties
            ...otherFields, // Preserve pagination, count, etc.
          },
        };
      } else {
        // data is null, undefined, or primitive - just preserve other fields
        return {
          ...response,
          data: {
            message: message,
            data: data,
            ...otherFields,
          },
        };
      }
    }
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);
