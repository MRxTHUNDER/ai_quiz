import React from 'react';

interface SubjectCardProps {
  icon: React.ReactNode;
  title: string;
  color?: 'green' | 'blue' | 'purple' | 'orange' | 'teal';
}

function SubjectCard({ icon, title, color = 'green' }: SubjectCardProps) {
  const colorClasses = {
    green: 'text-green-600 bg-green-50 hover:bg-green-100',
    blue: 'text-blue-600 bg-blue-50 hover:bg-blue-100',
    purple: 'text-purple-600 bg-purple-50 hover:bg-purple-100',
    orange: 'text-orange-600 bg-orange-50 hover:bg-orange-100',
    teal: 'text-teal-600 bg-teal-50 hover:bg-teal-100'
  };

  return (
    <div className={`p-6 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md ${colorClasses[color]}`}>
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="p-3">
          {icon}
        </div>
        <span className="font-medium text-gray-900">{title}</span>
      </div>
    </div>
  );
}

export default SubjectCard;