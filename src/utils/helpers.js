export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function isOverdue(dueDate, status) {
  if (!dueDate || status === 'completed') return false
  const due = new Date(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return due < today
}

export function sortTasks(tasks, sortBy) {
  const sorted = [...tasks]

  switch (sortBy) {
    case 'dueDate':
      return sorted.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return new Date(a.dueDate) - new Date(b.dueDate)
      })
    case 'dueDateDesc':
      return sorted.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return new Date(b.dueDate) - new Date(a.dueDate)
      })
    case 'priority':
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      return sorted.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    case 'priorityDesc':
      const priorityOrderDesc = { critical: 0, high: 1, medium: 2, low: 3 }
      return sorted.sort((a, b) => priorityOrderDesc[b.priority] - priorityOrderDesc[a.priority])
    case 'created':
      return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    case 'createdAsc':
      return sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    case 'title':
      return sorted.sort((a, b) => a.title.localeCompare(b.title))
    case 'assignee':
      return sorted.sort((a, b) => {
        if (!a.assignee && !b.assignee) return 0
        if (!a.assignee) return 1
        if (!b.assignee) return -1
        return a.assignee.localeCompare(b.assignee)
      })
    default:
      return sorted
  }
}

export function filterTasks(tasks, filters, teamMembers = []) {
  return tasks.filter(task => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      const matchesTitle = task.title.toLowerCase().includes(searchLower)
      const matchesDesc = task.description?.toLowerCase().includes(searchLower)
      const matchesTags = task.tags?.toLowerCase().includes(searchLower)
      if (!matchesTitle && !matchesDesc && !matchesTags) return false
    }

    if (filters.category && task.category !== filters.category) return false
    if (filters.priority && task.priority !== filters.priority) return false
    if (filters.status && task.status !== filters.status) return false
    if (filters.assignee && task.assignee !== filters.assignee) return false

    return true
  })
}

export const defaultCategories = [
  { id: 'development', name: 'Development', color: '#3B82F6' },
  { id: 'design', name: 'Design', color: '#8B5CF6' },
  { id: 'marketing', name: 'Marketing', color: '#10B981' },
  { id: 'sales', name: 'Sales', color: '#F59E0B' },
  { id: 'support', name: 'Support', color: '#EF4444' },
  { id: 'operations', name: 'Operations', color: '#6366F1' },
]

export const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
}

export const statusColors = {
  pending: 'bg-gray-100 text-gray-800',
  'in-progress': 'bg-blue-100 text-blue-800',
  review: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
}

export function exportToCSV(tasks, categories, teamMembers) {
  const headers = ['Title', 'Description', 'Category', 'Priority', 'Status', 'Assignee', 'Due Date', 'Estimated Hours', 'Logged Hours', 'Tags', 'Created At']

  const rows = tasks.map(task => {
    const category = categories.find(c => c.id === task.category)
    const assignee = teamMembers.find(m => m.id === task.assignee)

    return [
      `"${task.title.replace(/"/g, '""')}"`,
      `"${(task.description || '').replace(/"/g, '""')}"`,
      category?.name || '',
      task.priority,
      task.status,
      assignee?.name || '',
      task.dueDate || '',
      task.estimatedHours || 0,
      task.loggedHours || 0,
      task.tags || '',
      task.createdAt
    ]
  })

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `tasks-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function exportToJSON(tasks, categories, teamMembers) {
  const data = {
    exportDate: new Date().toISOString(),
    tasks,
    categories,
    teamMembers
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `task-tracker-backup-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}
