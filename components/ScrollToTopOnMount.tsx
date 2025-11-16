"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Component that scrolls to top on route changes
 * Should be mounted once in the root layout
 */
export default function ScrollToTopOnMount() {
  const pathname = usePathname();

  useEffect(() => {
    // Scroll to top on every route change
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  return null;
}

