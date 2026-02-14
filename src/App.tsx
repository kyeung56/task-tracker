import { useState, useMemo } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useLanguage } from './hooks/useLanguage';
import { usePermissions } from './hooks/usePermissions';
import { defaultCategories, filterTasks, sortTasks, exportToCSV, exportToJSON } from './utils/helpers';
import Sidebar from './components/Sidebar';
import FilterBar from './components/FilterBar';
import TaskList from './components/TaskList';
import TaskForm from './components/TaskForm';
import CategoryManager from './components/CategoryManager';
import TeamManager from './components/TeamManager';
import Dashboard from './components/Dashboard';
import Calendar from './components/Calendar';
import KanbanBoard from './components/KanbanBoard';
import WorkflowManager from './components/workflow/WorkflowManager';
import type { Task, Category, TeamMember, LegacyFilterState, TaskStats, TaskStatus } from './types';

export default function App() {
  const { t } = useLanguage();
  const { currentUserId } = usePermissions();
  const [tasks, setTasks] = useLocalStorage<Task[]>('tasks', []);
  const [categories, setCategories] = useLocalStorage<Category[]>('categories', defaultCategories);
  const [teamMembers, setTeamMembers] = useLocalStorage<TeamMember[]>('teamMembers', []);

  const [showTaskForm, setShowTaskForm] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultDueDate, setDefaultDueDate] = useState<string | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState<boolean>(false);
  const [showTeamManager, setShowTeamManager] = useState<boolean>(false);
  const [showWorkflowManager, setShowWorkflowManager] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<string>('tasks');

  const [filters, setFilters] = useState<LegacyFilterState>({
    search: '',
    category: '',
    priority: '',
    status: '',
    assignee: ''
  });
  const [sortBy, setSortBy] = useState<string>('created');

  // Calculate personal task counts
  const personalTaskCounts = useMemo(() => {
    if (!currentUserId) return { myTasks: 0, createdTasks: 0, involvedTasks: 0 };

    const myTasks = tasks.filter(t =>
      t.assigneeId === currentUserId && t.status !== 'completed' && t.status !== 'cancelled'
    ).length;

    const createdTasks = tasks.filter(t =>
      t.creatorId === currentUserId
    ).length;

    // Tasks I'm involved in: assigned to me, created by me, or I commented on
    const involvedTasks = tasks.filter(t => {
      const isAssigned = t.assigneeId === currentUserId;
      const isCreator = t.creatorId === currentUserId;
      const hasCommented = t.comments?.some(c => c.userId === currentUserId);
      const isMentioned = t.comments?.some(c =>
        c.mentions?.some(m => m.userId === currentUserId)
      );
      return isAssigned || isCreator || hasCommented || isMentioned;
    }).length;

    return { myTasks, createdTasks, involvedTasks };
  }, [tasks, currentUserId]);

  // Get tasks based on current view
  const viewFilteredTasks = useMemo(() => {
    if (!currentUserId) return tasks;

    switch (activeView) {
      case 'my_tasks':
        // Tasks assigned to me (excluding completed/cancelled)
        return tasks.filter(t =>
          t.assigneeId === currentUserId
        );
      case 'created_tasks':
        // Tasks I created
        return tasks.filter(t =>
          t.creatorId === currentUserId
        );
      case 'involved_tasks':
        // Tasks I'm involved in
        return tasks.filter(t => {
          const isAssigned = t.assigneeId === currentUserId;
          const isCreator = t.creatorId === currentUserId;
          const hasCommented = t.comments?.some(c => c.userId === currentUserId);
          const isMentioned = t.comments?.some(c =>
            c.mentions?.some(m => m.userId === currentUserId)
          );
          return isAssigned || isCreator || hasCommented || isMentioned;
        });
      default:
        return tasks;
    }
  }, [tasks, currentUserId, activeView]);

  const filteredAndSortedTasks = useMemo(() => {
    const filtered = filterTasks(viewFilteredTasks, filters);
    return sortTasks(filtered, sortBy);
  }, [viewFilteredTasks, filters, sortBy]);

  const handleSaveTask = (taskData: Task) => {
    // Extract schedule data if present
    const { _scheduleData, ...taskToSave } = taskData as Task & { _scheduleData?: any };

    // Convert schedule data to schedule object for local storage
    if (_scheduleData) {
      const slots = _scheduleData.scheduleType === 'daily_hours'
        ? _scheduleData.dailyTimeSlots?.map((slot: { startTime: string; endTime: string }, index: number) => ({
            id: `slot-${index}`,
            scheduleId: 'local',
            dayOfWeek: null,
            startTime: slot.startTime,
            endTime: slot.endTime,
            sortOrder: index,
            createdAt: new Date().toISOString(),
          }))
        : _scheduleData.scheduleType === 'weekly_days'
        ? _scheduleData.weeklySlots?.map((slot: { dayOfWeek: number; startTime?: string; endTime?: string }, index: number) => ({
            id: `slot-${index}`,
            scheduleId: 'local',
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime || null,
            endTime: slot.endTime || null,
            sortOrder: index,
            createdAt: new Date().toISOString(),
          }))
        : [];

      (taskToSave as any).schedule = {
        id: 'local',
        taskId: taskToSave.id,
        scheduleType: _scheduleData.scheduleType,
        startDate: _scheduleData.startDate || null,
        endDate: _scheduleData.endDate || null,
        recurrence: _scheduleData.recurrence,
        recurrenceEnd: _scheduleData.recurrenceEnd || null,
        slots,
        // Monthly day specific fields
        monthlyDay: _scheduleData.monthlyDay || null,
        monthlyTime: _scheduleData.monthlyTime || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    if (editingTask) {
      setTasks(tasks.map(t => t.id === taskToSave.id ? taskToSave : t));
    } else {
      setTasks([...tasks, taskToSave]);
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

  const handleStatusChange = (id: string, newStatus: TaskStatus) => {
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
    const inProgress = tasks.filter(t => t.status === 'in_progress' || t.status === 'waiting').length;
    const review = tasks.filter(t => t.status === 'waiting').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const overdue = tasks.filter(t => {
      if (!t.dueDate || t.status === 'completed' || t.status === 'cancelled') return false;
      return new Date(t.dueDate) < new Date();
    }).length;
    return { total, completed, inProgress, review, pending, overdue };
  }, [tasks]);

  const getViewTitle = (): string => {
    switch (activeView) {
      case 'tasks': return t('tasks');
      case 'kanban': return t('kanban') || '看板';
      case 'calendar': return t('calendar');
      case 'dashboard': return t('dashboard');
      case 'my_tasks': return t('myTasks') || '我的任务';
      case 'created_tasks': return t('createdTasks') || '我创建的';
      case 'involved_tasks': return t('involvedTasks') || '我参与的';
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
        onToggleWorkflowManager={() => setShowWorkflowManager(true)}
        onExportCSV={() => exportToCSV(tasks, categories, teamMembers)}
        onExportJSON={() => exportToJSON(tasks, categories, teamMembers)}
        teamMembers={teamMembers}
        myTasksCount={personalTaskCounts.myTasks}
        createdTasksCount={personalTaskCounts.createdTasks}
        involvedTasksCount={personalTaskCounts.involvedTasks}
      />

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800">{getViewTitle()}</h1>
          <p className="text-slate-500 mt-1">
            {activeView === 'tasks' && `${taskStats.total} ${t('total').toLowerCase()}`}
            {activeView === 'kanban' && `${taskStats.total} ${t('total').toLowerCase()}`}
            {activeView === 'calendar' && t('calendar')}
            {activeView === 'dashboard' && t('teamPerformance')}
            {activeView === 'my_tasks' && `${filteredAndSortedTasks.length} ${t('tasks').toLowerCase()}`}
            {activeView === 'created_tasks' && `${filteredAndSortedTasks.length} ${t('tasks').toLowerCase()}`}
            {activeView === 'involved_tasks' && `${filteredAndSortedTasks.length} ${t('tasks').toLowerCase()}`}
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
        ) : activeView === 'kanban' ? (
          <KanbanBoard
            tasks={tasks}
            categories={categories}
            teamMembers={teamMembers}
            onEdit={handleEditTask}
            onDelete={handleDeleteTask}
            onStatusChange={handleStatusChange}
          />
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

      {showWorkflowManager && (
        <WorkflowManager
          onClose={() => setShowWorkflowManager(false)}
        />
      )}
    </div>
  );
}
