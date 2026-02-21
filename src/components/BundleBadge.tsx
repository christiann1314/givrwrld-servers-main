import * as React from 'react';
import { getBundleColor, getBundleName } from '../utils/bundleUtils';

interface BundleBadgeProps {
  bundleId: string;
  className?: string;
}

const BundleBadge: React.FC<BundleBadgeProps> = ({ bundleId, className = '' }) => {
  if (bundleId === 'none') return null;
  
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getBundleColor(bundleId)} ${className}`}>
      {getBundleName(bundleId)}
    </span>
  );
};

export default BundleBadge;