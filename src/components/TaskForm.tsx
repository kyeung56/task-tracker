import { useState, useEffect } from 'react';
import { generateId } from '../utils/helpers';
import { useLanguage } from '../hooks/useLanguage';
import type { TaskFormProps, Task, TaskStatus, Priority, Category, TeamMember, ScheduleType, TaskScheduleFormData } from '../types';

interface TimeSlot {
  startTime: string;
  endTime: string;
}

interface WeeklySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface FormData {
  title: string;
  description: string;
  categoryId: string;
  priority: Priority;
  status: TaskStatus;
  dueDate: string;
  assigneeId: string;
  estimatedHours: string;
  tags: string;
  // Schedule fields
  scheduleType: ScheduleType;
  dailyTimeSlots: TimeSlot[];
  weeklySlots: WeeklySlot[];
  monthlyDay: number;
  monthlyTime: string;
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
  recurrenceEnd: string;
}

interface FormErrors {
  title?: string;
  category?: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: '日', labelEn: 'Sun' },
  { value: 1, label: '一', labelEn: 'Mon' },
  { value: 2, label: '二', labelEn: 'Tue' },
  { value: 3, label: '三', labelEn: 'Wed' },
  { value: 4, label: '四', labelEn: 'Thu' },
  { value: 5, label: '五', labelEn: 'Fri' },
  { value: 6, label: '六', labelEn: 'Sat' },
];

