"use client";

import { useEffect, useRef, useState } from "react";

// Backs every heavy visualization's lazy-mount: the actual Canvas is only
// created once its container has scrolled near the viewport, not on
// initial page load - keeps the 3D bundle's cost off the critical path for
// a user who never scrolls down to it. `once` (default) stops observing
// after the first intersection, since nothing here needs to unmount again
// once it's been shown.
export function useInView<T extends HTMLElement>(options?: { rootMargin?: string }) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || inView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: options?.rootMargin ?? "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  return { ref, inView };
}
