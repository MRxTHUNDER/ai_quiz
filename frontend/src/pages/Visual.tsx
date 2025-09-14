// VisualSections.tsx
import React from "react";
import {
    Brain,
    BookOpen,
    Zap,
    Users,
    Target,
    Award,
    BarChart3,
    Smartphone,
} from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Tailwind utilities used assume you have Tailwind JIT enabled.
 * Animations use motion-safe to avoid motion for users who prefer reduced motion.
 */

const FeatureCardVisual: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    image: string;
}> = ({ icon, title, description, image }) => (
    <article
        className="relative overflow-hidden rounded-2xl shadow-lg bg-white group h-80 md:h-96 transform transition-transform duration-500 hover:-translate-y-3"
        aria-label={title}
    >
        <img
            src={image}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent"></div>

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-white/20 backdrop-blur-sm text-white">
                        {icon}
                    </div>
                    <h3 className="text-lg md:text-xl font-semibold text-white drop-shadow">
                        {title}
                    </h3>
                </div>
        {/*        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-white/10 text-white">*/}
        {/*  AI-driven*/}
        {/*</span>*/}
            </div>

            <p className="mt-3 text-sm text-white/90 line-clamp-3">{description}</p>

            <div className="mt-4 flex items-center justify-between">
                <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-2 bg-white/20 text-white px-3 py-2 rounded-md backdrop-blur-sm hover:bg-white/30 transition"
                >
                    Explore
                    <svg
                        className="w-4 h-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden
                    >
                        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                </Link>

                {/*<div className="text-sm text-white/80">*/}
                {/*    <span className="font-medium">Avg. Score</span>*/}
                {/*    <div className="w-20 h-2 bg-white/20 rounded-full mt-1 overflow-hidden">*/}
                {/*        <div className="h-full bg-green-400 rounded-full" style={{ width: "68%" }} />*/}
                {/*    </div>*/}
                {/*</div>*/}
            </div>
        </div>
    </article>
);

const ProcessStepVisual: React.FC<{
    number: number;
    title: string;
    description: string;
}> = ({ number, title, description }) => (
    <div className="flex gap-4 items-start">
        <div className="flex-shrink-0">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-lg">
                {number}
            </div>
        </div>
        <div>
            <h4 className="text-lg font-semibold text-gray-900">{title}</h4>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
    </div>
);

const BenefitCardVisual: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    image?: string;
}> = ({ icon, title, description, image }) => (
    <div className="flex flex-col bg-white rounded-2xl shadow-lg overflow-hidden transform transition hover:scale-[1.02] duration-400">
        {image ? (
            <div className="h-36 md:h-44 overflow-hidden">
                <img src={image} alt={title} className="w-full h-full object-cover" loading="lazy" />
            </div>
        ) : (
            <div className="h-12" />
        )}

        <div className="p-5">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-md">{icon}</div>
                <h5 className="text-md font-semibold text-gray-900">{title}</h5>
            </div>
            <p className="mt-3 text-sm text-gray-600">{description}</p>

            {/*<div className="mt-4 flex items-center justify-between">*/}
            {/*    <div className="text-sm text-gray-500">Last practiced: 3 days ago</div>*/}
            {/*    <div className="text-sm font-medium text-indigo-600">Start →</div>*/}
            {/*</div>*/}
        </div>
    </div>
);

