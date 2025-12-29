import { axiosInstance } from "./axio";

// Types
export interface EntranceExam {
  _id: string;
  entranceExamName: string;
  entranceExamId: string;
  durationMinutes: number;
  subjects: Array<{
    subject: {
      _id: string;
      subjectName: string;
      testDuration: number;
    };
    durationMinutes: number;
  }>;
}

export interface Subject {
  _id: string;
  subjectName: string;
  testDuration: number;
  totalQuestions: number;
}

export interface Test {
  id: string;
  entranceExam: {
    _id: string;
    name: string;
    examId: string;
  };
  subject: {
    _id: string;
    name: string;
    testDuration: number;
  };
  totalQuestions: number;
  durationMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  id: string;
  questionNumber: number;
  questionsText: string;
  Options: string[];
}

export interface TestAttempt {
  attemptId: string;
  testId: string;
  entranceExam: {
    _id: string;
    name: string;
    examId: string;
  };
  startTime: string;
  durationMinutes: number;
  totalQuestions: number;
  status: string;
}

export interface TestProgress {
  attemptId: string;
  totalQuestions: number;
  attemptedCount: number;
  unansweredCount: number;
  startTime: string;
  elapsedTime: number;
  remainingTime: number;
  status: string;
}

export interface TestResult {
  attemptId: string;
  test: {
    subject: string;
    entranceExam: string;
    entranceExamId: string;
  };
  score: number;
  totalQuestions: number;
  attemptedCount: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  percentage: number;
  timeTaken: number;
  status: string;
  startTime: string;
  endTime: string;
  answers: Array<{
    questionId: string;
    questionText: string;
    Options: string[];
    selectedOption: string;
    correctOption: string;
    isCorrect: boolean;
  }>;
}

// API Functions
export const testApi = {
  // Get all entrance exams
  getEntranceExams: async (): Promise<EntranceExam[]> => {
    const response = await axiosInstance.get("/entrance-exam");
    return response.data.exams || [];
  },

  // Get subjects for an entrance exam
  getEntranceExamSubjects: async (
    examId: string
  ): Promise<{ exam: any; subjects: Subject[] }> => {
    const response = await axiosInstance.get(
      `/user/entrance-exams/${examId}/subjects`
    );
    return {
      exam: response.data.exam,
      subjects: response.data.subjects || [],
    };
  },

  // Get available tests
  getAvailableTests: async (params?: {
    entranceExamId?: string;
    subjectId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Test[]; pagination: any }> => {
    const queryParams = new URLSearchParams();
    if (params?.entranceExamId)
      queryParams.append("entranceExamId", params.entranceExamId);
    if (params?.subjectId) queryParams.append("subjectId", params.subjectId);
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());

    const response = await axiosInstance.get(
      `/user/tests?${queryParams.toString()}`
    );
    // The axios interceptor already flattens the response, so we use response.data directly
    return {
      data: response.data.data || response.data || [],
      pagination: response.data.pagination || {},
    };
  },

  // Start a test
  startTest: async (
    testId: string,
    entranceExamId: string
  ): Promise<TestAttempt> => {
    const response = await axiosInstance.post("/user/test/start", {
      testId,
      entranceExamId,
    });
    // The axios interceptor already flattens the response, so we use response.data directly
    return response.data;
  },

  // Get test questions
  getTestQuestions: async (
    testId: string,
    attemptId: string
  ): Promise<{
    attemptId: string;
    questions: Question[];
    totalQuestions: number;
    durationMinutes: number;
  }> => {
    const response = await axiosInstance.get(
      `/user/test/${testId}/questions?attemptId=${attemptId}`
    );
    // The axios interceptor already flattens the response, so we use response.data directly
    return response.data;
  },

  // Submit answer
  submitAnswer: async (
    attemptId: string,
    questionId: string,
    selectedOption: string
  ): Promise<void> => {
    await axiosInstance.post(`/user/test/${attemptId}/answer`, {
      questionId,
      selectedOption,
    });
  },

  // Get test progress
  getTestProgress: async (attemptId: string): Promise<TestProgress> => {
    const response = await axiosInstance.get(
      `/user/test/${attemptId}/progress`
    );
    // The axios interceptor already flattens the response, so we use response.data directly
    return response.data;
  },

  // End test
  endTest: async (
    attemptId: string
  ): Promise<{
    attemptId: string;
    status: string;
    score: number;
    totalQuestions: number;
    attemptedCount: number;
    correctCount: number;
    incorrectCount: number;
    unansweredCount: number;
    timeTaken: number;
    percentage: number;
  }> => {
    const response = await axiosInstance.post(
      `/user/test/${attemptId}/end`,
      {}
    );
    // The axios interceptor already flattens the response, so we use response.data directly
    return response.data;
  },

  // Time up
  timeUp: async (
    attemptId: string
  ): Promise<{
    attemptId: string;
    status: string;
    score: number;
    totalQuestions: number;
    attemptedCount: number;
    correctCount: number;
    incorrectCount: number;
    unansweredCount: number;
    timeTaken: number;
    percentage: number;
  }> => {
    const response = await axiosInstance.post(
      `/user/test/${attemptId}/time-up`,
      {}
    );
    // The axios interceptor already flattens the response, so we use response.data directly
    return response.data;
  },

  // Get test result
  getTestResult: async (attemptId: string): Promise<TestResult> => {
    const response = await axiosInstance.get(`/user/test/${attemptId}/result`);
    // The axios interceptor already flattens the response, so we use response.data directly
    return response.data;
  },

  // Get test history
  getTestHistory: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; pagination: any }> => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append("status", params.status);
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());

    const response = await axiosInstance.get(
      `/user/test-history?${queryParams.toString()}`
    );
    // The axios interceptor already flattens the response, so we use response.data directly
    return {
      data: response.data.data || response.data || [],
      pagination: response.data.pagination || {},
    };
  },

  // Create a test
  createTest: async (
    entranceExamId: string,
    subjectId: string
  ): Promise<{
    id: string;
    entranceExamId: string;
    subject: string;
    totalQuestions: number;
    durationMinutes: number;
  }> => {
    const response = await axiosInstance.post("/test/create", {
      entranceExamId,
      subjectId,
    });
    return response.data.test;
  },
};
