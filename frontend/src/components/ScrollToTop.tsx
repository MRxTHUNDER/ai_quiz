import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scrolls the window to top whenever the route changes.
 * Fixes the issue where navigating (e.g. "Start Your Test" -> /start-test)
 * leaves the page scrolled down from the previous view.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
