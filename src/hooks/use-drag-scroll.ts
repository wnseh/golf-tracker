'use client';

import { useRef, useEffect, useCallback } from 'react';

export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const onPointerDown = useCallback((e: PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    isDragging.current = true;
    startX.current = e.clientX;
    scrollLeft.current = el.scrollLeft;
    el.setPointerCapture(e.pointerId);
    el.style.cursor = 'grabbing';
  }, []);

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging.current || !ref.current) return;
    const dx = e.clientX - startX.current;
    ref.current.scrollLeft = scrollLeft.current - dx;
  }, []);

  const onPointerUp = useCallback((e: PointerEvent) => {
    if (!ref.current) return;
    isDragging.current = false;
    ref.current.releasePointerCapture(e.pointerId);
    ref.current.style.cursor = '';
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
    };
  }, [onPointerDown, onPointerMove, onPointerUp]);

  return ref;
}
