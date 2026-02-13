import { useState, useEffect } from 'react';
import { generateId } from '../utils/helpers';
import { useLanguage } from '../hooks/useLanguage';
import type { TaskFormProps, Task, TaskStatus, Priority, Category, TeamMember } from '../types';

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
}

interface FormErrors {
  title?: string;
  category?: string;
}

export default function TaskForm({
  task,
  categories,
  teamMembers,
  defaultDueDate,
  onSave,
  onCancel
}: TaskFormProps) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    categoryId: categories[0]?.id || '',
    priority: 'medium',
    status: 'pending',
    dueDate: defaultDueDate || '',
    assigneeId: '',
    estimatedHours: '',
    tags: ''
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
        tags: Array.isArray(task.tags) ? task.tags.join(', ') : (task.tags || '')
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
      dueDate: formData.dueDate || null,
      assigneeId: formData.assigneeId || null,
      estimatedHours: parseFloat(formData.estimatedHours) || null,
      tags: tagsArray,
      updatedAt: now
    };

    if (task && task.status !== 'completed' && formData.status === 'completed') {
      taskData.completedAt = now;
    }

    if (task) {
      onSave({ ...task, ...taskData } as Task);
    } else {
      const newTask: Task = {
        id: generateId(),
        title: formData.title.trim(),
        description: formData.description.trim(),
        categoryId: formData.categoryId || null,
        priority: formData.priority,
        status: formData.status,
        dueDate: formData.dueDate || null,
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
      };
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
