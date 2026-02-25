'use client';

import { useRef, useEffect, useCallback } from 'react';

const DRAG_THRESHOLD = 5; // px — 이 이상 움직여야 드래그로 판정

export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const isDown = useRef(false);
  const isDragged = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const onPointerDown = useCallback((e: PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    isDown.current = true;
    isDragged.current = false;
    startX.current = e.clientX;
    scrollLeft.current = el.scrollLeft;
  }, []);

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!isDown.current || !ref.current) return;
    const dx = e.clientX - startX.current;
    // threshold 넘으면 드래그 시작 — 이때만 pointer capture
    if (!isDragged.current && Math.abs(dx) > DRAG_THRESHOLD) {
      isDragged.current = true;
      ref.current.setPointerCapture(e.pointerId);
      ref.current.style.cursor = 'grabbing';
    }
    if (isDragged.current) {
      ref.current.scrollLeft = scrollLeft.current - dx;
    }
  }, []);

  const onPointerUp = useCallback((e: PointerEvent) => {
    if (!ref.current) return;
    if (isDragged.current) {
      ref.current.releasePointerCapture(e.pointerId);
      ref.current.style.cursor = '';
    }
    isDown.current = false;
  }, []);

  // 드래그 후 click 이벤트 억제 (capture phase)
  const onClick = useCallback((e: MouseEvent) => {
    if (isDragged.current) {
      e.stopPropagation();
      e.preventDefault();
      isDragged.current = false;
    }
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
    el.addEventListener('click', onClick, true); // capture phase
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
      el.removeEventListener('click', onClick, true);
    };
  }, [onPointerDown, onPointerMove, onPointerUp, onClick]);

  return ref;
}
