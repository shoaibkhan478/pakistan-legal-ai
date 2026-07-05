import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-primary-700 hover:bg-primary-800 text-white shadow-sm',
      secondary: 'bg-navy-800 hover:bg-navy-900 text-white shadow-sm',
      outline: 'border-2 border-primary-700 text-primary-700 dark:text-primary-400 dark:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950',
      ghost: 'hover:bg-slate-100 dark:hover:bg-navy-800 text-slate-700 dark:text-slate-300',
      danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm',
      gold: 'bg-gold-600 hover:bg-gold-700 text-white shadow-sm',
    };
    const sizes = {
      sm: 'text-sm px-3 py-1.5 rounded-md',
      md: 'text-sm px-4 py-2.5 rounded-lg',
      lg: 'text-base px-6 py-3 rounded-lg',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
export default Button;
