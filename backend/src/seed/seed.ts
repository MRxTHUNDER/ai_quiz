import { config } from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { Subject } from "../models/subject.model";
import { QuestionModel } from "../models/questions.model";
import { EntranceExam } from "../models/entranceExam.model";
import { TestModel } from "../models/test.model";
import { User } from "../models/user.model";
import { UserResult } from "../models/userResult.model";
import { UserRole, TestStatus } from "../types/types";

config();

const subjects = [
  { name: "Mathematics", duration: 120, key: "MATH" },
  { name: "Physics", duration: 90, key: "PHYS" },
  { name: "Chemistry", duration: 90, key: "CHEM" },
  { name: "Biology", duration: 100, key: "BIO" },
];

const mathQuestions = [
  {
    question: "What is the value of 2 + 2?",
    options: ["3", "4", "5", "6"],
    correct: "4",
  },
  {
    question: "What is the derivative of x²?",
    options: ["x", "2x", "2", "x²"],
    correct: "2x",
  },
  {
    question: "What is the integral of 3x²?",
    options: ["x³", "3x³", "x³ + C", "3x³ + C"],
    correct: "x³ + C",
  },
  {
    question: "What is sin(90°)?",
    options: ["0", "1", "0.5", "-1"],
    correct: "1",
  },
  {
    question: "What is the area of a circle with radius 5?",
    options: ["10π", "25π", "50π", "100π"],
    correct: "25π",
  },
  {
    question: "What is the square root of 144?",
    options: ["10", "11", "12", "13"],
    correct: "12",
  },
  {
    question: "What is 15% of 200?",
    options: ["25", "30", "35", "40"],
    correct: "30",
  },
  {
    question: "What is the value of log₁₀(100)?",
    options: ["1", "2", "10", "100"],
    correct: "2",
  },
];

const physicsQuestions = [
  {
    question: "What is the formula for kinetic energy?",
    options: ["mv", "mv²", "½mv²", "m²v"],
    correct: "½mv²",
  },
  {
    question: "What is the speed of light in vacuum?",
    options: ["3 x 10⁸ m/s", "3 x 10⁶ m/s", "3 x 10¹⁰ m/s", "3 x 10⁵ m/s"],
    correct: "3 x 10⁸ m/s",
  },
  {
    question: "What is the unit of force?",
    options: ["Joule", "Newton", "Watt", "Pascal"],
    correct: "Newton",
  },
  {
    question: "What does F = ma represent?",
    options: [
      "Newton's First Law",
      "Newton's Second Law",
      "Newton's Third Law",
      "Ohm's Law",
    ],
    correct: "Newton's Second Law",
  },
  {
    question: "What is the acceleration due to gravity?",
    options: ["9.8 m/s²", "10 m/s²", "9.8 cm/s²", "98 m/s²"],
    correct: "9.8 m/s²",
  },
  {
    question: "What is the unit of electric current?",
    options: ["Volt", "Ampere", "Ohm", "Watt"],
    correct: "Ampere",
  },
];

const chemistryQuestions = [
  {
    question: "What is the chemical formula for water?",
    options: ["H₂O", "H₂O₂", "CO₂", "NaCl"],
    correct: "H₂O",
  },
  {
    question: "What is the atomic number of carbon?",
    options: ["4", "5", "6", "7"],
    correct: "6",
  },
  {
    question: "What is the pH of pure water?",
    options: ["6", "7", "8", "14"],
    correct: "7",
  },
  {
    question: "What is Avogadro's number?",
    options: ["6.022 x 10²³", "6.022 x 10²⁰", "6.022 x 10²⁵", "6.022 x 10³⁰"],
    correct: "6.022 x 10²³",
  },
  {
    question: "What is the symbol for sodium?",
    options: ["So", "Sa", "Na", "Nd"],
    correct: "Na",
  },
  {
    question: "What is the most abundant gas in Earth's atmosphere?",
    options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"],
    correct: "Nitrogen",
  },
];

