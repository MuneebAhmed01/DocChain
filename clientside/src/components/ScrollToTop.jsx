import { useEffect, useLayoutEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const resetWindowScroll = () => {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
};

const ScrollToTop = () => {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const isSpecialityRoute =
    location.pathname.startsWith("/doctors/") && location.pathname !== "/doctors";
  const shouldPreserveHashScroll = location.pathname === "/" && Boolean(location.hash);

  useEffect(() => {
    if (!("scrollRestoration" in window.history)) return;

    window.history.scrollRestoration = "manual";
  }, []);

  useLayoutEffect(() => {
    if (shouldPreserveHashScroll && !isSpecialityRoute) return;

    // Reset before paint, then repeat after render to override restoration.
    resetWindowScroll();

    const frameId = window.requestAnimationFrame(resetWindowScroll);
    const timeoutId = window.setTimeout(resetWindowScroll, 0);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [isSpecialityRoute, location.key, location.pathname, shouldPreserveHashScroll]);

  useEffect(() => {
    const handlePageShow = () => {
      if (!isSpecialityRoute) return;
      resetWindowScroll();
    };

    const handlePopState = () => {
      if (!window.location.pathname.startsWith("/doctors/")) return;
      resetWindowScroll();
    };

    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isSpecialityRoute]);

  useEffect(() => {
    const toggleVisibility = () => {
      setVisible(window.scrollY > 300);
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <button
      onClick={scrollToTop}
      className={`
        fixed bottom-6 right-6 z-50
        w-12 h-12 rounded-full
        bg-blue-600 text-white
        flex items-center justify-center
        shadow-lg
        transition-all duration-300
        ${visible ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"}
      `}
      aria-label="Scroll to top"
    >
      ↑
    </button>
  );
};

export default ScrollToTop;
