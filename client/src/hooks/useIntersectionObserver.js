import { useRef, useState, useEffect } from 'react';

/**
 * Reusable IntersectionObserver hook.
 * Returns [ref, inView] — attach ref to the element you want to observe.
 *
 * @param {object} options
 * @param {number} options.threshold  — visibility threshold (0–1), default 0.2
 * @param {boolean} options.triggerOnce — stop observing after first trigger, default true
 */
export default function useIntersectionObserver({ threshold = 0.2, triggerOnce = true } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (triggerOnce) {
            observer.disconnect();
          }
        } else if (!triggerOnce) {
          setInView(false);
        }
      },
      { threshold }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [threshold, triggerOnce]);

  return [ref, inView];
}
