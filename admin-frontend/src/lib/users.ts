import { axiosInstance } from "./axios";

export interface User {
  _id: string;
  email: string;
  firstname: string;
  lastname?: string;
  phoneNumber?: string;
  entranceExamPreference?: string | {
    _id: string;
    entranceExamName: string;
    entranceExamId: string;
  };
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserStatistics {
  totalAttempts: number;
  completedAttempts: number;
  inProgressAttempts: number;
  abandonedAttempts: number;
  averageScore: number;
  averagePercentage: number;
}

export interface UserDetails {
  user: User;
  statistics: UserStatistics;
}

export interface UserProgress {
  user: {
    id: string;
    email: string;
    firstname: string;
    lastname: string;
    phoneNumber?: string;
    entranceExamPreference?: string | {
      _id: string;
      entranceExamName: string;
      entranceExamId: string;
    };
    role: string;
    createdAt: string;
  };
  progress: {
    totalTests: number;
    completedTests: number;
    inProgressTests: number;
    abandonedTests: number;
    averageScore: number;
    averagePercentage: number;
    bestScore: number;
    bestPercentage: number;
    totalQuestionsAnswered: number;
    totalCorrectAnswers: number;
    overallAccuracy: number;
    testsBySubject: Array<{
      subject: string;
      count: number;
      averageScore: number;
      averagePercentage: number;
    }>;
    testsByExam: Array<{
      exam: string;
      count: number;
      averageScore: number;
      averagePercentage: number;
    }>;
    recentTests: Array<{
      _id: string;
      testId: {
        _id: string;
        testSubject: {
          _id: string;
          subjectName: string;
        };
        entranceExamId: {
          _id: string;
          entranceExamName: string;
          entranceExamId: string;
        };
      };
      score: number;
      totalQuestions: number;
      correctCount: number;
      status: string;
      createdAt: string;
      endTime?: string;
    }>;
  };
}

export interface Pagination {
  currentPage: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface UsersResponse {
  users: User[];
  pagination: Pagination;
}

export const usersApi = {
  // Get all users with pagination and filtering
  getAllUsers: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    entranceExamId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<UsersResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.search) queryParams.append("search", params.search);
    if (params?.role) queryParams.append("role", params.role);
    if (params?.entranceExamId) queryParams.append("entranceExamId", params.entranceExamId);
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);

    const response = await axiosInstance.get(
      `/admin/users?${queryParams.toString()}`
    );
    // Response is flattened by interceptor, so users and pagination are at the top level
    return {
      users: response.data.users || [],
      pagination: response.data.pagination || {
        currentPage: 1,
        limit: 10,
        totalCount: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  },

  // Get user details with statistics
  getUserDetails: async (userId: string): Promise<UserDetails> => {
    const response = await axiosInstance.get(`/admin/users/${userId}`);
    // Response is flattened by interceptor
    return response.data;
  },

  // Get user progress
  getUserProgress: async (userId: string): Promise<UserProgress> => {
    const response = await axiosInstance.get(`/admin/users/${userId}/progress`);
    // Response is flattened by interceptor, so data is at the top level
    return response.data;
  },

  // Get all users for export (fetches all users in batches)
  getAllUsersForExport: async (
    search?: string,
    role?: string,
    entranceExamId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<User[]> => {
    // Fetch with limit 100 (backend max) and fetch all pages if needed
    const queryParams = new URLSearchParams();
    queryParams.append("page", "1");
    queryParams.append("limit", "100"); // Backend max limit is 100
    if (search) queryParams.append("search", search);
    if (role) queryParams.append("role", role);
    if (entranceExamId) queryParams.append("entranceExamId", entranceExamId);
    if (startDate) queryParams.append("startDate", startDate);
    if (endDate) queryParams.append("endDate", endDate);

    const response = await axiosInstance.get(
      `/admin/users?${queryParams.toString()}`
    );
    
    let allUsers = response.data.users || [];
    const pagination = response.data.pagination || { totalPages: 1 };

    // If there are more pages, fetch them
    if (pagination.totalPages > 1) {
      const additionalPages = [];
      for (let page = 2; page <= pagination.totalPages; page++) {
        const pageParams = new URLSearchParams();
        pageParams.append("page", page.toString());
        pageParams.append("limit", "100"); // Backend max limit is 100
        if (search) pageParams.append("search", search);
        if (role) pageParams.append("role", role);
        if (entranceExamId) pageParams.append("entranceExamId", entranceExamId);
        if (startDate) pageParams.append("startDate", startDate);
        if (endDate) pageParams.append("endDate", endDate);

        const pageResponse = await axiosInstance.get(
          `/admin/users?${pageParams.toString()}`
        );
        additionalPages.push(...(pageResponse.data.users || []));
      }
      allUsers = [...allUsers, ...additionalPages];
    }

    return allUsers;
  },
};

