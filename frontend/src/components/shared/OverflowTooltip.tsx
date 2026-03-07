import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface OverflowTooltipProps {
  children: string | number | null | undefined;
  className?: string;
  as?: 'td' | 'div' | 'span' | 'p';
}

/**
 * Wraps text content and shows a tooltip on hover ONLY if the text is truncated.
 * Detects overflow via scrollWidth > clientWidth comparison.
 * Use this around any table cell or element with `truncate` / `max-w-*` classes.
 */
export function OverflowTooltip({
  children,
  className = '',
  as: Tag = 'span',
}: OverflowTooltipProps) {
  const textRef = useRef<HTMLElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  const text = children == null ? '' : String(children);

  const show = useCallback(() => {
    const el = textRef.current;
    if (!el) return;
    // Only show tooltip if text is actually truncated
    if (el.scrollWidth <= el.clientWidth) return;

    timeoutRef.current = setTimeout(() => {
      const rect = el.getBoundingClientRect();
      setCoords({
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
      setVisible(true);
    }, 400);
  }, []);

  const hide = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setVisible(false);
  }, []);

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  return (
    <>
      <Tag
        ref={textRef as React.Ref<never>}
        className={`truncate block ${className}`}
        onMouseEnter={show}
        onMouseLeave={hide}
      >
        {text || '\u2014'}
      </Tag>
      {visible &&
        createPortal(
          <div
            role="tooltip"
            className="fixed z-[9999] pointer-events-none"
            style={{
              left: coords.x,
              top: coords.y - 6,
              transform: 'translate(-50%, -100%)',
              animation: 'tooltip-in 0.15s ease-out forwards',
            }}
          >
            <div className="px-3 py-2 text-xs font-medium rounded-lg bg-foreground text-background shadow-lg max-w-xs break-words">
              {text}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
