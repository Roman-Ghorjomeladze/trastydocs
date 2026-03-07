import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom';
  delay?: number;
}

export function Tooltip({ content, children, position = 'top', delay = 300 }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        x: rect.left + rect.width / 2,
        y: position === 'top' ? rect.top : rect.bottom,
      });
      setVisible(true);
    }, delay);
  }, [delay, position]);

  const hide = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setVisible(false);
  }, []);

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className="inline-flex items-center shrink-0"
      >
        {children}
      </div>
      {visible &&
        createPortal(
          <div
            role="tooltip"
            className="fixed z-[9999] pointer-events-none animate-fade-in"
            style={{
              left: coords.x,
              top: position === 'top' ? coords.y - 6 : coords.y + 6,
              transform: position === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
            }}
          >
            <div className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-foreground text-background shadow-lg whitespace-nowrap">
              {content}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
