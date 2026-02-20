/**
 * 슬래시 명령 자동완성 - 프롬프트 모드에서 `/` 입력 시 스킬 목록 드롭다운
 *
 * 기능:
 * - `/` 입력 시 전체 스킬 목록 표시
 * - 타이핑에 따라 스킬명/설명 필터링
 * - 키보드 탐색 (↑↓ + Enter/Tab 선택 + Escape 닫기)
 * - 클릭으로 스킬 선택
 *
 * @module components/SlashCommandMenu
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { SkillMeta } from '@dmap-web/shared';

interface UseSlashCommandMenuOptions {
  inputValue: string;
  skills: SkillMeta[];
  isPromptMode: boolean;
  onSelect: (fullCommand: string) => void;
}

/**
 * 슬래시 명령 자동완성 훅
 * @returns isVisible - 메뉴 표시 여부, menuElement - 렌더링할 JSX, handleKeyDown - textarea onKeyDown에서 호출
 */
export function useSlashCommandMenu({ inputValue, skills, isPromptMode, onSelect }: UseSlashCommandMenuOptions) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // `/` 이후 검색어 추출
  const slashContent = inputValue.startsWith('/') ? inputValue.slice(1).toLowerCase() : '';

  // 스킬 필터링
  const filtered = useMemo(() =>
    skills
      .filter(s => s.name !== '__prompt__')
      .filter(s => {
        if (!slashContent) return true;
        return (
          s.name.toLowerCase().includes(slashContent) ||
          s.displayName.toLowerCase().includes(slashContent) ||
          s.description.toLowerCase().includes(slashContent)
        );
      }),
    [skills, slashContent],
  );

  const isVisible = isPromptMode && inputValue.startsWith('/') && !inputValue.includes(' ') && filtered.length > 0 && !dismissed;

  // 검색어 변경 시 인덱스 초기화 + dismiss 해제
  useEffect(() => {
    setSelectedIndex(0);
    setDismissed(false);
  }, [slashContent]);

  // `/`가 아닌 입력으로 변경 시 dismiss 해제
  useEffect(() => {
    if (!inputValue.startsWith('/')) setDismissed(false);
  }, [inputValue]);

  // 선택 항목 스크롤
  useEffect(() => {
    if (isVisible) {
      itemRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, isVisible]);

  /** textarea onKeyDown에서 호출. 처리했으면 true 반환 */
  const handleKeyDown = useCallback((e: React.KeyboardEvent): boolean => {
    if (!isVisible) return false;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1));
        return true;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        return true;
      case 'Enter':
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          if (filtered[selectedIndex]) onSelect(`/${filtered[selectedIndex].name} `);
          return true;
        }
        return false;
      case 'Tab':
        e.preventDefault();
        if (filtered[selectedIndex]) onSelect(`/${filtered[selectedIndex].name} `);
        return true;
      case 'Escape':
        e.preventDefault();
        setDismissed(true);
        return true;
      default:
        return false;
    }
  }, [isVisible, filtered, selectedIndex, onSelect]);

  const menuElement = isVisible ? (
    <div className="absolute bottom-full left-0 right-0 mb-1 max-h-64 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50">
      <div className="px-3 py-1.5 text-xs text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-700 flex justify-between">
        <span>/ 명령어 {filtered.length > 0 && `(${filtered.length})`}</span>
        <span className="text-gray-300 dark:text-gray-600">↑↓ 탐색 · Enter 선택 · Esc 닫기</span>
      </div>
      {filtered.map((skill, idx) => (
        <div
          key={skill.name}
          ref={el => { itemRefs.current[idx] = el; }}
          onClick={() => onSelect(`/${skill.name} `)}
          onMouseEnter={() => setSelectedIndex(idx)}
          className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
            idx === selectedIndex
              ? 'bg-blue-50 dark:bg-blue-900/30'
              : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
          }`}
        >
          <span className="text-base flex-shrink-0">{skill.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 font-mono">
                /{skill.name}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                {skill.category}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {skill.displayName !== skill.name ? skill.displayName : skill.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  ) : null;

  return { isVisible, menuElement, handleKeyDown };
}
