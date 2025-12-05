import React from 'react';
import { FileText } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true }) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-3xl',
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full" />
        <FileText className={`${sizeClasses[size]} text-primary relative z-10`} />
      </div>
      {showText && (
        <span className={`${textSizes[size]} font-serif font-semibold tracking-tight`}>
          <span className="text-foreground">Tex</span>
          <span className="gradient-text">oditor</span>
        </span>
      )}
    </div>
  );
};

export default Logo;