const biologyQuestions = [
  {
    question: "What is the powerhouse of the cell?",
    options: ["Nucleus", "Mitochondria", "Ribosome", "Cell wall"],
    correct: "Mitochondria",
  },
  {
    question: "What is the process by which plants make food?",
    options: ["Respiration", "Photosynthesis", "Digestion", "Circulation"],
    correct: "Photosynthesis",
  },
  {
    question: "How many chambers does the human heart have?",
    options: ["2", "3", "4", "5"],
    correct: "4",
  },
  {
    question: "What is the largest organ in the human body?",
    options: ["Liver", "Lungs", "Skin", "Brain"],
    correct: "Skin",
  },
  {
    question: "What is the basic unit of life?",
    options: ["Tissue", "Organ", "Cell", "Organelle"],
    correct: "Cell",
  },
  {
    question: "What are the building blocks of proteins?",
    options: ["Nucleotides", "Amino acids", "Fatty acids", "Glucose"],
    correct: "Amino acids",
  },
];

const users = [
  {
    email: "admin@quiz.com",
    password: "admin123",
    firstname: "Admin",
    lastname: "User",
    role: UserRole.ADMIN,
  },
  {
    email: "john.doe@example.com",
    password: "password123",
    firstname: "John",
    lastname: "Doe",
    role: UserRole.USER,
  },
  {
    email: "jane.smith@example.com",
    password: "password123",
    firstname: "Jane",
    lastname: "Smith",
    role: UserRole.USER,
  },
  {
    email: "michael.johnson@example.com",
    password: "password123",
    firstname: "Michael",
    lastname: "Johnson",
    role: UserRole.USER,
  },
  {
    email: "sarah.williams@example.com",
    password: "password123",
    firstname: "Sarah",
    lastname: "Williams",
    role: UserRole.USER,
  },
];

async function connectDb() {
  const DbConnection =
    process.env.MONGODB_URL || "mongodb://localhost:27017/quiz";
  if (!DbConnection) {
    throw new Error("MongoDB connection string is not defined");
  }

  try {
    await mongoose.connect(DbConnection);
    console.log("✓ Connected to database");
  } catch (err) {
    console.error("✗ Database connection error:", err);
    throw err;
  }
}

async function clearDatabase() {
  console.log("\n🗑️  Clearing existing data...");
  await Subject.deleteMany({});
  await QuestionModel.deleteMany({});
  await EntranceExam.deleteMany({});
  await TestModel.deleteMany({});
  await User.deleteMany({});
  await UserResult.deleteMany({});
  console.log("✓ Database cleared");
}

async function seedSubjects() {
  console.log("\n📚 Seeding subjects...");
  const createdSubjects = [];

  for (const sub of subjects) {
    const subject = new Subject({
      subjectName: sub.name,
      testDuration: sub.duration,
      key: sub.key,
    });
    await subject.save();
    createdSubjects.push(subject);
    console.log(`  ✓ Created subject: ${sub.name}`);
  }

  return createdSubjects;
}

async function seedQuestions(subjects: any[]) {
  console.log("\n❓ Seeding questions...");

  const mathSubject = subjects.find((s) => s.subjectName === "Mathematics");
  const physicsSubject = subjects.find((s) => s.subjectName === "Physics");
  const chemistrySubject = subjects.find((s) => s.subjectName === "Chemistry");
  const biologySubject = subjects.find((s) => s.subjectName === "Biology");

  // Seed Math questions
  for (const q of mathQuestions) {
    const question = new QuestionModel({
      questionsText: q.question,
      Options: q.options,
      correctOption: q.correct,
      SubjectId: mathSubject._id,
    });
    await question.save();
  }
  console.log(`  ✓ Created ${mathQuestions.length} Math questions`);

  // Seed Physics questions
  for (const q of physicsQuestions) {
    const question = new QuestionModel({
      questionsText: q.question,
      Options: q.options,
      correctOption: q.correct,
      SubjectId: physicsSubject._id,
    });
    await question.save();
  }
  console.log(`  ✓ Created ${physicsQuestions.length} Physics questions`);

  // Seed Chemistry questions
  for (const q of chemistryQuestions) {
    const question = new QuestionModel({
      questionsText: q.question,
      Options: q.options,
      correctOption: q.correct,
      SubjectId: chemistrySubject._id,
    });
    await question.save();
  }
  console.log(`  ✓ Created ${chemistryQuestions.length} Chemistry questions`);

  // Seed Biology questions
  for (const q of biologyQuestions) {
    const question = new QuestionModel({
      questionsText: q.question,
      Options: q.options,
      correctOption: q.correct,
      SubjectId: biologySubject._id,
    });
    await question.save();
  }
  console.log(`  ✓ Created ${biologyQuestions.length} Biology questions`);
}

