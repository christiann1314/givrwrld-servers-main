import React from 'react';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { validatePassword } from '../utils/passwordValidation';

interface PasswordStrengthIndicatorProps {
  password: string;
  showErrors?: boolean;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  showErrors = true
}) => {
  if (!password) return null;

  const validation = validatePassword(password);

  const getStrengthColor = () => {
    switch (validation.strength) {
      case 'weak':
        return 'text-red-400';
      case 'medium':
        return 'text-yellow-400';
      case 'strong':
        return 'text-emerald-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStrengthIcon = () => {
    switch (validation.strength) {
      case 'weak':
        return <AlertTriangle size={16} className="text-red-400" />;
      case 'medium':
        return <Shield size={16} className="text-yellow-400" />;
      case 'strong':
        return <CheckCircle size={16} className="text-emerald-400" />;
      default:
        return <Shield size={16} className="text-gray-400" />;
    }
  };

  const getStrengthBars = () => {
    const bars = [];
    const strengthLevel = validation.strength === 'weak' ? 1 : validation.strength === 'medium' ? 2 : 3;

    for (let i = 1; i <= 3; i++) {
      const isActive = i <= strengthLevel;
      let barColor = 'bg-gray-600';

      if (isActive) {
        if (i === 1) barColor = 'bg-red-400';
        else if (i === 2) barColor = 'bg-yellow-400';
        else barColor = 'bg-emerald-400';
      }

      bars.push(
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: '30%' }}
        />
      );
    }

    return bars;
  };

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {getStrengthIcon()}
          <span className={`text-sm font-medium ${getStrengthColor()}`}>
            Password Strength: {validation.strength.charAt(0).toUpperCase() + validation.strength.slice(1)}
          </span>
        </div>
        <div className="flex space-x-1">
          {getStrengthBars()}
        </div>
      </div>

      {showErrors && validation.errors.length > 0 && (
        <div className="space-y-1">
          {validation.errors.map((error, index) => (
            <p key={index} className="text-xs text-red-400 flex items-center space-x-1">
              <span>•</span>
              <span>{error}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
};
