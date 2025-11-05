import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Target,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  HeartPulse,
  GraduationCap,
} from "lucide-react";
import Button from "../components/Button";
import TestimonialCard from "../components/TestimonialCard";
import VisualSections from "./Visual.tsx";

function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const mainServices = [
    {
      id: 1,
      title: "JEE Exam Preparation",
      description:
        "Crack JEE with confidence! Our AI-powered quizzes are designed to match the actual exam’s difficulty, covering Physics, Chemistry, and Mathematics. Identify weak areas, strengthen concepts, and track your progress with instant feedback.",
      image:
        "https://images.pexels.com/photos/256417/pexels-photo-256417.jpeg?auto=compress&cs=tinysrgb&w=1200", // You can replace with a better 'study/exam' image
      icon: <BookOpen className="w-8 h-8 text-blue-600" />,
      tags: ["Physics", "Chemistry", "Mathematics"],
      color: "from-blue-600 to-indigo-600",
    },
    {
      id: 2,
      title: "NEET Exam Preparation",
      description:
        "Ace NEET with AI-powered quizzes tailored for Biology, Physics, and Chemistry. Practice with real-exam difficulty, identify weak areas instantly, and boost your chances of success in medical entrance exams.",
      image:
        "https://images.pexels.com/photos/4144221/pexels-photo-4144221.jpeg?auto=compress&cs=tinysrgb&w=1200", // doctor/medical study theme
      icon: <HeartPulse className="w-8 h-8 text-green-600" />, // lucide-react medical-style icon
      tags: ["Biology", "Physics", "Chemistry"],
      color: "from-green-600 to-teal-600",
    },
    {
      id: 3,
      title: "CUET Exam Preparation",
      description:
        "Prepare for CUET with quizzes customized across diverse subjects, from humanities to science. Our AI ensures you’re ready for university-level entrance tests with adaptive and comprehensive practice.",
      image:
        "https://images.pexels.com/photos/3184644/pexels-photo-3184644.jpeg?auto=compress&cs=tinysrgb&w=1200", // studying with books/college theme
      icon: <GraduationCap className="w-8 h-8 text-purple-600" />,
      tags: ["Humanities", "Science", "Languages"],
      color: "from-purple-600 to-pink-600",
    },
    {
      id: 4,
      title: "CET Exam Preparation",
      description:
        "Boost your CET prep with AI-powered quizzes in reasoning, aptitude, and subject-specific topics. Practice smarter, adapt to difficulty levels, and track your progress with detailed feedback.",
      image:
        "https://images.pexels.com/photos/4145199/pexels-photo-4145199.jpeg?auto=compress&cs=tinysrgb&w=1200", // exam/aptitude prep theme
      icon: <Target className="w-8 h-8 text-orange-600" />,
      tags: ["Aptitude", "Reasoning", "Maths"],
      color: "from-orange-600 to-yellow-600",
    },
  ];

  const sideServices = [
    {
      id: 4,
      title: "JEE Practice Quizzes",
      description:
        "Tackle Physics, Chemistry, and Mathematics with AI-driven quizzes that reflect JEE exam difficulty. Sharpen your problem-solving skills and identify knowledge gaps instantly.",
      image:
        "https://images.pexels.com/photos/256417/pexels-photo-256417.jpeg?auto=compress&cs=tinysrgb&w=600", // Study/engineering prep theme
      icon: <BookOpen className="w-6 h-6" />,
      color: "from-blue-600 to-indigo-600",
    },
    {
      id: 5,
      title: "NEET Exam Drills",
      description:
        "Boost your NEET preparation with customized Biology, Physics, and Chemistry quizzes. Get AI-powered insights to strengthen weak areas and build exam confidence.",
      image:
        "https://images.pexels.com/photos/4144221/pexels-photo-4144221.jpeg?auto=compress&cs=tinysrgb&w=600", // medical prep theme
      icon: <HeartPulse className="w-6 h-6" />,
      color: "from-green-600 to-teal-600",
    },
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % mainServices.length);
  };

  const prevSlide = () => {
    setCurrentSlide(
      (prev) => (prev - 1 + mainServices.length) % mainServices.length
    );
  };

  useEffect(() => {
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-purple-50 pt-16 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Master Your Knowledge with{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                  AI-Powered
                </span>{" "}
                Quizzes
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                Quiz Genius AI transforms learning into an engaging journey.
                Generate personalized quizzes, test your understanding across
                multiple subjects, and get instant feedback to accelerate your
                learning.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="shadow-xl">
                  Start Your Test
                </Button>
                {/*<Button variant="outline" size="lg">*/}
                {/*  Learn More*/}
                {/*</Button>*/}
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-2xl blur-xl opacity-20"></div>
              <img
                src="https://images.pexels.com/photos/5212687/pexels-photo-5212687.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
                alt="Person studying with laptop and notebook"
                className="relative rounded-2xl shadow-2xl w-full h-96 object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Service Section */}
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-20 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-20 relative">
            {/* Gradient background accent */}
            <div className="absolute inset-0 flex justify-center -z-10">
              <div className="w-72 h-72 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl"></div>
            </div>

            <h2 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6 tracking-tight">
              Our Services
            </h2>

            <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
              Hey! Are you a{" "}
              <span className="font-semibold text-blue-600">
                JEE, NEET, CET, or CUET aspirant
              </span>
              ? <br />
              We’ve got you covered! Discover your true potential with{" "}
              <span className="font-semibold text-purple-600">
                custom AI-powered quizzes
              </span>{" "}
              designed to match real exam challenges and help you excel.
            </p>
          </div>

          {/* Main Layout: 2/3 Left + 1/3 Right */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[600px]">
            {/* Left Section - Carousel (2/3 width) */}
            <div className="lg:col-span-2 relative">
              <div className="relative h-full bg-white rounded-3xl shadow-2xl overflow-hidden">
                {/* Carousel Container */}
                <div className="relative h-full">
                  {mainServices.map((service, index) => (
                    <div
                      key={service.id}
                      className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                        index === currentSlide
                          ? "opacity-100 translate-x-0"
                          : index < currentSlide
                          ? "opacity-0 -translate-x-full"
                          : "opacity-0 translate-x-full"
                      }`}
                    >
                      <div
                        className={`relative h-full bg-gradient-to-br ${service.color}`}
                      >
                        <img
                          src={service.image}
                          alt={service.title}
                          className="w-full h-full object-cover mix-blend-overlay"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent"></div>

                        {/* Content */}
                        <div className="absolute inset-0 p-12 flex flex-col justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="p-4 bg-white/20 backdrop-blur-sm rounded-xl text-white">
                              {service.icon}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {service.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white text-sm rounded-full border border-white/30"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-6 max-w-2xl">
                            <h3 className="text-4xl font-bold text-white leading-tight">
                              {service.title}
                            </h3>
                            <p className="text-white/90 text-lg leading-relaxed">
                              {service.description}
                            </p>
                            {/*<button className="flex items-center space-x-3 px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-all duration-300 group">*/}
                            {/*  <span className="text-lg font-semibold">Learn More</span>*/}
                            {/*  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />*/}
                            {/*</button>*/}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Navigation Arrows */}
                <button
                  onClick={prevSlide}
                  className="absolute left-6 top-1/2 -translate-y-1/2 p-3 bg-white/20 backdrop-blur-sm text-white rounded-full hover:bg-white/30 transition-all duration-300 group"
                >
                  <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform duration-300" />
                </button>
                <button
                  onClick={nextSlide}
                  className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-white/20 backdrop-blur-sm text-white rounded-full hover:bg-white/30 transition-all duration-300 group"
                >
                  <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform duration-300" />
                </button>

                {/* Dots Indicator */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-3">
                  {mainServices.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        index === currentSlide
                          ? "bg-white scale-125"
                          : "bg-white/50 hover:bg-white/75"
                      }`}
                    />
                  ))}
                </div>

                {/* View All Button */}
                <div className="absolute bottom-6 right-6">
                  <Link
                    to="/dashboard"
                    className="flex items-center space-x-3 px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-all duration-300 group"
                  >
                    <span className="font-bold text-lg">View All</span>
                    <ArrowRight className="w-6 h-6" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Section - Two Stacked Cards (1/3 width) */}
            <div className="lg:col-span-1 space-y-6">
              {sideServices.map((service, index) => (
                <div
                  key={service.id}
                  className="group bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden transform hover:-translate-y-2 h-[285px]"
                >
                  <div
                    className={`relative h-full bg-gradient-to-br ${service.color}`}
                  >
                    <img
                      src={service.image}
                      alt={service.title}
                      className="w-full h-full object-cover mix-blend-overlay group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>

                    {/* Content */}
                    <div className="absolute inset-0 p-6 flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <div className="p-3 bg-white/20 backdrop-blur-sm rounded-lg text-white">
                          {service.icon}
                        </div>
                        {/*<span className="text-white/60 text-sm font-medium">Right</span>*/}
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-xl font-bold text-white leading-tight">
                          {service.title}
                        </h4>
                        <p className="text-white/90 text-sm leading-relaxed">
                          {service.description}
                        </p>
                        <button className="flex items-center space-x-2 text-white hover:text-yellow-300 transition-colors duration-300 group/btn">
                          <Link
                            to="/dashboard"
                            className="flex items-center space-x-3 px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-all duration-300 group"
                          >
                            <span className="font-semibold">Explore</span>
                            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-300" />
                          </Link>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          {/*<div className="text-center mt-16">*/}
          {/*  <button className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 hover:from-blue-700 hover:to-purple-700">*/}
          {/*    Get Started Today*/}
          {/*  </button>*/}
          {/*</div>*/}
        </div>
      </section>

      {/*/!* Key Features Section *!/*/}
      {/*<section className="py-20 bg-white">*/}
      {/*  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">*/}
      {/*    <div className="text-center mb-16">*/}
      {/*      <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Key Features</h2>*/}
      {/*    </div>*/}
      {/*    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">*/}
      {/*      <FeatureCard*/}
      {/*        icon={<Brain className="h-8 w-8 text-blue-600" />}*/}
      {/*        title="Intelligent Question Generation"*/}
      {/*        description="Our advanced AI intelligently generates relevant questions suited for your learning style and progress level."*/}
      {/*      />*/}
      {/*      <FeatureCard*/}
      {/*        icon={<BookOpen className="h-8 w-8 text-purple-600" />}*/}
      {/*        title="Diverse Subject Coverage"*/}
      {/*        description="Explore a vast library of subjects, from science and history including any language or any topic area."*/}
      {/*      />*/}
      {/*      <FeatureCard*/}
      {/*        icon={<Zap className="h-8 w-8 text-orange-600" />}*/}
      {/*        title="Instant Feedback & Insights"*/}
      {/*        description="Receive immediate scores, detailed explanations, and performance analytics to track your progress and improve."*/}
      {/*      />*/}
      {/*    </div>*/}
      {/*  </div>*/}
      {/*</section>*/}

      {/*/!* How AI Revolutionizes Section *!/*/}
      {/*<section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">*/}
      {/*  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">*/}
      {/*    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">*/}
      {/*      <div className="space-y-8">*/}
      {/*        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">*/}
      {/*          How Our AI Revolutionizes Quiz Creation*/}
      {/*        </h2>*/}
      {/*        <p className="text-gray-600 leading-relaxed">*/}
      {/*          Our proprietary AI engine meticulously analyzes content, extracts key concepts, and crafts challenging questions, ensuring every quiz is tailored for optimal learning and retention.*/}
      {/*        </p>*/}
      {/*        <div className="space-y-6">*/}
      {/*          <ProcessStep*/}
      {/*            number={1}*/}
      {/*            title="Content Analysis"*/}
      {/*            description="AI analyzes educational content to understand the subject matter deeply"*/}
      {/*          />*/}
      {/*          <ProcessStep*/}
      {/*            number={2}*/}
      {/*            title="Question Generation"*/}
      {/*            description="AI then intelligently generates a variety of question types from MCQs to open-ended questions based on learning objectives"*/}
      {/*          />*/}
      {/*          <ProcessStep*/}
      {/*            number={3}*/}
      {/*            title="Difficulty Adjustment"*/}
      {/*            description="Questions are automatically organized by difficulty, allowing for personalized challenge levels for every student"*/}
      {/*          />*/}
      {/*          <ProcessStep*/}
      {/*            number={4}*/}
      {/*            title="Instant Feedback"*/}
      {/*            description="Each question is paired with comprehensive explanations and adaptive feedback to enhance understanding"*/}
      {/*            isLast={true}*/}
      {/*          />*/}
      {/*        </div>*/}
      {/*      </div>*/}
      {/*      <div className="relative">*/}
      {/*        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-2xl blur-xl opacity-20"></div>*/}
      {/*        <img */}
      {/*          src="https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"*/}
      {/*          alt="AI technology visualization"*/}
      {/*          className="relative rounded-2xl shadow-2xl w-full h-96 object-cover"*/}
      {/*        />*/}
      {/*      </div>*/}
      {/*    </div>*/}
      {/*  </div>*/}
      {/*</section>*/}

      {/*/!* Transform Study Habits Section *!/*/}
      {/*<section className="py-20 bg-white">*/}
      {/*  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">*/}
      {/*    <div className="text-center mb-16">*/}
      {/*      <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">*/}
      {/*        Transform Your Study Habits, Boost Your Scores*/}
      {/*      </h2>*/}
      {/*      <p className="text-xl text-gray-600 max-w-3xl mx-auto">*/}
      {/*        Discover the powerful potential of Quiz Genius AI to make your educational journey more effective and enjoyable.*/}
      {/*      </p>*/}
      {/*    </div>*/}
      {/*    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">*/}
      {/*      <BenefitCard*/}
      {/*        icon={<Users className="h-8 w-8 text-green-600" />}*/}
      {/*        title="Personalized Learning Paths"*/}
      {/*        description="Our AI adapts to your learning style, creating personalized quiz experiences that are challenging and engaging."*/}
      {/*      />*/}
      {/*      <BenefitCard*/}
      {/*        icon={<Target className="h-8 w-8 text-green-600" />}*/}
      {/*        title="Instant, Detailed Feedback"*/}
      {/*        description="Get immediate results and comprehensive explanations for every question, turning mistakes into learning opportunities."*/}
      {/*      />*/}
      {/*      <BenefitCard*/}
      {/*        icon={<BookOpen className="h-8 w-8 text-green-600" />}*/}
      {/*        title="Diverse Subject Coverage"*/}
      {/*        description="Access a vast library of subjects and topics, ensuring you can practice with any area of knowledge."*/}
      {/*      />*/}
      {/*      <BenefitCard*/}
      {/*        icon={<Award className="h-8 w-8 text-green-600" />}*/}
      {/*        title="Engaging & Gamified Experience"*/}
      {/*        description="Earn points, unlock achievements, and challenge yourself with our gamified learning environment."*/}
      {/*      />*/}
      {/*      <BenefitCard*/}
      {/*        icon={<BarChart3 className="h-8 w-8 text-green-600" />}*/}
      {/*        title="Track Your Progress"*/}
      {/*        description="Monitor your improvement with insightful charts and analytics that show your learning journey over time."*/}
      {/*      />*/}
      {/*      <BenefitCard*/}
      {/*        icon={<Smartphone className="h-8 w-8 text-green-600" />}*/}
      {/*        title="Accessible Anywhere, Anytime"*/}
      {/*        description="Study on-the-go with our mobile-friendly platform, accessible on any device around the world."*/}
      {/*      />*/}
      {/*    </div>*/}
      {/*  </div>*/}
      {/*</section>*/}

      <VisualSections />

      {/* Testimonials Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              What Our Users Say
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <TestimonialCard
              quote="Quiz Genius AI has revolutionized my study routine. The AI-generated questions are incredibly accurate, and the instant feedback helps me identify my weak spots immediately."
              name="Sarah M."
              role="Medical Student"
              avatar="https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
            />
            <TestimonialCard
              quote="As an educator, I appreciate how this platform empowers students to self-test effectively. It's user-friendly, and the variety of subjects is fantastic. A truly genius tool for learning!"
              name="Dr. Alex J."
              role="University Professor"
              avatar="https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Learning Experience?
          </h2>
          <p className="text-xl text-blue-100 mb-8 leading-relaxed">
            Join thousands of students who have already discovered the power of
            AI-driven learning.
          </p>
          <Button
            size="lg"
            className="bg-white text-blue-600 hover:bg-gray-50 shadow-xl"
          >
            Get Started Today
          </Button>
        </div>
      </section>
    </div>
  );
}

export default Home;