async function seedEntranceExams(subjects: any[]) {
  console.log("\n🎓 Seeding entrance exams...");

  // All subjects exam
  const exam1 = new EntranceExam({
    EntraceExamName: "All Subjects Entrance Test",
    subjects: subjects.map((s) => s._id),
  });
  await exam1.save();
  console.log("  ✓ Created exam: All Subjects Entrance Test");

  // Science subjects exam
  const scienceSubjects = subjects.filter((s) =>
    ["Physics", "Chemistry", "Biology"].includes(s.subjectName)
  );
  const exam2 = new EntranceExam({
    EntraceExamName: "Science Entrance Test",
    subjects: scienceSubjects.map((s) => s._id),
  });
  await exam2.save();
  console.log("  ✓ Created exam: Science Entrance Test");

  // Math and Physics exam
  const mathPhysicsSubjects = subjects.filter((s) =>
    ["Mathematics", "Physics"].includes(s.subjectName)
  );
  const exam3 = new EntranceExam({
    EntraceExamName: "Engineering Entrance Test",
    subjects: mathPhysicsSubjects.map((s) => s._id),
  });
  await exam3.save();
  console.log("  ✓ Created exam: Engineering Entrance Test");
}

async function seedUsers() {
  console.log("\n👥 Seeding users...");

  for (const userData of users) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const user = new User({
      ...userData,
      password: hashedPassword,
    });
    await user.save();
    console.log(`  ✓ Created user: ${userData.email} (${userData.role})`);
  }
}

async function seedTests(subjects: any[]) {
  console.log("\n📝 Seeding tests...");

  for (const subject of subjects) {
    // Get 5 random questions for this subject
    const questions = await QuestionModel.find({
      SubjectId: subject._id,
    }).limit(5);

    if (questions.length > 0) {
      const test = new TestModel({
        testSubject: subject._id,
        questions: questions.map((q) => q._id),
      });
      await test.save();
      console.log(
        `  ✓ Created test for ${subject.subjectName} (${questions.length} questions)`
      );
    }
  }
}

async function seedUserResults() {
  console.log("\n📊 Seeding user results...");

  const allUsers = await User.find({ role: UserRole.USER });
  const allTests = await TestModel.find().populate("questions");

  if (allUsers.length === 0 || allTests.length === 0) {
    console.log("  ⚠ No users or tests found, skipping user results");
    return;
  }

  // Create a few completed results for each user
  for (const user of allUsers.slice(0, 3)) {
    // Pick a random test
    const test = allTests[Math.floor(Math.random() * allTests.length)];
    const questions = test.questions;

    if (!questions || questions.length === 0) continue;

    const answers = [];
    let correctCount = 0;

    for (const question of questions) {
      const questionDoc = await QuestionModel.findById(question._id);
      if (!questionDoc) continue;

      const isCorrect = Math.random() > 0.3; // 70% chance of correct answer
      const selectedOption = isCorrect
        ? questionDoc.correctOption
        : questionDoc.Options[
            Math.floor(Math.random() * questionDoc.Options.length)
          ];

      if (isCorrect) correctCount++;

      answers.push({
        questionId: question._id,
        selectedOption,
        isCorrect,
      });
    }

    const score = Math.round((correctCount / questions.length) * 100);
    const timeTaken = Math.floor(Math.random() * 60) + 30; // Random time between 30-90 seconds

    const result = new UserResult({
      userId: user._id,
      testId: test._id,
      answers,
      status: TestStatus.COMPLETED,
      score,
      timeTaken,
    });

    await result.save();
    console.log(`  ✓ Created result for ${user.email}: Score ${score}%`);
  }
}

async function seed() {
  try {
    console.log("🚀 Starting database seeding...\n");

    await connectDb();
    await clearDatabase();

    const createdSubjects = await seedSubjects();
    await seedQuestions(createdSubjects);
    await seedEntranceExams(createdSubjects);
    await seedUsers();
    await seedTests(createdSubjects);
    await seedUserResults();

    console.log("\n✅ Database seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error seeding database:", error);
    process.exit(1);
  }
}

seed();
