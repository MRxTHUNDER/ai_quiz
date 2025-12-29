// Centralized constants for entrance exams used across the backend

export type EntranceExamId = "CUET" | "CET" | "JEE" | "NEET" | "CLAT" | "CAT";

export interface EntranceExamSection {
  name: string;
  // If a section has a fixed official duration, set it; otherwise omit
  durationMinutes?: number;
  // For CUET, distinguish broad types
  type?: "language" | "domain" | "general";
  // Optional explicit enumeration of items (languages/subjects within the section)
  items?: string[];
  // Total number of questions for this section/subject (actual exam pattern)
  totalQuestions?: number;
}

export interface MarkingScheme {
  correctMarks: number;
  incorrectMarks: number;
  unansweredMarks: number;
}

export interface EntranceExamMeta {
  id: EntranceExamId;
  name: string;
  durationMinutes: number;
  sections?: EntranceExamSection[];
  notes?: string;
  markingScheme: MarkingScheme;
}

export const ENTRANCE_EXAMS: EntranceExamMeta[] = [
  {
    id: "CUET",
    name: "CUET",
    durationMinutes: 180, // varies by chosen tests; common sitting window
    markingScheme: {
      correctMarks: 5,
      incorrectMarks: -1,
      unansweredMarks: 0,
    },
    sections: [
      {
        name: "Section IA Languages",
        type: "language",
        durationMinutes: 45,
        totalQuestions: 50, // 50 questions per language
        items: [
          "English",
          "Hindi",
          "Assamese",
          "Bengali",
          "Gujarati",
          "Kannada",
          "Malayalam",
          "Marathi",
          "Odia",
          "Punjabi",
          "Tamil",
          "Telugu",
          "Urdu",
        ],
      },
      {
        name: "Section IB Languages",
        type: "language",
        durationMinutes: 45,
        totalQuestions: 50, // 50 questions per language
        items: [
          "Arabic",
          "Bodo",
          "Chinese",
          "Dogri",
          "French",
          "German",
          "Italian",
          "Japanese",
          "Kashmiri",
          "Konkani",
          "Maithili",
          "Manipuri",
          "Nepali",
          "Persian",
          "Russian",
          "Santhali",
          "Sindhi",
          "Spanish",
          "Tibetan",
        ],
      },
      {
        name: "Domain Subjects (45 minutes)",
        type: "domain",
        durationMinutes: 45,
        totalQuestions: 50, // 50 questions per domain subject
        items: [
          "Agriculture",
          "Anthropology",
          "Biology",
          "Business Studies",
          "Engineering Graphics",
          "Entrepreneurship",
          "Environmental Studies",
          "Fine Arts / Visual Arts",
          "Geography",
          "Geology",
          "History",
          "Home Science",
          "Knowledge Tradition and Practices of India",
          "Legal Studies",
          "Mass Media / Media Studies",
          "Performing Arts",
          "Physical Education / NCC / Yoga",
          "Political Science",
          "Psychology",
          "Sanskrit",
          "Sociology",
          "Teaching Aptitude",
        ],
      },
      {
        name: "Domain Subjects (60 minutes)",
        type: "domain",
        durationMinutes: 60,
        totalQuestions: 50, // 50 questions per domain subject
        items: [
          "Mathematics / Applied Mathematics",
          "Accountancy / Book Keeping",
          "Physics",
          "Chemistry",
          "Economics / Business Economics",
          "Computer Science / Informatics Practices",
        ],
      },
      {
        name: "General Test",
        type: "general",
        durationMinutes: 60,
        totalQuestions: 50,
      },
    ],
    notes:
      "CUET-UG sections: Languages (45m), most domain subjects (45m). 60m for Mathematics/Applied Mathematics, Accountancy, Physics, Chemistry, Economics, Computer Science/Informatics Practices. General Test is 60m.",
  },
  {
    id: "CET",
    name: "CET",
    durationMinutes: 180,
    markingScheme: {
      correctMarks: 1,
      incorrectMarks: -0.25,
      unansweredMarks: 0,
    },
    sections: [
      { name: "Physics", totalQuestions: 50 },
      { name: "Chemistry", totalQuestions: 50 },
      { name: "Mathematics / Biology", totalQuestions: 50 },
    ],
    notes:
      "CET varies by state (e.g., MHT-CET, KCET). Confirm which CET to lock exact section timings.",
  },
  {
    id: "JEE",
    name: "JEE Main",
    durationMinutes: 180,
    markingScheme: {
      correctMarks: 4,
      incorrectMarks: -1,
      unansweredMarks: 0,
    },
    sections: [
      { name: "Mathematics", totalQuestions: 25 },
      { name: "Physics", totalQuestions: 25 },
      { name: "Chemistry", totalQuestions: 25 },
    ],
    notes:
      "Total 180m; no fixed per-section timing window enforced within the CBT.",
  },
  {
    id: "NEET",
    name: "NEET",
    durationMinutes: 200,
    markingScheme: {
      correctMarks: 4,
      incorrectMarks: -1,
      unansweredMarks: 0,
    },
    sections: [
      { name: "Physics", totalQuestions: 45 },
      { name: "Chemistry", totalQuestions: 45 },
      { name: "Biology (Botany)", totalQuestions: 45 },
      { name: "Biology (Zoology)", totalQuestions: 45 },
    ],
    notes: "Total 200m; sections are not individually time-bound.",
  },
  {
    id: "CLAT",
    name: "CLAT",
    durationMinutes: 120,
    markingScheme: {
      correctMarks: 1,
      incorrectMarks: -0.25,
      unansweredMarks: 0,
    },
    sections: [
      { name: "English Language", totalQuestions: 24 },
      { name: "Current Affairs & General Knowledge", totalQuestions: 30 },
      { name: "Legal Reasoning", totalQuestions: 30 },
      { name: "Logical Reasoning", totalQuestions: 24 },
      { name: "Quantitative Techniques", totalQuestions: 12 },
    ],
    notes: "Total 120m; no official per-section time limits.",
  },
  {
    id: "CAT",
    name: "CAT",
    durationMinutes: 120,
    markingScheme: {
      correctMarks: 3,
      incorrectMarks: -1,
      unansweredMarks: 0,
    },
    sections: [
      {
        name: "VARC (Verbal Ability & Reading Comprehension)",
        durationMinutes: 40,
        totalQuestions: 24,
      },
      {
        name: "DILR (Data Interpretation & Logical Reasoning)",
        durationMinutes: 40,
        totalQuestions: 22,
      },
      {
        name: "QA (Quantitative Ability)",
        durationMinutes: 40,
        totalQuestions: 22,
      },
    ],
    notes: "Each section is time-bound for 40 minutes; total 120m.",
  },
];

export const ENTRANCE_EXAM_BY_ID: Record<EntranceExamId, EntranceExamMeta> =
  ENTRANCE_EXAMS.reduce((acc, exam) => {
    acc[exam.id] = exam;
    return acc;
  }, {} as Record<EntranceExamId, EntranceExamMeta>);

export const TOTAL_ENTRANCE_EXAMS = ENTRANCE_EXAMS.length; // 6
