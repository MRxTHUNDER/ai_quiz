import React from 'react';

interface SelectionCardProps {
  icon: React.ReactNode;
  title: string;
  isSelected?: boolean;
  onClick?: () => void;
}

function SelectionCard({ icon, title, isSelected = false, onClick }: SelectionCardProps) {
  return (
    <div
      onClick={onClick}
      className={`p-6 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex flex-col items-center text-center space-y-3">
        <div className={`p-3 rounded-lg ${isSelected ? 'text-blue-600' : 'text-gray-600'}`}>
          {icon}
        </div>
        <span className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
          {title}
        </span>
      </div>
    </div>
  );
}

export default SelectionCard;