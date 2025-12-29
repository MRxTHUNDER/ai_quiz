export type EntranceExamId = "CUET" | "CET" | "JEE" | "NEET" | "CLAT" | "CAT";

export interface EntranceExamSection {
  name: string;
  durationMinutes?: number;
  type?: "language" | "domain" | "general";
  items?: string[];
}

export interface EntranceExamMeta {
  id: EntranceExamId;
  name: string;
  durationMinutes: number;
  sections?: EntranceExamSection[];
  notes?: string;
}

export const ENTRANCE_EXAMS: EntranceExamMeta[] = [
  {
    id: "CUET",
    name: "CUET (UG)",
    durationMinutes: 180, // varies by chosen tests; common sitting window
    sections: [
      {
        name: "Section IA Languages",
        type: "language",
        durationMinutes: 45,
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
        items: [
          "Mathematics / Applied Mathematics",
          "Accountancy / Book Keeping",
          "Physics",
          "Chemistry",
          "Economics / Business Economics",
          "Computer Science / Informatics Practices",
        ],
      },
      { name: "General Test", type: "general", durationMinutes: 60 },
    ],
    notes:
      "CUET-UG sections: Languages (45m), most domain subjects (45m). 60m for Mathematics/Applied Mathematics, Accountancy, Physics, Chemistry, Economics, Computer Science/Informatics Practices. General Test is 60m.",
  },
  {
    id: "CET",
    name: "CET",
    durationMinutes: 180,
    sections: [
      { name: "Physics" },
      { name: "Chemistry" },
      { name: "Mathematics / Biology" },
    ],
    notes:
      "CET varies by state (e.g., MHT-CET, KCET). Confirm which CET to lock exact section timings.",
  },
  {
    id: "JEE",
    name: "JEE Main (Paper 1)",
    durationMinutes: 180,
    sections: [
      { name: "Mathematics" },
      { name: "Physics" },
      { name: "Chemistry" },
    ],
    notes:
      "Total 180m; no fixed per-section timing window enforced within the CBT.",
  },
  {
    id: "NEET",
    name: "NEET (UG)",
    durationMinutes: 200,
    sections: [
      { name: "Physics" },
      { name: "Chemistry" },
      { name: "Biology (Botany)" },
      { name: "Biology (Zoology)" },
    ],
    notes: "Total 200m; sections are not individually time-bound.",
  },
  {
    id: "CLAT",
    name: "CLAT (UG)",
    durationMinutes: 120,
    sections: [
      { name: "English Language" },
      { name: "Current Affairs & General Knowledge" },
      { name: "Legal Reasoning" },
      { name: "Logical Reasoning" },
      { name: "Quantitative Techniques" },
    ],
    notes: "Total 120m; no official per-section time limits.",
  },
  {
    id: "CAT",
    name: "CAT",
    durationMinutes: 120,
    sections: [
      {
        name: "VARC (Verbal Ability & Reading Comprehension)",
        durationMinutes: 40,
      },
      {
        name: "DILR (Data Interpretation & Logical Reasoning)",
        durationMinutes: 40,
      },
      { name: "QA (Quantitative Ability)", durationMinutes: 40 },
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
