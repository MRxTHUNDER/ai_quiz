import React from 'react';

interface TeamCardProps {
  name: string;
  role: string;
  description: string;
  avatar: string;
}

function TeamCard({ name, role, description, avatar }: TeamCardProps) {
  return (
    <div className="text-center">
      <div className="mb-4">
        <img 
          src={avatar} 
          alt={name}
          className="w-24 h-24 rounded-full mx-auto object-cover"
        />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{name}</h3>
      <p className="text-blue-600 text-sm font-medium mb-3">{role}</p>
      <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

export default TeamCard;