import { useState, useCallback, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { DraggableResizableDialog } from './DraggableResizableDialog.js';
import { useAppStore } from '../stores/appStore.js';
import { useT } from '../i18n/index.js';
import { useLangStore } from '../stores/langStore.js';
import { API_BASE } from '@dmap-web/shared';
import type { MenuConfig, MenuSubcategory, MenuSkillItem } from '@dmap-web/shared';

interface Props {
  onClose: () => void;
}

type CategoryKey = 'router' | 'utility' | 'external';

/** Drag source: which skill is being dragged */
interface DragSource {
  subIdx: number;
  skillIdx: number;
  item: MenuSkillItem;
}

/** Drop target: where the skill will be inserted */
interface DropTarget {
  subIdx: number;
  insertIdx: number;
}

/** Flat drag source: for utility / external categories */
interface FlatDragSource {
  category: 'utility' | 'external';
  skillIdx: number;
  item: MenuSkillItem;
}

/** Flat drop target: for utility / external categories */
interface FlatDropTarget {
  category: 'utility' | 'external';
  insertIdx: number;
}

const CATEGORY_LABELS: Record<CategoryKey, { ko: string; en: string }> = {
  router: { ko: '라우터', en: 'Router' },
  utility: { ko: '유틸리티', en: 'Utility' },
  external: { ko: '외부 연동', en: 'External' },
};

export function MenuManageDialog({ onClose }: Props) {
  const { menus, saveMenus, selectedPlugin } = useAppStore(useShallow((s) => ({
    menus: s.menus,
    saveMenus: s.saveMenus,
    selectedPlugin: s.selectedPlugin,
  })));
  const { lang } = useLangStore();
  const t = useT();

  const [draft, setDraft] = useState<MenuConfig>(() => {
    if (menus) return JSON.parse(JSON.stringify(menus));
    return { router: [], utility: [], external: [] };
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAiConfirm, setShowAiConfirm] = useState(false);
  const [useSubcategories, setUseSubcategories] = useState(() => {
    // Subcategories are "in use" only when there are 2+ subcategories
    if (!menus) return false;
    return menus.router.length > 1;
  });

  // ─── Drag & Drop state (router) ───
  const dragSourceRef = useRef<DragSource | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // ─── Drag & Drop state (utility / external) ───
  const flatDragSourceRef = useRef<FlatDragSource | null>(null);
  const [flatDropTarget, setFlatDropTarget] = useState<FlatDropTarget | null>(null);
  const [isFlatDragging, setIsFlatDragging] = useState(false);
  const [foreignDragOver, setForeignDragOver] = useState<CategoryKey | null>(null);

  // ─── Subcategory memory: remember structure when toggling off ───
  const savedCategorizedRef = useRef<MenuSubcategory[] | null>(null);

  // ─── Toggle subcategory usage ───

  const handleToggleSubcategories = useCallback(() => {
    if (useSubcategories) {
      // Turning OFF: save current structure, merge into flat
      savedCategorizedRef.current = JSON.parse(JSON.stringify(draft.router));
      const allSkills = draft.router.flatMap(sub => sub.skills);
      setDraft(d => ({
        ...d,
        router: [{ id: 'default', labels: { ko: '기본', en: 'Default' }, skills: allSkills }],
      }));
      setUseSubcategories(false);
    } else {
      // Turning ON: restore previous structure if available
      if (savedCategorizedRef.current && savedCategorizedRef.current.length > 1) {
        const saved = savedCategorizedRef.current;
        savedCategorizedRef.current = null;
        setDraft(d => ({ ...d, router: saved }));
      }
      setUseSubcategories(true);
    }
  }, [useSubcategories, draft.router]);

  // ─── Subcategory operations (router only) ───

  const addSubcategory = useCallback(() => {
    setDraft((prev) => ({
      ...prev,
      router: [
        ...prev.router,
        {
          id: `sub-${Date.now()}`,
          labels: { ko: t('menu.newSubcategory'), en: 'New Subcategory' },
          skills: [],
        },
      ],
    }));
  }, [t]);

  const removeSubcategory = useCallback((subIdx: number) => {
    setDraft((prev) => {
      const next = { ...prev, router: [...prev.router] };
      next.router.splice(subIdx, 1);
      return next;
    });
  }, []);

  const updateSubcategoryLabel = useCallback((subIdx: number, langKey: 'ko' | 'en', value: string) => {
    setDraft((prev) => {
      const next = { ...prev, router: prev.router.map((s, i) => i === subIdx ? { ...s, labels: { ...s.labels, [langKey]: value } } : s) };
      return next;
    });
  }, []);

  const moveSubcategory = useCallback((subIdx: number, dir: -1 | 1) => {
    setDraft((prev) => {
      const arr = [...prev.router];
      const targetIdx = subIdx + dir;
      if (targetIdx < 0 || targetIdx >= arr.length) return prev;
      [arr[subIdx], arr[targetIdx]] = [arr[targetIdx], arr[subIdx]];
      return { ...prev, router: arr };
    });
  }, []);

  // ─── Flat skill operations (utility / external) ───

  const updateFlatSkillLabel = useCallback((category: 'utility' | 'external', skillIdx: number, langKey: 'ko' | 'en', value: string) => {
    setDraft((prev) => ({
      ...prev,
      [category]: prev[category].map((sk, i) => i === skillIdx ? { ...sk, labels: { ...sk.labels, [langKey]: value } } : sk),
    }));
  }, []);

  // ─── Flat drag & drop handlers (utility / external) ───

  const handleFlatDragStart = useCallback((e: React.DragEvent, category: 'utility' | 'external', skillIdx: number, item: MenuSkillItem) => {
    flatDragSourceRef.current = { category, skillIdx, item };
    setIsFlatDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.name);
  }, []);

  const handleFlatDragEnd = useCallback(() => {
    flatDragSourceRef.current = null;
    setFlatDropTarget(null);
    setIsFlatDragging(false);
    setForeignDragOver(null);
  }, []);

  const handleFlatDragOverSkill = useCallback((e: React.DragEvent, category: 'utility' | 'external', insertIdx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setFlatDropTarget({ category, insertIdx });
  }, []);

  const handleFlatDrop = useCallback((e: React.DragEvent, targetCategory: 'utility' | 'external', targetInsertIdx: number) => {
    e.preventDefault();
    const source = flatDragSourceRef.current;
    if (!source || source.category !== targetCategory) return;

    setDraft((prev) => {
      const arr = [...prev[targetCategory]];
      arr.splice(source.skillIdx, 1);
      let adjustedIdx = targetInsertIdx;
      if (source.skillIdx < targetInsertIdx) adjustedIdx--;
      arr.splice(adjustedIdx, 0, source.item);
      return { ...prev, [targetCategory]: arr };
    });

    flatDragSourceRef.current = null;
    setFlatDropTarget(null);
    setIsFlatDragging(false);
    setForeignDragOver(null);
  }, []);

  // ─── Skill operations within subcategory (router) ───

  const moveSkillInSubcat = useCallback((subIdx: number, skillIdx: number, dir: -1 | 1) => {
    setDraft((prev) => {
      const sub = { ...prev.router[subIdx], skills: [...prev.router[subIdx].skills] };
      const targetIdx = skillIdx + dir;
      if (targetIdx < 0 || targetIdx >= sub.skills.length) return prev;
      [sub.skills[skillIdx], sub.skills[targetIdx]] = [sub.skills[targetIdx], sub.skills[skillIdx]];
      const router = prev.router.map((s, i) => i === subIdx ? sub : s);
      return { ...prev, router };
    });
  }, []);

  const updateSkillLabel = useCallback((subIdx: number | null, skillIdx: number, langKey: 'ko' | 'en', value: string) => {
    setDraft((prev) => {
      if (subIdx === null) return prev;
      const sub = { ...prev.router[subIdx], skills: prev.router[subIdx].skills.map((sk, i) => i === skillIdx ? { ...sk, labels: { ...sk.labels, [langKey]: value } } : sk) };
      return { ...prev, router: prev.router.map((s, i) => i === subIdx ? sub : s) };
    });
  }, []);

  // ─── Drag & Drop handlers ───

  const handleDragStart = useCallback((e: React.DragEvent, subIdx: number, skillIdx: number, item: MenuSkillItem) => {
    dragSourceRef.current = { subIdx, skillIdx, item };
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.name);
  }, []);

  const handleDragEnd = useCallback(() => {
    dragSourceRef.current = null;
    setDropTarget(null);
    setIsDragging(false);
    setForeignDragOver(null);
  }, []);

  const handleDragOverSkill = useCallback((e: React.DragEvent, subIdx: number, insertIdx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget({ subIdx, insertIdx });
  }, []);

  const handleDragOverEmpty = useCallback((e: React.DragEvent, subIdx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget({ subIdx, insertIdx: 0 });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetSubIdx: number, targetInsertIdx: number) => {
    e.preventDefault();
    const source = dragSourceRef.current;
    if (!source) return;

    setDraft((prev) => {
      const router = prev.router.map(sub => ({ ...sub, skills: [...sub.skills] }));

      // Remove from source
      router[source.subIdx].skills.splice(source.skillIdx, 1);

      // Adjust insert index if same subcategory and removing before insert point
      let adjustedIdx = targetInsertIdx;
      if (source.subIdx === targetSubIdx && source.skillIdx < targetInsertIdx) {
        adjustedIdx--;
      }

      // Insert at target
      router[targetSubIdx].skills.splice(adjustedIdx, 0, source.item);

      return { ...prev, router };
    });

    dragSourceRef.current = null;
    setDropTarget(null);
    setIsDragging(false);
  }, []);

  // ─── AI Recommend ───

  const handleAiRecommendClick = useCallback(() => {
    if (!selectedPlugin || aiLoading) return;
    setShowAiConfirm(true);
  }, [selectedPlugin, aiLoading]);

  const handleAiRecommendConfirm = useCallback(async () => {
    setShowAiConfirm(false);
    if (!selectedPlugin) return;

    setAiLoading(true);
    try {
      const res = await fetch(`${API_BASE}/plugins/${selectedPlugin.id}/menus/ai-recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang }),
      });
      if (res.ok) {
        const data: MenuConfig = await res.json();
        setDraft(data);
        // Auto-toggle subcategory mode based on AI result
        setUseSubcategories(data.router.length > 1);
        savedCategorizedRef.current = null;
      }
    } catch {
      // ignore
    } finally {
      setAiLoading(false);
    }
  }, [selectedPlugin, lang]);

  // ─── Save ───

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveMenus(draft);
      onClose();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }, [draft, saveMenus, onClose]);

  // ─── Render helpers ───

  const renderSkillRow = (item: MenuSkillItem, subIdx: number, skillIdx: number, totalSkills: number) => {
    const isDropAbove = dropTarget?.subIdx === subIdx && dropTarget.insertIdx === skillIdx;
    const isDropBelow = dropTarget?.subIdx === subIdx && dropTarget.insertIdx === skillIdx + 1 && skillIdx === totalSkills - 1;
    const isBeingDragged = isDragging && dragSourceRef.current?.subIdx === subIdx && dragSourceRef.current?.skillIdx === skillIdx;

    return (
      <div key={item.name}>
        {/* Drop indicator above */}
        {isDropAbove && (
          <div className="h-0.5 bg-blue-400 rounded mx-2 my-0.5" />
        )}
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, subIdx, skillIdx, item)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOverSkill(e, subIdx, skillIdx)}
          onDrop={(e) => handleDrop(e, subIdx, skillIdx)}
          className={`flex items-center gap-2 py-1.5 px-2 rounded transition-opacity ${
            isBeingDragged ? 'opacity-30' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
          } group cursor-grab active:cursor-grabbing`}
        >
          {/* Drag handle */}
          <span className="text-gray-300 dark:text-gray-600 text-sm select-none">&#8942;&#8942;</span>
          {/* Skill name (read-only) */}
          <span className="text-sm text-gray-500 dark:text-gray-400 w-24 truncate shrink-0" title={item.name}>
            {item.name}
          </span>
          {/* KO label (20자 이내) */}
          <input
            type="text"
            value={item.labels.ko}
            maxLength={20}
            onChange={(e) => updateSkillLabel(subIdx, skillIdx, 'ko', e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 min-w-0 text-sm px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:border-blue-400 outline-none"
            placeholder="한국어"
          />
          {/* EN label (20자 이내) */}
          <input
            type="text"
            value={item.labels.en}
            maxLength={20}
            onChange={(e) => updateSkillLabel(subIdx, skillIdx, 'en', e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 min-w-0 text-sm px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:border-blue-400 outline-none"
            placeholder="English"
          />
        </div>
        {/* Drop indicator below (last item only) */}
        {isDropBelow && (
          <div className="h-0.5 bg-blue-400 rounded mx-2 my-0.5" />
        )}
      </div>
    );
  };

  const renderFlatSkillRow = (category: 'utility' | 'external', item: MenuSkillItem, skillIdx: number, totalSkills: number) => {
    const isDropAbove = flatDropTarget?.category === category && flatDropTarget.insertIdx === skillIdx;
    const isDropBelow = flatDropTarget?.category === category && flatDropTarget.insertIdx === skillIdx + 1 && skillIdx === totalSkills - 1;
    const isBeingDragged = isFlatDragging && flatDragSourceRef.current?.category === category && flatDragSourceRef.current?.skillIdx === skillIdx;

    return (
      <div key={item.name}>
        {isDropAbove && (
          <div className="h-0.5 bg-blue-400 rounded mx-2 my-0.5" />
        )}
        <div
          draggable
          onDragStart={(e) => handleFlatDragStart(e, category, skillIdx, item)}
          onDragEnd={handleFlatDragEnd}
          onDragOver={(e) => handleFlatDragOverSkill(e, category, skillIdx)}
          onDrop={(e) => handleFlatDrop(e, category, skillIdx)}
          className={`flex items-center gap-2 py-1.5 px-2 rounded transition-opacity ${
            isBeingDragged ? 'opacity-30' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
          } group cursor-grab active:cursor-grabbing`}
        >
          {/* Drag handle */}
          <span className="text-gray-300 dark:text-gray-600 text-sm select-none">&#8942;&#8942;</span>
          {/* Skill name (read-only) */}
          <span className="text-sm text-gray-500 dark:text-gray-400 w-24 truncate shrink-0" title={item.name}>
            {item.name}
          </span>
          {/* KO label */}
          <input
            type="text"
            value={item.labels.ko}
            maxLength={20}
            onChange={(e) => updateFlatSkillLabel(category, skillIdx, 'ko', e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 min-w-0 text-sm px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:border-blue-400 outline-none"
            placeholder="한국어"
          />
          {/* EN label */}
          <input
            type="text"
            value={item.labels.en}
            maxLength={20}
            onChange={(e) => updateFlatSkillLabel(category, skillIdx, 'en', e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 min-w-0 text-sm px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:border-blue-400 outline-none"
            placeholder="English"
          />
        </div>
        {isDropBelow && (
          <div className="h-0.5 bg-blue-400 rounded mx-2 my-0.5" />
        )}
      </div>
    );
  };

  const renderSubcategory = (subcat: MenuSubcategory, subIdx: number, totalSubs: number) => {
    const isDropHere = isDragging && dropTarget?.subIdx === subIdx;
    const isForeignHere = isFlatDragging;

    return (
      <div
        key={subcat.id}
        className={`mb-3 border rounded-lg p-3 transition-colors ${
          isForeignHere && foreignDragOver === 'router'
            ? 'border-red-300 dark:border-red-700 bg-red-50/30 dark:bg-red-900/10 cursor-not-allowed'
            : isDropHere
              ? 'border-blue-400 dark:border-blue-500 bg-blue-50/30 dark:bg-blue-900/10'
              : 'border-gray-200 dark:border-gray-700'
        }`}
        onDragEnter={(e) => {
          if (isFlatDragging) {
            e.preventDefault();
            setForeignDragOver('router');
          }
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setForeignDragOver(null);
          }
        }}
        onDragOver={(e) => {
          if (isFlatDragging) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'none';
            return;
          }
          if (subcat.skills.length === 0) handleDragOverEmpty(e, subIdx);
        }}
        onDrop={(e) => {
          if (isFlatDragging) { e.preventDefault(); return; }
          if (subcat.skills.length === 0) handleDrop(e, subIdx, 0);
        }}
      >
        {/* Subcategory header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex flex-col">
            <button onClick={() => moveSubcategory(subIdx, -1)} disabled={subIdx === 0} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-20 text-xs leading-none">▲</button>
            <button onClick={() => moveSubcategory(subIdx, 1)} disabled={subIdx === totalSubs - 1} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-20 text-xs leading-none">▼</button>
          </div>
          <input
            type="text"
            value={subcat.labels.ko}
            onChange={(e) => updateSubcategoryLabel(subIdx, 'ko', e.target.value)}
            className="flex-1 min-w-0 text-sm font-medium px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:border-blue-400 outline-none"
            placeholder="한국어"
          />
          <input
            type="text"
            value={subcat.labels.en}
            onChange={(e) => updateSubcategoryLabel(subIdx, 'en', e.target.value)}
            className="flex-1 min-w-0 text-sm font-medium px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:border-blue-400 outline-none"
            placeholder="English"
          />
          <button
            onClick={() => removeSubcategory(subIdx)}
            className="text-red-400 hover:text-red-600 dark:hover:text-red-300 text-sm px-1"
            title={t('menu.removeSubcategory')}
          >
            ✕
          </button>
        </div>
        {/* Skills in subcategory */}
        <div
          className="space-y-0.5 min-h-[32px]"
          onDragOver={(e) => {
            e.preventDefault();
            // When dragging over last item's lower half, set insert at end
            if (subcat.skills.length > 0) {
              const rect = e.currentTarget.getBoundingClientRect();
              const y = e.clientY - rect.top;
              const itemHeight = rect.height / subcat.skills.length;
              const idx = Math.min(subcat.skills.length, Math.floor(y / itemHeight + 0.5));
              setDropTarget({ subIdx, insertIdx: idx });
            }
          }}
          onDrop={(e) => {
            const target = dropTarget;
            if (target && target.subIdx === subIdx) {
              handleDrop(e, subIdx, target.insertIdx);
            }
          }}
        >
          {subcat.skills.map((sk, skIdx) => renderSkillRow(sk, subIdx, skIdx, subcat.skills.length))}
          {subcat.skills.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 italic px-2 py-2 text-center">
              {isDragging ? t('menu.dropHere') || 'Drop here' : 'No skills'}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <DraggableResizableDialog
      initialWidth={600}
      initialHeight={720}
      minWidth={450}
      minHeight={400}
      storageKey="menu-manage"
      onClose={onClose}
      role="dialog"
      aria-modal={true}
      aria-labelledby="menu-manage-title"
    >
      {/* Header */}
      <div data-drag-handle className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700 cursor-move select-none">
        <h2 id="menu-manage-title" className="text-base font-semibold text-gray-800 dark:text-gray-100">
          {t('menu.manage')}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAiRecommendClick}
            disabled={aiLoading}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border border-purple-300 dark:border-purple-600 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors disabled:opacity-50"
          >
            {aiLoading ? (
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            )}
            <span>{aiLoading ? t('menu.aiRecommend.loading') : t('menu.aiRecommend')}</span>
          </button>
          {/* Subcategory toggle */}
          <button
            onClick={handleToggleSubcategories}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border transition-colors ${
              useSubcategories
                ? 'border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
            <span>{useSubcategories ? t('menu.noSubcategory') : t('menu.useSubcategory')}</span>
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
        {/* Core with subcategories */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">
              {CATEGORY_LABELS.router[lang]}
            </h3>
          </div>
          {useSubcategories ? (
            <>
              {draft.router.map((subcat, subIdx) => renderSubcategory(subcat, subIdx, draft.router.length))}
              {/* Add subcategory: big + icon */}
              <button
                onClick={addSubcategory}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-400 dark:text-gray-500 hover:border-blue-400 hover:text-blue-500 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
            </>
          ) : (
            <>
              {/* Flat mode: show all skills without subcategory grouping */}
              {draft.router.length > 0 && (
                <div
                  className={`border rounded-lg p-3 space-y-0.5 min-h-[32px] transition-colors ${
                    foreignDragOver === 'router'
                      ? 'border-red-300 dark:border-red-700 bg-red-50/30 dark:bg-red-900/10 cursor-not-allowed'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                  onDragEnter={(e) => {
                    if (isFlatDragging) {
                      e.preventDefault();
                      setForeignDragOver('router');
                    }
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setForeignDragOver(null);
                    }
                  }}
                  onDragOver={(e) => {
                    if (isFlatDragging) {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'none';
                      return;
                    }
                    e.preventDefault();
                    const allSkills = draft.router[0]?.skills || [];
                    if (allSkills.length > 0) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const y = e.clientY - rect.top;
                      const itemHeight = rect.height / allSkills.length;
                      const idx = Math.min(allSkills.length, Math.floor(y / itemHeight + 0.5));
                      setDropTarget({ subIdx: 0, insertIdx: idx });
                    }
                  }}
                  onDrop={(e) => {
                    const target = dropTarget;
                    if (target) handleDrop(e, 0, target.insertIdx);
                  }}
                >
                  {draft.router[0]?.skills?.map((sk, skIdx) => renderSkillRow(sk, 0, skIdx, draft.router[0]?.skills?.length || 0))}
                  {(!draft.router[0]?.skills?.length) && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 italic px-2 py-2 text-center">No skills</p>
                  )}
                </div>
              )}
            </>
          )}
          {draft.router.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 italic px-2 py-2">No subcategories</p>
          )}
        </div>

        {/* Utility */}
        {draft.utility.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1 mb-2">
              {CATEGORY_LABELS.utility[lang]}
            </h3>
            <div
              className={`border rounded-lg p-3 space-y-0.5 min-h-[32px] transition-colors ${
                foreignDragOver === 'utility'
                  ? 'border-red-300 dark:border-red-700 bg-red-50/30 dark:bg-red-900/10 cursor-not-allowed'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
              onDragEnter={(e) => {
                if (isDragging || (isFlatDragging && flatDragSourceRef.current?.category !== 'utility')) {
                  e.preventDefault();
                  setForeignDragOver('utility');
                }
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setForeignDragOver(null);
                }
              }}
              onDragOver={(e) => {
                if (isDragging || (isFlatDragging && flatDragSourceRef.current?.category !== 'utility')) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'none';
                  return;
                }
                e.preventDefault();
                if (draft.utility.length > 0) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const itemHeight = rect.height / draft.utility.length;
                  const idx = Math.min(draft.utility.length, Math.floor(y / itemHeight + 0.5));
                  setFlatDropTarget({ category: 'utility', insertIdx: idx });
                }
              }}
              onDrop={(e) => {
                const target = flatDropTarget;
                if (target && target.category === 'utility') handleFlatDrop(e, 'utility', target.insertIdx);
              }}
            >
              {draft.utility.map((sk, idx) => renderFlatSkillRow('utility', sk, idx, draft.utility.length))}
            </div>
          </div>
        )}

        {/* External */}
        {draft.external.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1 mb-2">
              {CATEGORY_LABELS.external[lang]}
            </h3>
            <div
              className={`border rounded-lg p-3 space-y-0.5 min-h-[32px] transition-colors ${
                foreignDragOver === 'external'
                  ? 'border-red-300 dark:border-red-700 bg-red-50/30 dark:bg-red-900/10 cursor-not-allowed'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
              onDragEnter={(e) => {
                if (isDragging || (isFlatDragging && flatDragSourceRef.current?.category !== 'external')) {
                  e.preventDefault();
                  setForeignDragOver('external');
                }
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setForeignDragOver(null);
                }
              }}
              onDragOver={(e) => {
                if (isDragging || (isFlatDragging && flatDragSourceRef.current?.category !== 'external')) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'none';
                  return;
                }
                e.preventDefault();
                if (draft.external.length > 0) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const itemHeight = rect.height / draft.external.length;
                  const idx = Math.min(draft.external.length, Math.floor(y / itemHeight + 0.5));
                  setFlatDropTarget({ category: 'external', insertIdx: idx });
                }
              }}
              onDrop={(e) => {
                const target = flatDropTarget;
                if (target && target.category === 'external') handleFlatDrop(e, 'external', target.insertIdx);
              }}
            >
              {draft.external.map((sk, idx) => renderFlatSkillRow('external', sk, idx, draft.external.length))}
            </div>
          </div>
        )}

      </div>

      {/* AI Recommend Confirm Overlay */}
      {showAiConfirm && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 rounded-2xl">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-5 mx-6 max-w-sm">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{t('menu.confirmReset')}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAiConfirm(false)}
                className="px-4 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleAiRecommendConfirm}
                className="px-4 py-1.5 text-sm rounded-lg bg-purple-500 hover:bg-purple-600 text-white transition-colors"
              >
                {t('menu.aiRecommend')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onClose}
          className="px-4 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          {t('common.cancel')}
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-1.5 text-sm rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors disabled:opacity-50"
        >
          {saving ? '...' : t('menu.save')}
        </button>
      </div>
    </DraggableResizableDialog>
  );
}
