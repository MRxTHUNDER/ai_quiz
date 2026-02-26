import mongoose from "mongoose";
import { Subject } from "../models/subject.model";
import { EntranceExam } from "../models/entranceExam.model";
import { ENTRANCE_EXAMS } from "../data/exams";
import { DbConnection } from "../env";

async function connectDb() {
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

async function clearEntranceExams() {
  console.log("\n🗑️  Clearing existing entrance exams...");
  await EntranceExam.deleteMany({});
  console.log("✓ Entrance exams cleared");
}

async function seedEntranceExams() {
  console.log("\n🎓 Seeding entrance exams...");

  for (const examMeta of ENTRANCE_EXAMS) {
    // Check if exam already exists
    const existingExam = await EntranceExam.findOne({
      entranceExamId: examMeta.id,
    });

    if (existingExam) {
      console.log(
        `  ⚠ Entrance exam ${examMeta.name} already exists, skipping...`,
      );
      continue;
    }

    // Process subjects from sections
    const processedSubjects = [];

    if (examMeta.sections && examMeta.sections.length > 0) {
      for (const section of examMeta.sections) {
        // If section has items array (like CUET), process each item
        if (section.items && section.items.length > 0) {
          const sectionDuration =
            section.durationMinutes || examMeta.durationMinutes;
          const sectionQuestions = section.totalQuestions || 50; // Use actual exam pattern or default to 50

          for (const itemName of section.items) {
            // Find or create subject
            let subject = await Subject.findOne({
              subjectName: itemName.trim(),
            });
            if (!subject) {
              subject = await Subject.create({
                subjectName: itemName.trim(),
                testDuration: sectionDuration,
              });
              console.log(`    ✓ Created subject: ${itemName.trim()}`);
            }

            processedSubjects.push({
              subject: subject._id,
              durationMinutes: sectionDuration,
              totalQuestions: sectionQuestions, // Use actual exam pattern question count
            });
          }
        } else if (section.name) {
          // If section doesn't have items but has a name (like JEE, NEET, etc.)
          const sectionDuration =
            section.durationMinutes || examMeta.durationMinutes;
          const sectionQuestions = section.totalQuestions || 50; // Use actual exam pattern or default to 50

          // Find or create subject
          let subject = await Subject.findOne({
            subjectName: section.name.trim(),
          });
          if (!subject) {
            subject = await Subject.create({
              subjectName: section.name.trim(),
              testDuration: sectionDuration,
            });
            console.log(`    ✓ Created subject: ${section.name.trim()}`);
          }

          processedSubjects.push({
            subject: subject._id,
            durationMinutes: sectionDuration,
            totalQuestions: sectionQuestions, // Use actual exam pattern question count
          });
        }
      }
    }

    // Create entrance exam
    const exam = await EntranceExam.create({
      entranceExamName: examMeta.name,
      entranceExamId: examMeta.id,
      durationMinutes: examMeta.durationMinutes,
      subjects: processedSubjects,
      notes: examMeta.notes || "",
      markingScheme: examMeta.markingScheme,
    });

    console.log(
      `  ✓ Created entrance exam: ${examMeta.name} with ${processedSubjects.length} subjects`,
    );
  }

  console.log("\n✅ Entrance exams seeding completed!");
}

async function seed() {
  try {
    console.log("🚀 Starting entrance exams seeding...\n");

    await connectDb();
    await clearEntranceExams();
    await seedEntranceExams();

    console.log("\n✅ Database seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error seeding database:", error);
    process.exit(1);
  }
}

seed();
