import { useMemo, useState } from "react";
import {
  Calculator,
  Atom,
  BookOpen,
  Calendar,
  TrendingUp,
  Beaker,
  Heart,
  History,
  Palette,
  Monitor,
  GraduationCap,
  Landmark,
  Scale,
  Languages,
  Clock,
} from "lucide-react";
import Button from "../components/Button";
import SelectionCard from "../components/SelectionCard";
import StatCard from "../components/StatCard";
import QuizCard from "../components/QuizCard";
import SubjectCard from "../components/SubjectCard";
import { ENTRANCE_EXAMS, ENTRANCE_EXAM_BY_ID } from "../lib/exams";

function StartTest() {
  const [currentView, setCurrentView] = useState<"setup" | "dashboard">(
    "setup"
  );
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");

  const examIconMap: Record<string, JSX.Element> = {
    CUET: <Languages className="h-8 w-8" />,
    JEE: <Atom className="h-8 w-8" />,
    NEET: <Heart className="h-8 w-8" />,
    CLAT: <Scale className="h-8 w-8" />,
    CAT: <Calculator className="h-8 w-8" />,
    CET: <Landmark className="h-8 w-8" />,
  };

  type SubjectOption = { key: string; label: string; minutes?: number };

  const subjectOptions: SubjectOption[] = useMemo(() => {
    if (!selectedExamId) return [];
    const exam =
      ENTRANCE_EXAM_BY_ID[selectedExamId as keyof typeof ENTRANCE_EXAM_BY_ID];
    if (!exam || !exam.sections) return [];

    const options: SubjectOption[] = [];
    exam.sections.forEach((section) => {
      if (section.items && section.items.length > 0) {
        section.items.forEach((item) => {
          options.push({
            key: `${section.name}:${item}`,
            label: item,
            minutes: section.durationMinutes,
          });
        });
      } else {
        options.push({
          key: section.name,
          label: section.name,
          minutes: section.durationMinutes,
        });
      }
    });
    return options;
  }, [selectedExamId]);

  if (currentView === "setup") {
    return (
      <div className="min-h-screen bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Setup Your Next Test
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Choose your subject, preferred duration, and challenge level to
              begin your personalized quiz experience.
            </p>
          </div>

          {/* Entrance Exam Selection */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
              1. Select an Entrance Exam
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {ENTRANCE_EXAMS.map((exam) => (
                <SelectionCard
                  key={exam.id}
                  icon={
                    examIconMap[exam.id] ?? (
                      <GraduationCap className="h-8 w-8" />
                    )
                  }
                  title={`${exam.name}`}
                  isSelected={selectedExamId === exam.id}
                  onClick={() => {
                    setSelectedExamId(exam.id);
                    setSelectedSubject("");
                  }}
                />
              ))}
            </div>
          </div>

          {/* Subject Selection for the chosen exam */}
          {selectedExamId && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
                2. Select a Subject
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {subjectOptions.map((opt) => (
                  <SelectionCard
                    key={opt.key}
                    icon={<BookOpen className="h-8 w-8" />}
                    title={
                      opt.minutes
                        ? `${opt.label} (${opt.minutes} min)`
                        : opt.label
                    }
                    isSelected={selectedSubject === opt.key}
                    onClick={() => setSelectedSubject(opt.key)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Start Test Button */}
          <div className="text-center">
            <Button
              size="lg"
              onClick={() => setCurrentView("dashboard")}
              className="px-12"
              disabled={!selectedExamId || !selectedSubject}
            >
              Start Test
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 mb-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome, Alex Johnson!
            </h1>
            <p className="text-gray-600 mb-6">
              Dive into new quizzes, track your progress, and master your
              subjects with Quiz Genius AI.
            </p>
            <Button className="bg-green-600 hover:bg-green-700">
              Start New Test
            </Button>
          </div>
        </div>

        {/* My Overview Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">My Overview</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Card */}
            <div className="bg-white p-6 rounded-xl border border-gray-100">
              <div className="text-center">
                <div className="relative inline-block mb-4">
                  <img
                    src="https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&dpr=1"
                    alt="Alex Johnson"
                    className="w-20 h-20 rounded-full object-cover"
                  />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <h3 className="text-lg font-semibold text-blue-600 mb-1">
                  Alex Johnson
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  alex.johnson@example.com
                </p>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">42</div>
                    <div className="text-sm text-gray-600">Tests Done</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">88%</div>
                    <div className="text-sm text-gray-600">Avg. Score</div>
                  </div>
                </div>
                <button className="text-blue-600 text-sm font-medium hover:text-blue-700">
                  View Profile
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="lg:col-span-2 grid grid-cols-2 gap-6">
              <StatCard
                icon={<BookOpen className="h-6 w-6" />}
                title="Subjects Mastered"
                value="12"
                subtitle="Total subjects completed"
                color="blue"
              />
              <StatCard
                icon={<TrendingUp className="h-6 w-6" />}
                title="High Score"
                value="98%"
                subtitle="Achieved in Physics"
                color="green"
              />
              <StatCard
                icon={<Clock className="h-6 w-6" />}
                title="Study Time"
                value="150 hrs"
                subtitle="Total hours spent learning"
                color="blue"
              />
              <StatCard
                icon={<Calendar className="h-6 w-6" />}
                title="Active Streak"
                value="30 Days"
                subtitle="Consistent learning"
                color="green"
              />
            </div>
          </div>
        </div>

        {/* Recent Quizzes */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">
            Recent Quizzes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <QuizCard
              subject="Mathematics"
              score="92%"
              date="2024-06-15"
              icon={<Calculator className="h-6 w-6" />}
              color="blue"
            />
            <QuizCard
              subject="Physics"
              score="85%"
              date="2024-06-10"
              icon={<Atom className="h-6 w-6" />}
              color="purple"
            />
            <QuizCard
              subject="Biology"
              score="78%"
              date="2024-06-08"
              icon={<Heart className="h-6 w-6" />}
              color="green"
            />
            <QuizCard
              subject="Literature"
              score="95%"
              date="2024-06-03"
              icon={<BookOpen className="h-6 w-6" />}
              color="orange"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <QuizCard
              subject="Chemistry"
              score="89%"
              date="2024-05-28"
              icon={<Beaker className="h-6 w-6" />}
              color="teal"
            />
            <QuizCard
              subject="History"
              score="81%"
              date="2024-05-20"
              icon={<History className="h-6 w-6" />}
              color="blue"
            />
          </div>
        </div>

        {/* Explore Subjects */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-8">
            Explore Subjects
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <SubjectCard
              icon={<Calculator className="h-8 w-8" />}
              title="Mathematics"
              color="green"
            />
            <SubjectCard
              icon={<Atom className="h-8 w-8" />}
              title="Physics"
              color="green"
            />
            <SubjectCard
              icon={<Beaker className="h-8 w-8" />}
              title="Chemistry"
              color="green"
            />
            <SubjectCard
              icon={<Heart className="h-8 w-8" />}
              title="Biology"
              color="green"
            />
            <SubjectCard
              icon={<BookOpen className="h-8 w-8" />}
              title="Literature"
              color="green"
            />
            <SubjectCard
              icon={<History className="h-8 w-8" />}
              title="History"
              color="green"
            />
            <SubjectCard
              icon={<Palette className="h-8 w-8" />}
              title="Art & Design"
              color="green"
            />
            <SubjectCard
              icon={<Monitor className="h-8 w-8" />}
              title="Computer Science"
              color="green"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default StartTest;
