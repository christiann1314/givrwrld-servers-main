import * as React from 'react';
import { Link } from 'react-router-dom';

export type LogoVariant = 'full' | 'header' | 'footer' | 'icon';

export interface LogoProps {
  variant?: LogoVariant;
  /** When true, wrap in Link to "/". Default true when variant is header/footer. */
  linkToHome?: boolean;
  className?: string;
}

const taglineGreen = '#00e676'; // brand lime, matches emerald-500

/**
 * GIVRwrld logo: circular emblem (flame + gradient rings) + "givrwrld" + "BUILD WHAT'S NEXT".
 * Use variant to control layout (header = compact, footer = with givrwrld.com, full = all elements).
 */
const Logo: React.FC<LogoProps> = ({
  variant = 'full',
  linkToHome = variant === 'header' || variant === 'footer',
  className = '',
}) => {
  const content = (
    <>
      {/* Circular emblem: flame + rings */}
      <span className="flex-shrink-0 inline-flex items-center justify-center">
        <svg
          width={variant === 'footer' ? 40 : variant === 'header' ? 32 : 56}
          height={variant === 'footer' ? 40 : variant === 'header' ? 32 : 56}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <defs>
            <linearGradient id="logo-flame" x1="32" y1="48" x2="32" y2="16" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f97316" />
              <stop offset="0.5" stopColor="#fbbf24" />
              <stop offset="1" stopColor="#fde047" />
            </linearGradient>
            <linearGradient id="logo-ring" x1="0" y1="32" x2="64" y2="32" gradientUnits="userSpaceOnUse">
              <stop stopColor="#fde047" />
              <stop offset="0.35" stopColor="#a3e635" />
              <stop offset="0.65" stopColor="#00e676" />
              <stop offset="1" stopColor="#0d9488" />
            </linearGradient>
          </defs>
          {/* Outer white ring */}
          <circle cx="32" cy="32" r="30" fill="none" stroke="white" strokeWidth="1.5" />
          {/* Gradient ring */}
          <circle cx="32" cy="32" r="26" fill="none" stroke="url(#logo-ring)" strokeWidth="6" />
          {/* Inner white ring */}
          <circle cx="32" cy="32" r="18" fill="none" stroke="white" strokeWidth="1" />
          {/* Flame */}
          <path
            d="M32 44c-6-4-10-10-10-16c0-6 4-10 8-10c2 0 4 1 4 4c0 2-2 4-2 6c0 2 2 4 4 4c2 0 4-2 4-4c0-2-2-4-2-6c0-3 2-4 4-4c4 0 8 4 8 10c0 6-4 12-10 16z"
            fill="url(#logo-flame)"
          />
        </svg>
      </span>
      {(variant === 'full' || variant === 'header' || variant === 'footer') && (
        <span className={`flex flex-col ${variant === 'footer' ? 'items-center' : 'items-start'} justify-center`}>
          <span className="text-white font-semibold tracking-tight lowercase leading-tight" style={{ fontFamily: 'inherit' }}>
            givrwrld
          </span>
          {(variant === 'full' || variant === 'header' || variant === 'footer') && (
            <span
              className="text-[0.65rem] sm:text-xs font-medium uppercase tracking-widest leading-tight"
              style={{ color: taglineGreen }}
            >
              BUILD WHAT'S NEXT
            </span>
          )}
          {variant === 'footer' && (
            <span className="text-gray-400 text-sm lowercase mt-0.5">givrwrld.com</span>
          )}
        </span>
      )}
    </>
  );

  const wrapperClass =
    variant === 'header'
      ? `flex items-center gap-2 ${className}`
      : variant === 'footer'
        ? `flex flex-col items-center gap-1 ${className}`
        : `flex flex-col items-center gap-3 ${className}`;

  if (linkToHome && (variant === 'header' || variant === 'footer')) {
    return (
      <Link to="/" className={`${wrapperClass} hover:opacity-90 transition-opacity`}>
        {content}
      </Link>
    );
  }

  if (linkToHome && variant === 'full') {
    return (
      <Link to="/" className={`${wrapperClass} hover:opacity-90 transition-opacity`}>
        {content}
      </Link>
    );
  }

  return <div className={wrapperClass}>{content}</div>;
};

export default Logo;
