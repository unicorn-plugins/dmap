import type { ReactNode } from 'react';

interface TooltipProps {
  text: ReactNode;
  wide?: boolean;
}

/** CSS-only tooltip. Parent must have `relative group` classes. */
export function Tooltip({ text, wide }: TooltipProps) {
  return (
    <div className={`absolute top-full mt-2 bg-gray-900 dark:bg-gray-700 text-white text-xs shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none z-[100] ${
      wide
        ? '-right-4 w-72 px-3 py-2 rounded-lg whitespace-pre-line'
        : 'left-1/2 -translate-x-1/2 px-2 py-1 rounded whitespace-nowrap'
    }`}>
      {text}
    </div>
  );
}
