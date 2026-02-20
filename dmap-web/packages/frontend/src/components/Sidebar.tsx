/**
 * 사이드바 컴포넌트 - 플러그인 전환 + 스킬 메뉴 + 에이전트 동기화 + 설정.
 * 메뉴 기반(core/utility/external) 또는 레거시(SKILL_CATEGORIES) 렌더링 지원
 * @module components/Sidebar
 */
import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../stores/appStore.js';
import { SkillCard } from './SkillCard.js';
import { SettingsMenu } from './SettingsMenu.js';
import { PluginSwitcher } from './PluginSwitcher.js';
import { AddPluginDialog } from './AddPluginDialog.js';
import { ConfirmSwitchDialog } from './ConfirmSwitchDialog.js';
import { MenuManageDialog } from './MenuManageDialog.js';
import { Tooltip } from './Tooltip.js';
import { useT } from '../i18n/index.js';
import { useLangStore } from '../stores/langStore.js';
import { SKILL_CATEGORIES, PROMPT_SKILL, API_BASE } from '@dmap-web/shared';
import type { SkillMeta, MenuSkillItem } from '@dmap-web/shared';
import type { DirListing } from '../types/filesystem.js';
import { DraggableResizableDialog } from './DraggableResizableDialog.js';

/** 경로 표시 정규화: 백슬래시→슬래시, 홈 디렉토리→'~' */
function formatDisplayPath(p: string): string {
  let s = p.replace(/\\/g, '/');
  // Windows: C:/Users/{name}, macOS: /Users/{name}, Linux: /home/{name}
  s = s.replace(/^[A-Za-z]:\/Users\/[^/]+/, '~');
  s = s.replace(/^\/Users\/[^/]+/, '~');
  s = s.replace(/^\/home\/[^/]+/, '~');
  return s;
}

/**
 * 사이드바 - 플러그인 선택기 + 도구 버튼(추가/프롬프트/설정) + 에이전트 동기화 + 스킬 메뉴 목록
 */
