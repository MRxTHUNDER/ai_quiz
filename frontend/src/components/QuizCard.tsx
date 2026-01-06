import React from 'react';
import { useNavigate } from 'react-router-dom';

interface QuizCardProps {
  subject: string;
  score: string;
  date: string;
  icon: React.ReactNode;
  color?: 'blue' | 'purple' | 'green' | 'orange' | 'teal';
  attemptId?: string;
}

function QuizCard({ subject, score, date, icon, color = 'blue', attemptId }: QuizCardProps) {
  const navigate = useNavigate();
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50',
    purple: 'text-purple-600 bg-purple-50',
    green: 'text-green-600 bg-green-50',
    orange: 'text-orange-600 bg-orange-50',
    teal: 'text-teal-600 bg-teal-50'
  };

  const handleClick = () => {
    if (attemptId) {
      navigate(`/test/${attemptId}/result`);
    }
  };

  return (
    <div 
      className="bg-white p-6 rounded-xl border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <button 
          className="text-green-600 text-sm font-medium hover:text-green-700"
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
        >
          Review
        </button>
      </div>
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-900">{subject}</h3>
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-2xl font-bold ${colorClasses[color].split(' ')[0]}`}>
              {score}
            </div>
            <div className="text-sm text-gray-600">Score</div>
          </div>
          <div className="text-sm text-gray-500">{date}</div>
        </div>
      </div>
    </div>
  );
}

export default QuizCard;