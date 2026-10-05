import React, { useState, useEffect } from 'react';
import { Exempt } from './Exempt';

interface ColdStartBannerProps {
  isLoading: boolean;
  asOf: string;
}

/**
 * Cold-start banner per AQUAPULSE_V9_2_LEAN.md §5 & S6:
 * Shows "waking server — showing last snapshot (as of …)" after 3 s if server hasn't responded.
 */
export const ColdStartBanner: React.FC<ColdStartBannerProps> = ({ isLoading, asOf }) => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isLoading) {
      timer = setTimeout(() => {
        setShowBanner(true);
      }, 3000);
    } else {
      setShowBanner(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  if (!showBanner) return null;

  return (
    <div className="cold-start-banner" role="status">
      <span className="banner-icon">⚡</span>
      <span>
        Waking server — showing last snapshot (as of{' '}
        <Exempt reason="date" className="font-mono">
          {asOf}
        </Exempt>
        )
      </span>
    </div>
  );
};