/* ---------- Main Exported Component ---------- */
const VisualSections: React.FC = () => {
    return (
        <div className="space-y-24">

            {/* Key Features - image heavy cards */}
            <section className="py-16 bg-gradient-to-b from-white to-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
                                Key Features
                            </h2>
                            <p className="mt-2 text-gray-600 max-w-2xl">
                                Bite-sized, image-led features that showcase what makes our AI quizzes effective.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <Link
                                to="/dashboard"
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow hover:brightness-105 transition"
                            >
                                View Dashboard
                            </Link>
                            {/*<button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white hover:shadow transition">*/}
                            {/*    Demo Quiz*/}
                            {/*</button>*/}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FeatureCardVisual
                            image="https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=1200"
                            icon={<Brain className="w-6 h-6" />}
                            title="Intelligent Question Generation"
                            description="AI crafts questions matching current syllabus & difficulty — adaptive and context-aware."
                        />
                        <FeatureCardVisual
                            image="https://images.pexels.com/photos/256417/pexels-photo-256417.jpeg?auto=compress&cs=tinysrgb&w=1200"
                            icon={<BookOpen className="w-6 h-6" />}
                            title="Diverse Subject Coverage"
                            description="Complete coverage for JEE/NEET/CET/CUET — from core concepts to advanced problems."
                        />
                        <FeatureCardVisual
                            image="https://images.pexels.com/photos/4145199/pexels-photo-4145199.jpeg?auto=compress&cs=tinysrgb&w=1200"
                            icon={<Zap className="w-6 h-6" />}
                            title="Instant Feedback & Insights"
                            description="Step-by-step explanations, performance analytics and tailored next-step suggestions."
                        />
                    </div>
                </div>
            </section>

            {/* How AI Revolutionizes - split image + vertical process with subtle animation */}
            <section className="py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
                                How our AI builds smarter quizzes
                            </h2>
                            <p className="text-gray-600">
                                A fast pipeline — from content ingestion to personalized quizzes — that's continuously improving with each attempt.
                            </p>

                            <div className="space-y-5 mt-6">
                                <div className="bg-white p-5 rounded-2xl shadow-md">
                                    <ProcessStepVisual
                                        number={1}
                                        title="Content Analysis"
                                        description="AI ingests syllabus and reference material and extracts core concepts."
                                    />
                                </div>
                                <div className="bg-white p-5 rounded-2xl shadow-md">
                                    <ProcessStepVisual
                                        number={2}
                                        title="Question Generation"
                                        description="Multiple question types generated with mapped difficulty and learning targets."
                                    />
                                </div>
                                <div className="bg-white p-5 rounded-2xl shadow-md">
                                    <ProcessStepVisual
                                        number={3}
                                        title="Adaptive Difficulty"
                                        description="Questions scale based on past performance to give the right level of challenge."
                                    />
                                </div>
                                <div className="bg-white p-5 rounded-2xl shadow-md">
                                    <ProcessStepVisual
                                        number={4}
                                        title="Instant Feedback"
                                        description="Detailed solutions and analytics to convert errors into learning wins."
                                    />
                                </div>
                            </div>

                            {/*<div className="mt-6 flex gap-3">*/}
                            {/*    <Link to="/dashboard" className="px-4 py-2 rounded-md bg-indigo-600 text-white">*/}
                            {/*        Try a sample quiz*/}
                            {/*    </Link>*/}
                            {/*    <button className="px-4 py-2 rounded-md border">Learn more</button>*/}
                            {/*</div>*/}
                        </div>

                        <div className="relative">
                            <div className="rounded-2xl overflow-hidden shadow-2xl">
                                <div className="relative h-96 md:h-[520px]">
                                    <img
                                        src="https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
                                        alt="AI visual"
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                    {/*<div className="absolute -bottom-8 left-6 w-56 md:w-80 bg-white rounded-2xl p-4 shadow-lg transform translate-y-0 motion-safe:animate-fade-in-up">*/}
                                    {/*    <div className="flex items-center gap-3">*/}
                                    {/*        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">*/}
                                    {/*            <Zap className="w-5 h-5" />*/}
                                    {/*        </div>*/}
                                    {/*        <div>*/}
                                    {/*            <div className="text-sm font-semibold">Real-time Question Tuning</div>*/}
                                    {/*            <div className="text-xs text-gray-500">Model adapts after every attempt</div>*/}
                                    {/*        </div>*/}
                                    {/*    </div>*/}

                                    {/*    <div className="mt-3">*/}
                                    {/*        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">*/}
                                    {/*            <div className="h-full bg-gradient-to-r from-green-400 to-blue-500" style={{ width: "72%" }} />*/}
                                    {/*        </div>*/}
                                    {/*    </div>*/}
                                    {/*</div>*/}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Transform Study Habits - grid of visual benefit cards */}
            <section className="py-16 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
                            Transform your study habits — boost your score
                        </h2>
                        <p className="mt-2 text-gray-600 max-w-2xl mx-auto">
                            Visual, gamified and mobile-ready features that keep learners coming back.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        <BenefitCardVisual
                            icon={<Users className="w-5 h-5 text-green-600" />}
                            title="Personalized Paths"
                            description="Adaptive learning paths tailored to each student's strengths and weak spots."
                            image="https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=1200"
                        />
                        <BenefitCardVisual
                            icon={<Target className="w-5 h-5 text-green-600" />}
                            title="Instant Feedback"
                            description="Detailed explanations and smart hints help you learn faster."
                            image="https://images.pexels.com/photos/256417/pexels-photo-256417.jpeg?auto=compress&cs=tinysrgb&w=1200"
                        />
                        <BenefitCardVisual
                            icon={<BookOpen className="w-5 h-5 text-green-600" />}
                            title="Wide Subject Library"
                            description="Practice across all subjects and topic levels — from basics to Olympiad-style problems."
                            image="https://images.pexels.com/photos/4145199/pexels-photo-4145199.jpeg?auto=compress&cs=tinysrgb&w=1200"
                        />
                        <BenefitCardVisual
                            icon={<Award className="w-5 h-5 text-green-600" />}
                            title="Gamified Rewards"
                            description="Earn badges, streaks and leaderboards to keep motivation high."
                            image="https://images.pexels.com/photos/4145191/pexels-photo-4145191.jpeg?auto=compress&cs=tinysrgb&w=1200"
                        />
                        <BenefitCardVisual
                            icon={<BarChart3 className="w-5 h-5 text-green-600" />}
                            title="Progress Analytics"
                            description="Visual charts that reveal improvement areas and time investment."
                            image="https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=1200"
                        />
                        <BenefitCardVisual
                            icon={<Smartphone className="w-5 h-5 text-green-600" />}
                            title="Mobile Ready"
                            description="Seamless experience across phone and tablet for studying on the go."
                            image="https://images.pexels.com/photos/4348404/pexels-photo-4348404.jpeg?auto=compress&cs=tinysrgb&w=1200"
                        />
                    </div>
                </div>
            </section>
        </div>
    );
};

export default VisualSections;
