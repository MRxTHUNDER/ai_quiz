import { axiosInstance } from "./axio";

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
    // Axios interceptor may flatten the response, so check both nested and flat structures
    if (response.data && typeof response.data === 'object') {
      const raw: any = response.data;
      const flags = raw.data || raw;
      return {
        questionsPageEnabled: flags.questionsPageEnabled ?? true,
        featuredExamNames: Array.isArray(flags.featuredExamNames)
          ? flags.featuredExamNames
          : undefined,
      };
    }
    // Return default values if data structure is unexpected
    return { questionsPageEnabled: true };
  } catch (error) {
    console.error("Error fetching UI flags:", error);
    // Return default values if error (default to enabled for better UX)
    return { questionsPageEnabled: true };
  }
}
