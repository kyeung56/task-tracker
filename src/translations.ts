import { Translations } from './types';

export const translations: Record<string, Translations> = {
  en: {
    // Header
    appName: 'ZhongJia Electric Inc.',
    businessEdition: 'Task Management System',
    team: 'Team',
    categories: 'Categories',
    export: 'Export',
    exportCSV: 'Export as CSV',
    exportJSON: 'Backup as JSON',

    // Navigation
    tasks: 'Tasks',
    kanban: 'Kanban',
    calendar: 'Calendar',
    dashboard: 'Dashboard',

    // Stats
    total: 'Total',
    pending: 'Pending',
    inProgress: 'In Progress',
    review: 'Review',
    completed: 'Completed',
    overdue: 'Overdue',

    // Task Form
    newTask: 'New Task',
    editTask: 'Edit Task',
    createTask: 'Create Task',
    saveChanges: 'Save Changes',
    cancel: 'Cancel',
    title: 'Title',
    titlePlaceholder: 'Enter task title',
    titleRequired: 'Title is required',
    description: 'Description',
    descriptionPlaceholder: 'Enter task description (optional)',
    category: 'Category',
    selectCategory: 'Select category',
    categoryRequired: 'Please select a category',
    assignee: 'Assignee',
    unassigned: 'Unassigned',
    priority: 'Priority',
    priorityLow: 'Low',
    priorityMedium: 'Medium',
    priorityHigh: 'High',
    priorityCritical: 'Critical',
    status: 'Status',
    statusPending: 'Pending',
    statusInProgress: 'In Progress',
    statusReview: 'In Review',
    statusCompleted: 'Completed',
    dueDate: 'Due Date',
    estimatedHours: 'Estimated Hours',
    tags: 'Tags',
    tagsPlaceholder: 'e.g., frontend, urgent, bug',
    tagsHint: 'comma separated',

    // Task Item
    overdueLabel: 'Overdue',
    dueLabel: 'Due',
    dueToday: 'Due Today',

    // Filter Bar
    searchPlaceholder: 'Search tasks, tags...',
    allCategories: 'All Categories',
    allAssignees: 'All Assignees',
    allPriorities: 'All Priorities',
    allStatuses: 'All Statuses',
    newestFirst: 'Newest First',
    oldestFirst: 'Oldest First',
    dueDateSoonest: 'Due Date (Soonest)',
    priorityHighest: 'Priority (Highest)',
    byAssignee: 'By Assignee',
    titleAZ: 'Title (A-Z)',
    clear: 'Clear',

    // Task List
    noTasksFound: 'No tasks found',
    getStarted: 'Get started by creating a new task or adjust your filters.',

    // Calendar
    today: 'Today',
    selectDate: 'Select a date',
    tasksDue: 'tasks',
    noTasksDue: 'No tasks due on this date',
    addTaskForDate: '+ Add Task for this date',
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    weekDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    priorityLegend: 'Priority:',

    // Dashboard
    totalTasks: 'Total Tasks',
    complete: 'complete',
    thisWeek: 'this week',
    completedThisWeek: 'this week',
    needsAttention: 'Needs attention',
    allOnTrack: 'All on track',
    highPriority: 'High Priority',
    estHours: 'Est. Hours',
    logged: 'logged',
    completionRate: 'Completion Rate',
    teamPerformance: 'Team Performance',
    noTasksAssigned: 'No tasks assigned yet. Assign team members to see performance metrics.',
    tasksByCategory: 'Tasks by Category',
    noCategoriesWithTasks: 'No categories with tasks yet.',
    noData: 'No data available',
    timeTracking: 'Time Tracking',
    statusBreakdown: 'Status Breakdown',
    efficiency: 'Efficiency',
    // Chart titles
    completionTrend: 'Completion Trend',
    teamWorkload: 'Team Workload',
    overdueTrend: 'Overdue Trend',
    chartCreated: 'Created',
    chartCompleted: 'Completed',
    chartActive: 'Active',
    chartTotal: 'Total',
    noOverdueTasks: 'No overdue tasks',
    more: 'more',

    // Team Manager
    teamMembers: 'Team Members',
    noTeamMembers: 'No team members yet',
    addFirstMember: 'Add your first team member below',
    noEmail: 'No email',
    name: 'Name',
    email: 'Email',
    role: 'Role',
    addMember: 'Add Member',
    confirmRemoveMember: 'Are you sure you want to remove this team member?',

    // User & Permissions
    selectUser: 'Select User...',
    selectRole: 'Switch Role',
    noPermission: 'No Permission',
    admin: 'Admin',
    manager: 'Manager',
    developer: 'Developer',
    designer: 'Designer',
    qa: 'QA',
    roles: {
      admin: 'Admin',
      manager: 'Manager',
      developer: 'Developer',
      designer: 'Designer',
      qa: 'QA',
      other: 'Other'
    },

    // Category Manager
    manageCategories: 'Manage Categories',
    noCategories: 'No categories yet. Add one below or reset to defaults.',
    newCategory: 'New Category',
    categoryName: 'Category name',
    color: 'Color',
    addCategory: 'Add Category',
    reset: 'Reset',
    confirmReset: 'Reset categories to defaults? This will remove all custom categories.',
    confirmDelete: 'Are you sure you want to delete this category? Tasks in this category will keep the category but it won\'t be available for new tasks.',

    // Time Tracker
    est: 'est.',

    // Confirmations
    confirmDeleteTask: 'Are you sure you want to delete this task?',

    // Comments
    save: 'Save',
    sending: 'Sending...',
    edit: 'Edit',
    delete: 'Delete',

    // Empty States
    noTasksYet: 'No tasks yet',
    createTaskBtn: 'Create Task',
    noTasksMatch: 'No tasks matching',
    tryDifferentSearch: 'Try a different search term.',
    noNotifications: 'No notifications',
    allCaughtUp: "You're all caught up! New notifications will appear here.",
    noComments: 'No comments',
    beFirstComment: 'Be the first to comment on this task.',
    noResults: 'No results found',
    getStartedFirstTask: 'Get started by creating your first task',

    // Calendar
    noTasksForDay: 'No tasks for this day',
    addTaskBtn: 'Add Task',

    // Comments
    writeComment: 'Write a comment, @ to mention someone...',
    send: 'Send',
    pressToSend: 'Press ⌘ + Enter to send',
    justNow: 'Just now',
    minutesAgo: 'm ago',
    hoursAgo: 'h ago',
    daysAgo: 'd ago',
    edited: 'edited',
    showMore: 'Show more',
    showLess: 'Show less',
    reply: 'Reply',
  },

  'zh-TW': {
    // Header
    appName: '中嘉電器(深圳)有限公司',
    businessEdition: '任務管理系統',
    team: '團隊',
    categories: '類別',
    export: '匯出',
    exportCSV: '匯出為 CSV',
    exportJSON: '備份為 JSON',

    // Navigation
    tasks: '任務',
    kanban: '看板',
    calendar: '日曆',
    dashboard: '儀表板',

    // Stats
    total: '總計',
    pending: '待處理',
    inProgress: '進行中',
    review: '審核中',
    completed: '已完成',
    overdue: '逾期',

    // Task Form
    newTask: '新建任務',
    editTask: '編輯任務',
    createTask: '建立任務',
    saveChanges: '儲存變更',
    cancel: '取消',
    title: '標題',
    titlePlaceholder: '輸入任務標題',
    titleRequired: '標題為必填項',
    description: '描述',
    descriptionPlaceholder: '輸入任務描述（選填）',
    category: '類別',
    selectCategory: '選擇類別',
    categoryRequired: '請選擇類別',
    assignee: '負責人',
    unassigned: '未指派',
    priority: '優先級',
    priorityLow: '低',
    priorityMedium: '中',
    priorityHigh: '高',
    priorityCritical: '緊急',
    status: '狀態',
    statusPending: '待處理',
    statusInProgress: '進行中',
    statusReview: '審核中',
    statusCompleted: '已完成',
    dueDate: '截止日期',
    estimatedHours: '預估時數',
    tags: '標籤',
    tagsPlaceholder: '例如：前端, 緊急, 錯誤',
    tagsHint: '以逗號分隔',

    // Task Item
    overdueLabel: '逾期',
    dueLabel: '到期',
    dueToday: '今日到期',

    // Filter Bar
    searchPlaceholder: '搜尋任務、標籤...',
    allCategories: '所有類別',
    allAssignees: '所有負責人',
    allPriorities: '所有優先級',
    allStatuses: '所有狀態',
    newestFirst: '最新優先',
    oldestFirst: '最舊優先',
    dueDateSoonest: '截止日期（最近）',
    priorityHighest: '優先級（最高）',
    byAssignee: '依負責人',
    titleAZ: '標題（A-Z）',
    clear: '清除',

    // Task List
    noTasksFound: '找不到任務',
    getStarted: '建立新任務或調整篩選條件開始使用。',

    // Calendar
    today: '今天',
    selectDate: '選擇日期',
    tasksDue: '個任務',
    noTasksDue: '此日期沒有到期任務',
    addTaskForDate: '+ 為此日期新增任務',
    months: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    priorityLegend: '優先級：',

    // Dashboard
    totalTasks: '總任務數',
    complete: '完成',
    thisWeek: '本週',
    completedThisWeek: '本週完成',
    needsAttention: '需要關注',
    allOnTrack: '進度正常',
    highPriority: '高優先級',
    estHours: '預估時數',
    logged: '已記錄',
    completionRate: '完成率',
    teamPerformance: '團隊表現',
    noTasksAssigned: '尚未指派任務。指派團隊成員以查看績效指標。',
    tasksByCategory: '依類別分類的任務',
    noCategoriesWithTasks: '尚無包含任務的類別。',
    noData: '暫無資料',
    timeTracking: '時間追蹤',
    statusBreakdown: '狀態分佈',
    efficiency: '效率',
    // Chart titles
    completionTrend: '完成率趨勢',
    teamWorkload: '團隊工作量',
    overdueTrend: '逾期趨勢',
    chartCreated: '新增',
    chartCompleted: '已完成',
    chartActive: '進行中',
    chartTotal: '總計',
    noOverdueTasks: '無逾期任務',
    more: '更多',

    // Team Manager
    teamMembers: '團隊成員',
    noTeamMembers: '尚無團隊成員',
    addFirstMember: '在下方新增第一位團隊成員',
    noEmail: '無電子郵件',
    name: '姓名',
    email: '電子郵件',
    role: '職位',
    addMember: '新增成員',
    confirmRemoveMember: '確定要移除此團隊成員嗎？',

    // User & Permissions
    selectUser: '選擇使用者...',
    selectRole: '切換角色',
    noPermission: '無權限',
    admin: '管理員',
    manager: '經理',
    developer: '開發者',
    designer: '設計師',
    qa: '測試人員',
    roles: {
      admin: '管理員',
      manager: '經理',
      developer: '開發者',
      designer: '設計師',
      qa: '測試人員',
      other: '其他'
    },

    // Category Manager
    manageCategories: '管理類別',
    noCategories: '尚無類別。在下方新增或重設為預設值。',
    newCategory: '新類別',
    categoryName: '類別名稱',
    color: '顏色',
    addCategory: '新增類別',
    reset: '重設',
    confirmReset: '重設為預設類別？這將移除所有自訂類別。',
    confirmDelete: '確定要刪除此類別嗎？此類別中的任務將保留類別，但無法用於新任務。',

    // Time Tracker
    est: '預估',

    // Confirmations
    confirmDeleteTask: '確定要刪除此任務嗎？',

    // Comments
    save: '儲存',
    sending: '發送中...',
    edit: '編輯',
    delete: '刪除',

    // Empty States
    noTasksYet: '尚無任務',
    createTaskBtn: '建立任務',
    noTasksMatch: '找不到符合條件的任務',
    tryDifferentSearch: '請嘗試其他搜尋條件。',
    noNotifications: '沒有通知',
    allCaughtUp: '您已全部閱讀完畢！新通知會顯示在這裡。',
    noComments: '沒有評論',
    beFirstComment: '成為第一個評論此任務的人。',
    noResults: '沒有找到結果',
    getStartedFirstTask: '建立您的第一個任務開始使用',

    // Calendar
    noTasksForDay: '此日期沒有任務',
    addTaskBtn: '新增任務',

    // Comments
    writeComment: '撰寫評論，@ 提及某人...',
    send: '發送',
    pressToSend: '按 ⌘ + Enter 發送',
    justNow: '剛剛',
    minutesAgo: '分鐘前',
    hoursAgo: '小時前',
    daysAgo: '天前',
    edited: '已編輯',
    showMore: '顯示更多',
    showLess: '顯示較少',
    reply: '回覆',
  },

  'zh-CN': {
    // Header
    appName: '中嘉电器(深圳)有限公司',
    businessEdition: '任务管理系统',
    team: '团队',
    categories: '类别',
    export: '导出',
    exportCSV: '导出为 CSV',
    exportJSON: '备份为 JSON',

    // Navigation
    tasks: '任务',
    kanban: '看板',
    calendar: '日历',
    dashboard: '仪表板',

    // Stats
    total: '总计',
    pending: '待处理',
    inProgress: '进行中',
    review: '审核中',
    completed: '已完成',
    overdue: '逾期',

    // Task Form
    newTask: '新建任务',
    editTask: '编辑任务',
    createTask: '创建任务',
    saveChanges: '保存更改',
    cancel: '取消',
    title: '标题',
    titlePlaceholder: '输入任务标题',
    titleRequired: '标题为必填项',
    description: '描述',
    descriptionPlaceholder: '输入任务描述（选填）',
    category: '类别',
    selectCategory: '选择类别',
    categoryRequired: '请选择类别',
    assignee: '负责人',
    unassigned: '未指派',
    priority: '优先级',
    priorityLow: '低',
    priorityMedium: '中',
    priorityHigh: '高',
    priorityCritical: '紧急',
    status: '状态',
    statusPending: '待处理',
    statusInProgress: '进行中',
    statusReview: '审核中',
    statusCompleted: '已完成',
    dueDate: '截止日期',
    estimatedHours: '预估工时',
    tags: '标签',
    tagsPlaceholder: '例如：前端, 紧急, 错误',
    tagsHint: '以逗号分隔',

    // Task Item
    overdueLabel: '逾期',
    dueLabel: '到期',
    dueToday: '今日到期',

    // Filter Bar
    searchPlaceholder: '搜索任务、标签...',
    allCategories: '所有类别',
    allAssignees: '所有负责人',
    allPriorities: '所有优先级',
    allStatuses: '所有状态',
    newestFirst: '最新优先',
    oldestFirst: '最旧优先',
    dueDateSoonest: '截止日期（最近）',
    priorityHighest: '优先级（最高）',
    byAssignee: '按负责人',
    titleAZ: '标题（A-Z）',
    clear: '清除',

    // Task List
    noTasksFound: '找不到任务',
    getStarted: '创建新任务或调整筛选条件开始使用。',

    // Calendar
    today: '今天',
    selectDate: '选择日期',
    tasksDue: '个任务',
    noTasksDue: '此日期没有到期任务',
    addTaskForDate: '+ 为此日期添加任务',
    months: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    priorityLegend: '优先级：',

    // Dashboard
    totalTasks: '总任务数',
    complete: '完成',
    thisWeek: '本周',
    completedThisWeek: '本周完成',
    needsAttention: '需要关注',
    allOnTrack: '进度正常',
    highPriority: '高优先级',
    estHours: '预估工时',
    logged: '已记录',
    completionRate: '完成率',
    teamPerformance: '团队表现',
    noTasksAssigned: '尚未指派任务。指派团队成员以查看绩效指标。',
    tasksByCategory: '按类别分类的任务',
    noCategoriesWithTasks: '尚无包含任务的类别。',
    noData: '暂无数据',
    timeTracking: '时间追踪',
    statusBreakdown: '状态分布',
    efficiency: '效率',
    // Chart titles
    completionTrend: '完成率趋势',
    teamWorkload: '团队工作量',
    overdueTrend: '逾期趋势',
    chartCreated: '新增',
    chartCompleted: '已完成',
    chartActive: '进行中',
    chartTotal: '总计',
    noOverdueTasks: '无逾期任务',
    more: '更多',

    // Team Manager
    teamMembers: '团队成员',
    noTeamMembers: '尚无团队成员',
    addFirstMember: '在下方添加第一位团队成员',
    noEmail: '无电子邮件',
    name: '姓名',
    email: '电子邮件',
    role: '职位',
    addMember: '添加成员',
    confirmRemoveMember: '确定要移除此团队成员吗？',

    // User & Permissions
    selectUser: '选择用户...',
    selectRole: '切换角色',
    noPermission: '无权限',
    admin: '管理员',
    manager: '经理',
    developer: '开发者',
    designer: '设计师',
    qa: '测试人员',
    roles: {
      admin: '管理员',
      manager: '经理',
      developer: '开发者',
      designer: '设计师',
      qa: '测试人员',
      other: '其他'
    },

    // Category Manager
    manageCategories: '管理类别',
    noCategories: '尚无类别。在下方添加或重置为默认值。',
    newCategory: '新类别',
    categoryName: '类别名称',
    color: '颜色',
    addCategory: '添加类别',
    reset: '重置',
    confirmReset: '重置为默认类别？这将移除所有自定义类别。',
    confirmDelete: '确定要删除此类别吗？此类别中的任务将保留类别，但无法用于新任务。',

    // Time Tracker
    est: '预估',

    // Confirmations
    confirmDeleteTask: '确定要删除此任务吗？',

    // Comments
    save: '保存',
    sending: '发送中...',
    edit: '编辑',
    delete: '删除',

    // Empty States
    noTasksYet: '尚无任务',
    createTaskBtn: '创建任务',
    noTasksMatch: '找不到符合条件的任务',
    tryDifferentSearch: '请尝试其他搜索条件。',
    noNotifications: '没有通知',
    allCaughtUp: '您已全部阅读完毕！新通知会显示在这里。',
    noComments: '没有评论',
    beFirstComment: '成为第一个评论此任务的人。',
    noResults: '没有找到结果',
    getStartedFirstTask: '创建您的第一个任务开始使用',

    // Calendar
    noTasksForDay: '此日期没有任务',
    addTaskBtn: '添加任务',

    // Comments
    writeComment: '撰写评论，@ 提及某人...',
    send: '发送',
    pressToSend: '按 ⌘ + Enter 发送',
    justNow: '刚刚',
    minutesAgo: '分钟前',
    hoursAgo: '小时前',
    daysAgo: '天前',
    edited: '已编辑',
    showMore: '显示更多',
    showLess: '显示较少',
    reply: '回复',
  }
}

export const languageNames: Record<string, string> = {
  en: 'English',
  'zh-TW': '繁體中文',
  'zh-CN': '简体中文'
}
