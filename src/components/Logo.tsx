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
  const emblemSize =
    variant === 'footer'
      ? 40
      : variant === 'header'
        ? 32
        : 56;

  const content = (
    <>
      {/* Image emblem – served from public/images so it can be swapped without code changes */}
      <span className="flex-shrink-0 inline-flex items-center justify-center">
        <img
          src="/images/givrwrld-logo-512.png"
          alt="GIVRwrld logo"
          width={emblemSize}
          height={emblemSize}
          className="rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.4)]"
        />
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