export function Sidebar() {
  const { skills, selectedSkill, selectSkill, isStreaming, fetchSkills, fetchMenus, menus, selectedPlugin, plugins, fetchPlugins, syncAgents, updatePluginDir, pendingApproval, setPendingSkillSwitch } = useAppStore(useShallow((s) => ({
    skills: s.skills,
    selectedSkill: s.selectedSkill,
    selectSkill: s.selectSkill,
    isStreaming: s.isStreaming,
    fetchSkills: s.fetchSkills,
    fetchMenus: s.fetchMenus,
    menus: s.menus,
    selectedPlugin: s.selectedPlugin,
    plugins: s.plugins,
    fetchPlugins: s.fetchPlugins,
    syncAgents: s.syncAgents,
    updatePluginDir: s.updatePluginDir,
    pendingApproval: s.pendingApproval,
    setPendingSkillSwitch: s.setPendingSkillSwitch,
  })));
  const { lang } = useLangStore();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showMenuDialog, setShowMenuDialog] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'fail'>('idle');
  const [syncMessage, setSyncMessage] = useState('');
  const [showDirBrowser, setShowDirBrowser] = useState(false);
  const [dirInput, setDirInput] = useState('');
  const [dirError, setDirError] = useState('');
  const [dirListing, setDirListing] = useState<DirListing | null>(null);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderError, setNewFolderError] = useState('');
  const t = useT();

  // 기본 플러그인 여부 판별: 플러그인 목록의 첫 번째(DMAP 기본)인지 확인
  const isDefaultPlugin = selectedPlugin && plugins.length > 0 && plugins[0]?.id === selectedPlugin.id;
  // 작업 디렉토리 표시용: workingDir 우선, 없으면 projectDir
  const displayDir = selectedPlugin?.workingDir || selectedPlugin?.projectDir || '';

  /** 디렉토리 목록 조회 */
  const fetchDirListing = async (path?: string) => {
    setBrowseLoading(true);
    try {
      const url = path
        ? `${API_BASE}/filesystem/list?path=${encodeURIComponent(path)}`
        : `${API_BASE}/filesystem/list`;
      const res = await fetch(url);
      if (res.ok) setDirListing(await res.json());
    } catch { /* ignore */ }
    finally { setBrowseLoading(false); }
  };

  /** 디렉토리 브라우저 열기 */
  const openDirBrowser = () => {
    if (!selectedPlugin) return;
    const currentDir = selectedPlugin.workingDir || selectedPlugin.projectDir;
    setDirInput(currentDir);
    setDirError('');
    setShowDirBrowser(true);
    fetchDirListing(currentDir);
  };

  /** workingDir 변경 저장 핸들러 */
  const handleDirUpdate = async () => {
    if (!selectedPlugin || !dirInput.trim()) return;
    setDirError('');
    try {
      await updatePluginDir(selectedPlugin.id, dirInput.trim());
      setShowDirBrowser(false);
      setDirInput('');
    } catch (err: unknown) {
      setDirError(t('plugin.error.updateFailed'));
    }
  };

  /** 새 폴더 생성 핸들러 */
  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !dirInput.trim()) return;
    setNewFolderError('');
    try {
      const newPath = dirInput.trim().replace(/[\\/]+$/, '') + '/' + newFolderName.trim();
      const res = await fetch(`${API_BASE}/filesystem/mkdir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: newPath }),
      });
      if (!res.ok) throw new Error();
      setNewFolderName('');
      setShowNewFolderInput(false);
      fetchDirListing(dirInput.trim());
    } catch {
      setNewFolderError(t('plugin.dirBrowser.newFolderError'));
    }
  };

  useEffect(() => {
    fetchPlugins().then(() => {
      fetchSkills();
      fetchMenus();
    });
  }, [fetchPlugins, fetchSkills, fetchMenus]);

  // 스킬명 → SkillMeta 매핑 테이블 - 메뉴 아이템에서 스킬 메타데이터 조회용
  const skillMap = new Map<string, SkillMeta>();
  for (const skill of skills) {
    skillMap.set(skill.name, skill);
  }

  /**
   * 에이전트 동기화 - 플러그인 로컬 프로젝트의 agents/ 디렉토리를 스캔하여 에이전트 목록 갱신
   */
  const handleSyncAgents = async () => {
    if (!selectedPlugin || syncStatus === 'syncing') return;
    setSyncStatus('syncing');
    setSyncMessage(t('agentSync.syncing'));
    try {
      const result = await syncAgents(selectedPlugin.id);
      if (result.count > 0) {
        setSyncStatus('success');
        setSyncMessage(t('agentSync.success').replace('{{count}}', String(result.count)));
      } else {
        setSyncStatus('success');
        setSyncMessage(t('agentSync.noAgents'));
      }
    } catch {
      setSyncStatus('fail');
      setSyncMessage(t('agentSync.fail'));
    }
    // 3초 후 상태 초기화
    setTimeout(() => { setSyncStatus('idle'); setSyncMessage(''); }, 3000);
  };

  /**
   * 스킬 클릭 핸들러 - 스트리밍/승인 대기 중이면 전환 대기열에 추가, 아니면 즉시 선택
   */
  const handleSkillClick = (skill: SkillMeta) => {
    if (isStreaming || pendingApproval) {
      setPendingSkillSwitch(skill);
    } else {
      selectSkill(skill);
    }
  };

  /**
   * 메뉴 스킬 아이템 렌더링 - skillMap에서 메타데이터 조회 후 메뉴 라벨로 오버라이드하여 SkillCard 표시
   */
  const renderMenuSkill = (item: MenuSkillItem) => {
    const skill = skillMap.get(item.name);
    if (!skill) return null;
    const menuLabel = item.labels[lang] || item.labels.ko;
    const displaySkill = menuLabel ? { ...skill, displayName: menuLabel } : skill;
    return (
      <SkillCard
        key={skill.name}
        skill={displaySkill}
        isSelected={selectedSkill?.name === skill.name}
        onClick={() => handleSkillClick(displaySkill)}
      />
    );
  };

  /**
   * 평탄 카테고리 렌더링 (utility, external) - 구분선 + 카테고리 제목 + 스킬 목록
   */
  const renderFlatCategory = (categoryKey: string, items: MenuSkillItem[]) => {
    const rendered = items.map(renderMenuSkill).filter(Boolean);
    if (rendered.length === 0) return null;
    return (
      <div key={categoryKey} className="pt-3 border-t border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 px-2 mb-2">
          {t(`category.${categoryKey}` as keyof import('../i18n/types.js').Translations)}
        </h2>
        <div className="space-y-1">
          {rendered}
        </div>
      </div>
    );
  };

  /**
   * 메뉴 기반 네비게이션 렌더링 - core(하위 카테고리 포함) + utility + external 순서
   */
  const renderMenusNav = () => {
    if (!menus) return null;

    return (
      <>
        {/* Core 카테고리 - 하위 카테고리(서브카테고리) 포함 */}
        {menus.core.length > 0 && (
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 px-2 mb-2">
              {t('category.core')}
            </h2>
            {menus.core.map((subcat, idx) => {
              const rendered = subcat.skills.map(renderMenuSkill).filter(Boolean);
              if (rendered.length === 0) return null;
              const showSubLabel = menus.core.length > 1 || subcat.id !== 'default';
              return (
                <div key={subcat.id} className={idx > 0 ? 'mt-3' : ''}>
                  {showSubLabel && (
                    <h3 className="text-[13px] font-medium text-gray-400 dark:text-gray-500 px-2 mb-1.5 flex items-center gap-1.5">
                      <span className="text-[10px] opacity-60">&#9654;</span>
                      {subcat.labels[lang] || subcat.labels.ko || subcat.id}
                    </h3>
                  )}
                  <div className="space-y-1">
                    {rendered}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Utility, External 카테고리 - 구분선과 함께 순서대로 렌더링 */}
        {renderFlatCategory('utility', menus.utility)}
        {renderFlatCategory('external', menus.external)}
      </>
    );
  };

  /**
   * 레거시 네비게이션 렌더링 - SKILL_CATEGORIES 기반 분류 (메뉴 미로드 시 폴백)
   */
  const renderLegacyNav = () => {
    const grouped = skills.reduce<Record<string, SkillMeta[]>>((acc, skill) => {
      const cat = skill.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(skill);
      return acc;
    }, {});

    return (
      <>
        {Object.entries(SKILL_CATEGORIES).map(([key, cat]) => {
          const categorySkills = grouped[key];
          if (!categorySkills?.length) return null;

          return (
            <div key={key}>
              <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2 mb-2">
                {t(`category.${key}` as keyof import('../i18n/types.js').Translations) || cat.label}
              </h2>
              <div className="space-y-1">
                {categorySkills.map((skill) => (
                  <SkillCard
                    key={skill.name}
                    skill={skill}
                    isSelected={selectedSkill?.name === skill.name}
                    onClick={() => handleSkillClick(skill)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </>
    );
  };

  return (
    <aside className="w-full h-full bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <PluginSwitcher disabled={isStreaming} />
          <div className="flex items-center gap-1">
            <div className="relative group">
              <button
                onClick={() => setShowAddDialog(true)}
                className="p-1.5 rounded-full border border-gray-200 dark:border-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
              <Tooltip text={t('plugin.add')} />
            </div>
            <div className="relative group">
              <button
                onClick={() => handleSkillClick(PROMPT_SKILL)}
                className={`p-1.5 rounded-full border transition-colors ${
                  selectedSkill?.name === '__prompt__'
                    ? 'border-blue-400 dark:border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-200 dark:border-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </button>
              <Tooltip text={t('resume.tooltip')} />
            </div>
            <SettingsMenu version={plugins.find(p => p.id === 'dmap')?.version || selectedPlugin?.version || ''} />
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
          {selectedPlugin?.description || t('sidebar.subtitle')}
        </p>
        {/* workingDir 표시: 바탕색 구분 + 기본 플러그인=읽기 전용, 외부 플러그인=변경 버튼 */}
        {displayDir && (
          <div className="mt-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
              <span className="text-xs text-gray-600 dark:text-gray-300 truncate flex-1" title={formatDisplayPath(displayDir)}>
                {formatDisplayPath(displayDir)}
              </span>
              {isDefaultPlugin ? (
                <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0 whitespace-nowrap" title={t('plugin.workingDirReadonly')}>
                  {t('plugin.workingDirReadonly')}
                </span>
              ) : (
                <button
                  onClick={openDirBrowser}
                  className="text-[11px] px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex-shrink-0"
                >
                  {t('plugin.workingDirEdit')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* 에이전트 동기화 + 메뉴 관리 버튼 영역 */}
        {selectedPlugin && (
          <div className="px-2">
            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncAgents}
                disabled={isStreaming || syncStatus === 'syncing'}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
                  syncStatus === 'success'
                    ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : syncStatus === 'fail'
                    ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750'
                } ${(isStreaming || syncStatus === 'syncing') ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {syncStatus === 'syncing' ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                )}
                <span>{syncMessage || t('agentSync.label')}</span>
                <div className="relative group">
                  <svg className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 cursor-help flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                  </svg>
                  <Tooltip text={t('agentSync.tooltip')} wide />
                </div>
              </button>
              {/* 메뉴 관리 버튼 */}
              <div className="relative group">
                <button
                  onClick={() => setShowMenuDialog(true)}
                  className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                </button>
                <Tooltip text={t('menu.manage')} />
              </div>
            </div>
          </div>
        )}

        {/* 스킬 목록: 메뉴 로드 완료 시 메뉴 기반, 아니면 레거시 카테고리 기반 렌더링 */}
        {menus ? renderMenusNav() : renderLegacyNav()}
      </nav>

      {/* 하단: 현재 플러그인 이름 + 버전 표시 */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-400 dark:text-gray-400 truncate">
        {selectedPlugin?.displayNames?.[lang] || selectedPlugin?.name || 'Plugin'} v{selectedPlugin?.version || '...'}
      </div>

      <ConfirmSwitchDialog />

      {showAddDialog && (
        <AddPluginDialog
          onClose={() => setShowAddDialog(false)}
          onAdded={() => setShowAddDialog(false)}
        />
      )}

      {showMenuDialog && (
        <MenuManageDialog
          onClose={() => {
            setShowMenuDialog(false);
            fetchMenus();
          }}
        />
      )}

      {/* 디렉토리 변경 다이얼로그 */}
      {showDirBrowser && (
        <DraggableResizableDialog
          initialWidth={480}
          initialHeight={440}
          storageKey="change-plugin-dir"
          onClose={() => { setShowDirBrowser(false); setDirError(''); setShowNewFolderInput(false); setNewFolderError(''); }}
        >
          <div data-drag-handle className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 cursor-move flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('plugin.workingDirEdit')}
            </h2>
          </div>

          <div className="px-6 py-4 flex-1 min-h-0 flex flex-col gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t('plugin.projectDir')}
              </label>
              <input
                type="text"
                value={dirInput}
                onChange={(e) => { setDirInput(e.target.value); setDirError(''); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && dirInput.trim()) {
                    e.preventDefault();
                    fetchDirListing(dirInput.trim());
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {dirError && <p className="mt-1.5 text-sm text-red-500 dark:text-red-400">{dirError}</p>}
            </div>

            <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden flex-1 min-h-0 flex flex-col">
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600 flex-shrink-0 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
                  {dirListing?.current || '...'}
                </span>
                <button
                  onClick={() => { setShowNewFolderInput(true); setNewFolderName(''); setNewFolderError(''); }}
                  className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors flex-shrink-0 flex items-center gap-1"
                  title={t('plugin.dirBrowser.newFolder')}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  {t('plugin.dirBrowser.newFolder')}
                </button>
              </div>
              <div className="overflow-y-auto flex-1">
                {browseLoading ? (
                  <div className="px-3 py-4 text-center text-sm text-gray-400">{t('plugin.validating')}</div>
                ) : (
                  <>
                    {dirListing?.parent && (
                      <button
                        onClick={() => { setDirInput(dirListing.parent!); fetchDirListing(dirListing.parent!); setShowNewFolderInput(false); }}
                        className="w-full text-left px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2"
                      >
                        <span>{'\u2190'}</span> {t('plugin.dirBrowser.parent')}
                      </button>
                    )}
                    {showNewFolderInput && (
                      <div className="px-3 py-1.5 flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
                        <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                        </svg>
                        <input
                          type="text"
                          autoFocus
                          value={newFolderName}
                          onChange={(e) => { setNewFolderName(e.target.value); setNewFolderError(''); }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); handleCreateFolder(); }
                            if (e.key === 'Escape') { setShowNewFolderInput(false); setNewFolderError(''); }
                          }}
                          placeholder={t('plugin.dirBrowser.newFolderPlaceholder')}
                          className="flex-1 text-sm px-2 py-1 border border-blue-200 dark:border-blue-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                        <button onClick={handleCreateFolder} className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors">OK</button>
                        <button onClick={() => { setShowNewFolderInput(false); setNewFolderError(''); }} className="text-xs px-2 py-1 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                    {newFolderError && (
                      <div className="px-3 py-1 text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20">{newFolderError}</div>
                    )}
                    {dirListing?.directories.length === 0 && !showNewFolderInput && (
                      <div className="px-3 py-3 text-center text-sm text-gray-400 dark:text-gray-500">
                        {t('plugin.dirBrowser.empty')}
                      </div>
                    )}
                    {dirListing?.directories.map((dir) => (
                      <button
                        key={dir.path}
                        onClick={() => { setDirInput(dir.path); setDirError(''); fetchDirListing(dir.path); }}
                        className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                        </svg>
                        <span className="truncate">{dir.name}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2 flex-shrink-0">
            <button
              onClick={() => { setShowDirBrowser(false); setDirError(''); }}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleDirUpdate}
              disabled={!dirInput.trim() || dirInput.trim() === displayDir}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {t('plugin.select')}
            </button>
          </div>
        </DraggableResizableDialog>
      )}
    </aside>
  );
}
