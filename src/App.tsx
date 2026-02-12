import React, { useState, useMemo } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useLanguage } from './hooks/useLanguage';
import { defaultCategories, filterTasks, sortTasks, exportToCSV, exportToJSON } from './utils/helpers';
import Sidebar from './components/Sidebar';
import FilterBar from './components/FilterBar';
import TaskList from './components/TaskList';
import TaskForm from './components/TaskForm';
import CategoryManager from './components/CategoryManager';
import TeamManager from './components/TeamManager';
import Dashboard from './components/Dashboard';
import Calendar from './components/Calendar';
import { Task, Category, TeamMember, FilterState, TaskStats, Status } from './types';

export default function App() {
  const { t } = useLanguage();
  const [tasks, setTasks] = useLocalStorage<Task[]>('tasks', []);
  const [categories, setCategories] = useLocalStorage<Category[]>('categories', defaultCategories);
  const [teamMembers, setTeamMembers] = useLocalStorage<TeamMember[]>('teamMembers', []);

  const [showTaskForm, setShowTaskForm] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultDueDate, setDefaultDueDate] = useState<string | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState<boolean>(false);
  const [showTeamManager, setShowTeamManager] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<string>('tasks');

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: '',
    priority: '',
    status: '',
    assignee: ''
  });
  const [sortBy, setSortBy] = useState<string>('created');

  const filteredAndSortedTasks = useMemo(() => {
    const filtered = filterTasks(tasks, filters);
    return sortTasks(filtered, sortBy);
  }, [tasks, filters, sortBy]);

  const handleSaveTask = (taskData: Task) => {
    if (editingTask) {
      setTasks(tasks.map(t => t.id === taskData.id ? taskData : t));
    } else {
      setTasks([...tasks, taskData]);
    }
    setShowTaskForm(false);
    setEditingTask(null);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const handleDeleteTask = (id: string) => {
    if (window.confirm(t('confirmDeleteTask'))) {
      setTasks(tasks.filter(t => t.id !== id));
    }
  };

  const handleStatusChange = (id: string, newStatus: Status) => {
    const now = new Date().toISOString();
    setTasks(tasks.map(t =>
      t.id === id
        ? {
            ...t,
            status: newStatus,
            updatedAt: now,
            ...(newStatus === 'completed' && t.status !== 'completed' ? { completedAt: now } : {})
          }
        : t
    ));
  };

  const handleTimeUpdate = (taskId: string, newLoggedHours: number) => {
    setTasks(tasks.map(t =>
      t.id === taskId
        ? { ...t, loggedHours: newLoggedHours, updatedAt: new Date().toISOString() }
        : t
    ));
  };

  const handleCloseTaskForm = () => {
    setShowTaskForm(false);
    setEditingTask(null);
    setDefaultDueDate(null);
  };

  const taskStats: TaskStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    const review = tasks.filter(t => t.status === 'review').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const overdue = tasks.filter(t => {
      if (!t.dueDate || t.status === 'completed') return false;
      return new Date(t.dueDate) < new Date();
    }).length;
    return { total, completed, inProgress, review, pending, overdue };
  }, [tasks]);

  const getViewTitle = (): string => {
    switch (activeView) {
      case 'tasks': return t('tasks');
      case 'calendar': return t('calendar');
      case 'dashboard': return t('dashboard');
      default: return t('tasks');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        taskStats={taskStats}
        onNewTask={() => setShowTaskForm(true)}
        onToggleCategoryManager={() => setShowCategoryManager(true)}
        onToggleTeamManager={() => setShowTeamManager(true)}
        onExportCSV={() => exportToCSV(tasks, categories, teamMembers)}
        onExportJSON={() => exportToJSON(tasks, categories, teamMembers)}
      />

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800">{getViewTitle()}</h1>
          <p className="text-slate-500 mt-1">
            {activeView === 'tasks' && `${taskStats.total} ${t('total').toLowerCase()}`}
            {activeView === 'calendar' && t('calendar')}
            {activeView === 'dashboard' && t('teamPerformance')}
          </p>
        </div>

        {/* Content Views */}
        {activeView === 'calendar' ? (
          <Calendar
            tasks={tasks}
            categories={categories}
            teamMembers={teamMembers}
            onTaskClick={handleEditTask}
            onDateClick={(date: Date) => {
              setEditingTask(null);
              setDefaultDueDate(date.toISOString().split('T')[0]);
              setShowTaskForm(true);
            }}
          />
        ) : activeView === 'dashboard' ? (
          <Dashboard tasks={tasks} teamMembers={teamMembers} />
        ) : (
          <>
            <FilterBar
              filters={filters}
              setFilters={setFilters}
              sortBy={sortBy}
              setSortBy={setSortBy}
              categories={categories}
              teamMembers={teamMembers}
            />

            <TaskList
              tasks={filteredAndSortedTasks}
              categories={categories}
              teamMembers={teamMembers}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
              onStatusChange={handleStatusChange}
              onTimeUpdate={handleTimeUpdate}
            />
          </>
        )}
      </main>

      {/* Modals */}
      {showTaskForm && (
        <TaskForm
          task={editingTask}
          categories={categories}
          teamMembers={teamMembers}
          defaultDueDate={defaultDueDate}
          onSave={handleSaveTask}
          onCancel={handleCloseTaskForm}
        />
      )}

      {showCategoryManager && (
        <CategoryManager
          categories={categories}
          setCategories={setCategories}
          onClose={() => setShowCategoryManager(false)}
        />
      )}

      {showTeamManager && (
        <TeamManager
          teamMembers={teamMembers}
          setTeamMembers={setTeamMembers}
          onClose={() => setShowTeamManager(false)}
        />
      )}
    </div>
  );
}
