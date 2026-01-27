import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Clock,
  ArrowRight,
} from "lucide-react";
import Button from "../components/Button";
import StatCard from "../components/StatCard";
import QuizCard from "../components/QuizCard";
import SubjectCard from "../components/SubjectCard";

function StartTest() {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<"setup" | "dashboard">(
    "setup"
  );

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

          {/* Quick Action */}
          <div className="text-center">
            <Button
              onClick={() => navigate("/test")}
              size="lg"
              className="px-12 bg-blue-600 hover:bg-blue-700"
            >
              Take Test
              <ArrowRight className="h-5 w-5 ml-2" />
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
            <Button 
              onClick={() => navigate("/test")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Take Test
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
                <button 
                  onClick={() => navigate("/dashboard")}
                  className="text-blue-600 text-sm font-medium hover:text-blue-700"
                >
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
