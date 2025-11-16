import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Global hook to scroll to top on page transitions
 * Usage: Add this hook in the root layout or any component where you want automatic scroll-to-top
 */
export function useScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    // Scroll to top immediately on path change
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
}

/**
 * Utility function to manually scroll to top
 * Can be called programmatically when needed (e.g., after form submission)
 */
export function scrollToTop(behavior: 'auto' | 'smooth' | 'instant' = 'smooth') {
  window.scrollTo({ top: 0, left: 0, behavior });
}

