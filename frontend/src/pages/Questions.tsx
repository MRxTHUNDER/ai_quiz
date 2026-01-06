import { useState } from "react";
import GenerateQuestionsTab from "../components/GenerateQuestionsTab";
import MyQuestionsTab from "../components/MyQuestionsTab";

export default function Questions() {
  const [activeTab, setActiveTab] = useState<"generate" | "my-questions">(
    "generate"
  );

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="bg-white rounded-lg shadow-md">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("generate")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "generate"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Generate Questions
            </button>
            <button
              onClick={() => setActiveTab("my-questions")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "my-questions"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Questions Generated
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "generate" && <GenerateQuestionsTab />}
          {activeTab === "my-questions" && <MyQuestionsTab />}
        </div>
      </div>
    </div>
  );
}