export default function TaskForm({
  task,
  categories,
  teamMembers,
  defaultDueDate,
  onSave,
  onCancel
}: TaskFormProps) {
  const { t, language } = useLanguage();
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    categoryId: categories[0]?.id || '',
    priority: 'medium',
    status: 'pending',
    dueDate: defaultDueDate || '',
    assigneeId: '',
    estimatedHours: '',
    tags: '',
    // Schedule defaults
    scheduleType: 'deadline',
    dailyTimeSlots: [{ startTime: '09:00', endTime: '17:00' }],
    weeklySlots: [],
    monthlyDay: 1,
    monthlyTime: '09:00',
    recurrence: 'none',
    recurrenceEnd: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        categoryId: task.categoryId || '',
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate || '',
        assigneeId: task.assigneeId || '',
        estimatedHours: task.estimatedHours ? task.estimatedHours.toString() : '',
        tags: Array.isArray(task.tags) ? task.tags.join(', ') : (task.tags || ''),
        // Schedule from task
        scheduleType: task.schedule?.scheduleType || 'deadline',
        dailyTimeSlots: task.schedule?.slots?.map(s => ({
          startTime: s.startTime || '09:00',
          endTime: s.endTime || '17:00',
        })) || [{ startTime: '09:00', endTime: '17:00' }],
        weeklySlots: task.schedule?.slots?.filter(s => s.dayOfWeek !== null).map(s => ({
          dayOfWeek: s.dayOfWeek!,
          startTime: s.startTime || '',
          endTime: s.endTime || '',
        })) || [],
        monthlyDay: (task.schedule as any)?.monthlyDay || 1,
        monthlyTime: (task.schedule as any)?.monthlyTime || '09:00',
        recurrence: task.schedule?.recurrence || 'none',
        recurrenceEnd: task.schedule?.recurrenceEnd || '',
      });
    } else if (defaultDueDate) {
      setFormData(prev => ({ ...prev, dueDate: defaultDueDate }));
    }
  }, [task, defaultDueDate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleScheduleTypeChange = (scheduleType: ScheduleType) => {
    setFormData(prev => ({
      ...prev,
      scheduleType,
      // Reset slots when changing type
      dailyTimeSlots: scheduleType === 'daily_hours' ? [{ startTime: '09:00', endTime: '17:00' }] : prev.dailyTimeSlots,
      weeklySlots: scheduleType === 'weekly_days' ? [] : prev.weeklySlots,
    }));
  };

  const addDailyTimeSlot = () => {
    setFormData(prev => ({
      ...prev,
      dailyTimeSlots: [...prev.dailyTimeSlots, { startTime: '09:00', endTime: '17:00' }],
    }));
  };

  const removeDailyTimeSlot = (index: number) => {
    setFormData(prev => ({
      ...prev,
      dailyTimeSlots: prev.dailyTimeSlots.filter((_, i) => i !== index),
    }));
  };

  const updateDailyTimeSlot = (index: number, field: 'startTime' | 'endTime', value: string) => {
    setFormData(prev => ({
      ...prev,
      dailyTimeSlots: prev.dailyTimeSlots.map((slot, i) =>
        i === index ? { ...slot, [field]: value } : slot
      ),
    }));
  };

  const toggleWeeklyDay = (dayOfWeek: number) => {
    setFormData(prev => {
      const exists = prev.weeklySlots.some(s => s.dayOfWeek === dayOfWeek);
      if (exists) {
        return {
          ...prev,
          weeklySlots: prev.weeklySlots.filter(s => s.dayOfWeek !== dayOfWeek),
        };
      } else {
        return {
          ...prev,
          weeklySlots: [...prev.weeklySlots, { dayOfWeek, startTime: '', endTime: '' }],
        };
      }
    });
  };

  const updateWeeklySlotTime = (dayOfWeek: number, field: 'startTime' | 'endTime', value: string) => {
    setFormData(prev => ({
      ...prev,
      weeklySlots: prev.weeklySlots.map(slot =>
        slot.dayOfWeek === dayOfWeek ? { ...slot, [field]: value } : slot
      ),
    }));
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = t('titleRequired');
    }
    if (!formData.categoryId) {
      newErrors.category = t('categoryRequired');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const now = new Date().toISOString();
    const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(Boolean);

    const taskData: Partial<Task> = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      categoryId: formData.categoryId || null,
      priority: formData.priority,
      status: formData.status,
      dueDate: formData.scheduleType === 'deadline' ? formData.dueDate || null : null,
      assigneeId: formData.assigneeId || null,
      estimatedHours: parseFloat(formData.estimatedHours) || null,
      tags: tagsArray,
      updatedAt: now
    };

    if (task && task.status !== 'completed' && formData.status === 'completed') {
      taskData.completedAt = now;
    }

    // Build schedule data if not deadline type
    const scheduleData: TaskScheduleFormData | undefined = formData.scheduleType !== 'deadline' ? {
      scheduleType: formData.scheduleType,
      startDate: formData.dueDate || undefined,
      endDate: formData.recurrenceEnd || undefined,
      recurrence: formData.recurrence,
      recurrenceEnd: formData.recurrenceEnd || undefined,
      dailyTimeSlots: formData.scheduleType === 'daily_hours' ? formData.dailyTimeSlots : undefined,
      weeklySlots: formData.scheduleType === 'weekly_days' ? formData.weeklySlots.map(s => ({
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime || undefined,
        endTime: s.endTime || undefined,
      })) : undefined,
      monthlyDay: formData.scheduleType === 'monthly_day' ? formData.monthlyDay : undefined,
      monthlyTime: formData.scheduleType === 'monthly_day' ? formData.monthlyTime : undefined,
    } : undefined;

    if (task) {
      onSave({ ...task, ...taskData, _scheduleData: scheduleData } as Task);
    } else {
      const newTask: Task = {
        id: generateId(),
        title: formData.title.trim(),
        description: formData.description.trim(),
        categoryId: formData.categoryId || null,
        priority: formData.priority,
        status: formData.status,
        dueDate: formData.scheduleType === 'deadline' ? formData.dueDate || null : null,
        startDate: null,
        estimatedHours: parseFloat(formData.estimatedHours) || null,
        loggedHours: 0,
        assigneeId: formData.assigneeId || null,
        creatorId: '',
        parentTaskId: null,
        tags: tagsArray,
        metadata: {},
        createdAt: now,
        updatedAt: now,
        completedAt: null,
        _scheduleData: scheduleData,
      } as Task;
      onSave(newTask);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  const statusOptions: { value: TaskStatus; label: string }[] = [
    { value: 'pending', label: '待处理' },
    { value: 'in_progress', label: '进行中' },
    { value: 'waiting', label: '等待确认' },
    { value: 'completed', label: '已完成' },
    { value: 'cancelled', label: '已取消' },
    { value: 'deferred', label: '已延期' },
  ];

  const getDayLabel = (day: typeof DAYS_OF_WEEK[0]) => {
    return language === 'en' ? day.labelEn : day.label;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden animate-fadeIn"
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-gradient-to-r from-indigo-600 to-purple-600">
          <h2 className="text-xl font-semibold text-white">
            {task ? t('editTask') : t('newTask')}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-white/20 rounded-xl transition-all"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              {t('title')} *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className={`w-full px-4 py-3 bg-slate-50 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                errors.title ? 'border-red-400' : 'border-slate-200'
              }`}
              placeholder={t('titlePlaceholder')}
              autoFocus
            />
            {errors.title && (
              <p className="text-red-500 text-sm mt-1.5 flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.title}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              {t('description')}
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all"
              placeholder={t('descriptionPlaceholder')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {t('category')} *
              </label>
              <select
                name="categoryId"
                value={formData.categoryId}
                onChange={handleChange}
                className={`w-full px-4 py-3 bg-slate-50 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                  errors.category ? 'border-red-400' : 'border-slate-200'
                }`}
              >
                <option value="">{t('selectCategory')}</option>
                {categories.map((cat: Category) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="text-red-500 text-sm mt-1.5">{errors.category}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {t('assignee')}
              </label>
              <select
                name="assigneeId"
                value={formData.assigneeId}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                <option value="">{t('unassigned')}</option>
                {teamMembers.map((member: TeamMember) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {t('priority')}
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                <option value="low">{t('priorityLow')}</option>
                <option value="medium">{t('priorityMedium')}</option>
                <option value="high">{t('priorityHigh')}</option>
                <option value="critical">{t('priorityCritical')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {t('status')}
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Schedule Type Section */}
          <div className="border-t border-slate-200 pt-4">
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              {language === 'en' ? 'Schedule Type' : '时间安排类型'}
            </label>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleScheduleTypeChange('deadline')}
                className={`flex-1 min-w-[70px] px-3 py-2.5 rounded-xl border-2 transition-all text-sm font-medium ${
                  formData.scheduleType === 'deadline'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                }`}
              >
                <svg className="w-4 h-4 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {language === 'en' ? 'Deadline' : '截止日期'}
              </button>
              <button
                type="button"
                onClick={() => handleScheduleTypeChange('daily_hours')}
                className={`flex-1 min-w-[70px] px-3 py-2.5 rounded-xl border-2 transition-all text-sm font-medium ${
                  formData.scheduleType === 'daily_hours'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                }`}
              >
                <svg className="w-4 h-4 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {language === 'en' ? 'Daily' : '每日时段'}
              </button>
              <button
                type="button"
                onClick={() => handleScheduleTypeChange('weekly_days')}
                className={`flex-1 min-w-[70px] px-3 py-2.5 rounded-xl border-2 transition-all text-sm font-medium ${
                  formData.scheduleType === 'weekly_days'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                }`}
              >
                <svg className="w-4 h-4 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {language === 'en' ? 'Weekly' : '每周天数'}
              </button>
              <button
                type="button"
                onClick={() => handleScheduleTypeChange('monthly_day')}
                className={`flex-1 min-w-[70px] px-3 py-2.5 rounded-xl border-2 transition-all text-sm font-medium ${
                  formData.scheduleType === 'monthly_day'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                }`}
              >
                <svg className="w-4 h-4 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {language === 'en' ? 'Monthly' : '每月'}
              </button>
            </div>
          </div>

          {/* Deadline Type */}
          {formData.scheduleType === 'deadline' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {t('dueDate')}
                </label>
                <input
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {t('estimatedHours')}
                </label>
                <input
                  type="number"
                  name="estimatedHours"
                  value={formData.estimatedHours}
                  onChange={handleChange}
                  min="0"
                  step="0.5"
                  placeholder="e.g., 4"
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>
          )}

          {/* Daily Hours Type */}
          {formData.scheduleType === 'daily_hours' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-slate-700">
                  {language === 'en' ? 'Time Slots' : '时间段'}
                </label>
                <button
                  type="button"
                  onClick={addDailyTimeSlot}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {language === 'en' ? 'Add Slot' : '添加时段'}
                </button>
              </div>
              {formData.dailyTimeSlots.map((slot, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) => updateDailyTimeSlot(index, 'startTime', e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                  <span className="text-slate-400">-</span>
                  <input
                    type="time"
                    value={slot.endTime}
                    onChange={(e) => updateDailyTimeSlot(index, 'endTime', e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                  {formData.dailyTimeSlots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDailyTimeSlot(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    {language === 'en' ? 'Start Date' : '开始日期'}
                  </label>
                  <input
                    type="date"
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    {language === 'en' ? 'End Date' : '结束日期'}
                  </label>
                  <input
                    type="date"
                    value={formData.recurrenceEnd}
                    onChange={(e) => setFormData(prev => ({ ...prev, recurrenceEnd: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Weekly Days Type */}
          {formData.scheduleType === 'weekly_days' && (
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">
                {language === 'en' ? 'Select Days' : '选择星期'}
              </label>
              <div className="flex gap-2">
                {DAYS_OF_WEEK.map(day => {
                  const isSelected = formData.weeklySlots.some(s => s.dayOfWeek === day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleWeeklyDay(day.value)}
                      className={`w-10 h-10 rounded-xl border-2 transition-all text-sm font-medium ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-500 text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {getDayLabel(day)}
                    </button>
                  );
                })}
              </div>
              {formData.weeklySlots.length > 0 && (
                <div className="space-y-2 pt-2">
                  <label className="block text-sm font-medium text-slate-600">
                    {language === 'en' ? 'Time for Each Day (Optional)' : '每天时间（可选）'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {formData.weeklySlots.sort((a, b) => a.dayOfWeek - b.dayOfWeek).map(slot => (
                      <div key={slot.dayOfWeek} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg">
                        <span className="text-xs font-medium text-slate-500 w-6">
                          {getDayLabel(DAYS_OF_WEEK.find(d => d.value === slot.dayOfWeek)!)}
                        </span>
                        <input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => updateWeeklySlotTime(slot.dayOfWeek, 'startTime', e.target.value)}
                          className="flex-1 px-2 py-1 border border-slate-200 rounded-lg text-xs"
                          placeholder={language === 'en' ? 'Start' : '开始'}
                        />
                        <span className="text-slate-300">-</span>
                        <input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) => updateWeeklySlotTime(slot.dayOfWeek, 'endTime', e.target.value)}
                          className="flex-1 px-2 py-1 border border-slate-200 rounded-lg text-xs"
                          placeholder={language === 'en' ? 'End' : '结束'}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    {language === 'en' ? 'Start Date' : '开始日期'}
                  </label>
                  <input
                    type="date"
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    {language === 'en' ? 'End Date' : '结束日期'}
                  </label>
                  <input
                    type="date"
                    value={formData.recurrenceEnd}
                    onChange={(e) => setFormData(prev => ({ ...prev, recurrenceEnd: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Monthly Day Type */}
          {formData.scheduleType === 'monthly_day' && (
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">
                {language === 'en' ? 'Select Day of Month' : '选择每月日期'}
              </label>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-600">{language === 'en' ? 'Every month on day' : '每月第'}</span>
                <select
                  value={formData.monthlyDay}
                  onChange={(e) => setFormData(prev => ({ ...prev, monthlyDay: parseInt(e.target.value) }))}
                  className="px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
                <span className="text-sm text-slate-600">{language === 'en' ? '' : '日'}</span>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <label className="text-sm font-medium text-slate-600">
                  {language === 'en' ? 'Time (Optional)' : '时间（可选）'}
                </label>
                <input
                  type="time"
                  value={formData.monthlyTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, monthlyTime: e.target.value }))}
                  className="px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    {language === 'en' ? 'Start Date' : '开始日期'}
                  </label>
                  <input
                    type="date"
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    {language === 'en' ? 'End Date' : '结束日期'}
                  </label>
                  <input
                    type="date"
                    value={formData.recurrenceEnd}
                    onChange={(e) => setFormData(prev => ({ ...prev, recurrenceEnd: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              {t('tags')} <span className="text-slate-400 font-normal">({t('tagsHint')})</span>
            </label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              placeholder={t('tagsPlaceholder')}
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold shadow-lg shadow-indigo-500/30"
            >
              {task ? t('saveChanges') : t('createTask')}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all font-semibold"
            >
              {t('cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
