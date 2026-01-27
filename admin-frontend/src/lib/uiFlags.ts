import { axiosInstance } from "./axios";

export interface UIFlags {
  questionsPageEnabled: boolean;
  featuredExamNames?: string[];
}

export async function getUIFlags(): Promise<UIFlags> {
  try {
    const response = await axiosInstance.get<{
      success: boolean;
      questionsPageEnabled?: boolean;
      featuredExamNames?: string[];
      data?: {
        questionsPageEnabled?: boolean;
        featuredExamNames?: string[];
      };
    }>(
      "/ui-flags"
    );
    // Axios interceptor flattens the response, but we also support nested `data`
    if (response.data && typeof response.data === 'object') {
      const raw: any = response.data;
      const source = raw.data || raw;

      return {
        questionsPageEnabled: source.questionsPageEnabled ?? true,
        featuredExamNames: Array.isArray(source.featuredExamNames)
          ? source.featuredExamNames
          : undefined,
      };
    }
    // Return default values if data structure is unexpected
    return { questionsPageEnabled: true };
  } catch (error) {
    console.error("Error fetching UI flags:", error);
    // Return default values if error
    return { questionsPageEnabled: true };
  }
}

export async function updateUIFlags(flags: Partial<UIFlags>): Promise<UIFlags> {
  try {
    const response = await axiosInstance.put<{
      success: boolean;
      message: string;
      questionsPageEnabled?: boolean;
      featuredExamNames?: string[];
      data?: {
        questionsPageEnabled?: boolean;
        featuredExamNames?: string[];
      };
    }>("/ui-flags", flags);
    // Axios interceptor flattens the response, but we also support nested `data`
    if (response.data && typeof response.data === 'object') {
      const raw: any = response.data;
      const source = raw.data || raw;

      return {
        questionsPageEnabled: source.questionsPageEnabled ?? true,
        featuredExamNames: Array.isArray(source.featuredExamNames)
          ? source.featuredExamNames
          : undefined,
      };
    }
    // Fallback to default
    return { questionsPageEnabled: true };
  } catch (error) {
    console.error("Error updating UI flags:", error);
    throw error;
  }
}
