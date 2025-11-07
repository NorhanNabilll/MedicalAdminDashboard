'use client';

import { useEffect } from 'react';

export function AuthNavigationHandler() {
  useEffect(() => {
    const handleUnauthorized = () => {
      window.location.replace('/login'); // ✅ replace بدل href
    };

    const handleNavigateHome = () => {
      window.location.replace('/'); // ✅ replace بدل href
    };

    window.addEventListener('unauthorized', handleUnauthorized);
    window.addEventListener('navigateHome', handleNavigateHome);
    
    return () => {
      window.removeEventListener('unauthorized', handleUnauthorized);
      window.removeEventListener('navigateHome', handleNavigateHome);
    };
  }, []);

  return null;
}