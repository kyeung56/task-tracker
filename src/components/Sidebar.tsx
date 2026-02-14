import { useLanguage } from '../hooks/useLanguage';
import { usePermissions } from '../hooks/usePermissions';
import LanguageSwitcher from './LanguageSwitcher';
import UserSelector from './UserSelector';
import type { SidebarProps, TeamMember } from '../types';

interface NavItem {
  id: string;
  icon: string;
  label: string;
  badge?: number;
}

interface ExtendedSidebarProps extends SidebarProps {
  onToggleWorkflowManager?: () => void;
  teamMembers?: TeamMember[];
  myTasksCount?: number;
  createdTasksCount?: number;
  involvedTasksCount?: number;
}

export default function Sidebar({
  activeView,
  setActiveView,
  taskStats,
  onNewTask,
  onToggleCategoryManager,
  onToggleTeamManager,
  onExportCSV,
  onExportJSON,
  onToggleWorkflowManager,
  teamMembers = [],
  myTasksCount = 0,
  createdTasksCount = 0,
  involvedTasksCount = 0,
}: ExtendedSidebarProps) {
  const { t } = useLanguage();
  const { permissions, isAdmin, currentUserId } = usePermissions();

  // Personal task navigation items
  const personalNavItems: NavItem[] = [
    { id: 'my_tasks', icon: '👤', label: t('myTasks') || '我的任务', badge: myTasksCount },
    { id: 'created_tasks', icon: '✏️', label: t('createdTasks') || '我创建的', badge: createdTasksCount },
    { id: 'involved_tasks', icon: '💬', label: t('involvedTasks') || '我参与的', badge: involvedTasksCount },
  ];

  const navItems: NavItem[] = [
    { id: 'tasks', icon: '📋', label: t('tasks') },
    { id: 'kanban', icon: '📌', label: t('kanban') || '看板' },
    { id: 'calendar', icon: '📅', label: t('calendar') },
    { id: 'dashboard', icon: '📊', label: t('dashboard') },
  ];

  return (
    <aside className="w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col h-screen fixed left-0 top-0 shadow-2xl overflow-y-auto">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold">{t('appName')}</h1>
            <p className="text-xs text-slate-400">{t('businessEdition')}</p>
          </div>
        </div>
      </div>

      {/* Language Switcher */}
      <div className="px-4 py-3 border-b border-slate-700">
        <LanguageSwitcher />
      </div>

      {/* User Selector */}
      <div className="px-4 py-3 border-b border-slate-700">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('selectRole') || '当前用户'}</h3>
        <UserSelector teamMembers={teamMembers} />
      </div>

      {/* Stats Overview */}
      <div className="px-4 py-4 border-b border-slate-700">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('total')}</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-400">{taskStats.pending}</p>
            <p className="text-xs text-slate-400">{t('pending')}</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-amber-400">{taskStats.inProgress}</p>
            <p className="text-xs text-slate-400">{t('inProgress')}</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-purple-400">{taskStats.review}</p>
            <p className="text-xs text-slate-400">{t('review')}</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-emerald-400">{taskStats.completed}</p>
            <p className="text-xs text-slate-400">{t('completed')}</p>
          </div>
        </div>
        {taskStats.overdue > 0 && (
          <div className="mt-2 bg-red-500/20 border border-red-500/30 rounded-lg p-2 text-center">
            <p className="text-sm text-red-400">
              <span className="font-bold">{taskStats.overdue}</span> {t('overdue')}
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        {/* Quick Add Task Button */}
        <button
          onClick={onNewTask}
          className="w-full mb-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg font-medium shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all duration-200 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('newTask')}
        </button>

        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-3">{t('tasks')}</h3>
        <ul className="space-y-1">
          {navItems.map(item => (
            <li key={item.id}>
              <button
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  activeView === item.id
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>

        {/* Personal Tasks Section */}
        {currentUserId && (
          <>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-3 mt-6">{t('myWork') || '我的工作'}</h3>
            <ul className="space-y-1">
              {personalNavItems.map(item => (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveView(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                      activeView === item.id
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                        : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="font-medium flex-1 text-left">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                        {item.badge}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-3 mt-6">{t('manageCategories').split(' ')[0]}</h3>
        <ul className="space-y-1">
          {isAdmin && (
            <li>
              <button
                onClick={onToggleTeamManager}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-700/50 hover:text-white transition-all duration-200"
              >
                <span className="text-lg">👥</span>
                <span className="font-medium">{t('team')}</span>
              </button>
            </li>
          )}
          {permissions.canManageCategories && (
            <li>
              <button
                onClick={onToggleCategoryManager}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-700/50 hover:text-white transition-all duration-200"
              >
                <span className="text-lg">🏷️</span>
                <span className="font-medium">{t('categories')}</span>
              </button>
            </li>
          )}
          {isAdmin && onToggleWorkflowManager && (
            <li>
              <button
                onClick={onToggleWorkflowManager}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-700/50 hover:text-white transition-all duration-200"
              >
                <span className="text-lg">⚙️</span>
                <span className="font-medium">工作流设置</span>
              </button>
            </li>
          )}
        </ul>

        {permissions.canExport && (
          <>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-3 mt-6">{t('export')}</h3>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={onExportCSV}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-700/50 hover:text-white transition-all duration-200"
                >
                  <span className="text-lg">📄</span>
                  <span className="font-medium">{t('exportCSV')}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={onExportJSON}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-700/50 hover:text-white transition-all duration-200"
                >
                  <span className="text-lg">💾</span>
                  <span className="font-medium">{t('exportJSON')}</span>
                </button>
              </li>
            </ul>
          </>
        )}
      </nav>

      {/* New Task Button */}
      <div className="p-4 border-t border-slate-700">
        <button
          onClick={onNewTask}
          className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all duration-200 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('newTask')}
        </button>
      </div>
    </aside>
  );
}
