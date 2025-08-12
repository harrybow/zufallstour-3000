import { useEffect, useState } from "react";

export default function useScrollTop() {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setShowScrollTop(window.scrollY > window.innerHeight * 1.5);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return { showScrollTop, scrollToTop };
}
