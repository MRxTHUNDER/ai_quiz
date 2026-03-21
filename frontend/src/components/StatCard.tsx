import React from "react";
import { HelpCircle } from "lucide-react";

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  hint?: string;
  color?: "blue" | "green" | "purple" | "orange" | "teal";
}

function StatCard({
  icon,
  title,
  value,
  subtitle,
  hint,
  color = "blue",
}: StatCardProps) {
  const colorClasses = {
    blue: "text-blue-600 bg-blue-50",
    green: "text-green-600 bg-green-50",
    purple: "text-purple-600 bg-purple-50",
    orange: "text-orange-600 bg-orange-50",
    teal: "text-teal-600 bg-teal-50",
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200/80 transition-all duration-200">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div
          className={`p-2.5 rounded-xl shrink-0 ${colorClasses[color]}`}
          aria-hidden
        >
          {icon}
        </div>
        {hint ? (
          <span
            className="text-gray-400 hover:text-gray-500 cursor-help shrink-0 mt-0.5"
            title={hint}
          >
            <HelpCircle className="h-4 w-4" strokeWidth={2} aria-hidden />
            <span className="sr-only">{hint}</span>
          </span>
        ) : null}
      </div>
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      <p className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight tabular-nums">
        {value}
      </p>
      <p className="text-sm text-gray-500 mt-1 leading-snug">{subtitle}</p>
    </div>
  );
}

export default StatCard;
