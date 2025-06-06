import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false,
  icon,
  iconPosition = 'left',
  children, 
  className = '',
  ...props
}) => {
  const getVariantClasses = (): string => {
    switch(variant) {
      case 'primary':
        return 'bg-[#1A365D] hover:bg-[#2D4A73] text-white';
      case 'secondary':
        return 'bg-[#0D9488] hover:bg-[#0F766E] text-white';
      case 'success':
        return 'bg-green-600 hover:bg-green-700 text-white';
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'outline':
        return 'bg-transparent border border-[#1A365D] text-[#1A365D] hover:bg-[#1A365D]/5';
      case 'ghost':
        return 'bg-transparent text-[#1A365D] hover:bg-[#1A365D]/10';
      default:
        return 'bg-[#1A365D] hover:bg-[#2D4A73] text-white';
    }
  };

  const getSizeClasses = (): string => {
    switch(size) {
      case 'sm':
        return 'text-xs py-1.5 px-3';
      case 'md':
        return 'text-sm py-2 px-4';
      case 'lg':
        return 'text-base py-2.5 px-5';
      default:
        return 'text-sm py-2 px-4';
    }
  };

  const variantClasses = getVariantClasses();
  const sizeClasses = getSizeClasses();

  return (
    <button
      className={`
        ${variantClasses} 
        ${sizeClasses} 
        ${fullWidth ? 'w-full' : ''} 
        rounded-md font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center gap-2
        ${className}
      `}
      {...props}
    >
      {icon && iconPosition === 'left' && icon}
      {children}
      {icon && iconPosition === 'right' && icon}
    </button>
  );
};

export default Button;