import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import db, { initializeDatabase } from './index.js';

const SALT_ROUNDS = 10;

export async function seedDatabase() {
  initializeDatabase();

  // Check if already seeded
  const existingRoles = db.prepare('SELECT COUNT(*) as count FROM roles').get() as { count: number };
  if (existingRoles.count > 0) {
    console.log('Database already seeded');
    return;
  }

  console.log('Seeding database...');

  // Insert roles
  const roles = [
    {
      id: uuidv4(),
      name: 'admin',
      display_name: 'Administrator',
      permissions: JSON.stringify({
        canCreateTask: true,
        canEditTask: true,
        canDeleteTask: true,
        canAssignTask: true,
        canManageUsers: true,
        canManageCategories: true,
        canManageWorkflows: true,
        canViewAllTasks: true,
        canExportData: true,
      }),
    },
    {
      id: uuidv4(),
      name: 'manager',
      display_name: 'Manager',
      permissions: JSON.stringify({
        canCreateTask: true,
        canEditTask: true,
        canDeleteTask: true,
        canAssignTask: true,
        canManageUsers: false,
        canManageCategories: true,
        canManageWorkflows: false,
        canViewAllTasks: true,
        canExportData: true,
      }),
    },
    {
      id: uuidv4(),
      name: 'member',
      display_name: 'Team Member',
      permissions: JSON.stringify({
        canCreateTask: true,
        canEditTask: true,
        canDeleteTask: false,
        canAssignTask: false,
        canManageUsers: false,
        canManageCategories: false,
        canManageWorkflows: false,
        canViewAllTasks: false,
        canExportData: false,
      }),
    },
  ];

  const insertRole = db.prepare(`
    INSERT INTO roles (id, name, display_name, permissions)
    VALUES (@id, @name, @display_name, @permissions)
  `);

  for (const role of roles) {
    insertRole.run(role);
  }

  // Get role IDs
  const adminRole = db.prepare("SELECT id FROM roles WHERE name = 'admin'").get() as { id: string };
  const memberRole = db.prepare("SELECT id FROM roles WHERE name = 'member'").get() as { id: string };

  // Insert default admin user
  const adminPasswordHash = await bcrypt.hash('admin123', SALT_ROUNDS);
  const adminId = uuidv4();

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role_id, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
  `);

  insertUser.run(adminId, 'Admin User', 'admin@example.com', adminPasswordHash, adminRole.id);

  // Insert sample team members
  const sampleUsers = [
    { name: '张三', email: 'zhangsan@example.com' },
    { name: '李四', email: 'lisi@example.com' },
    { name: '王五', email: 'wangwu@example.com' },
  ];

  for (const user of sampleUsers) {
    const passwordHash = await bcrypt.hash('password123', SALT_ROUNDS);
    insertUser.run(uuidv4(), user.name, user.email, passwordHash, memberRole.id);
  }

  // Insert default categories
  const categories = [
    { id: uuidv4(), name: '产品开发', color: '#3b82f6', icon: 'code', sort_order: 0 },
    { id: uuidv4(), name: '市场营销', color: '#10b981', icon: 'megaphone', sort_order: 1 },
    { id: uuidv4(), name: '客户支持', color: '#f59e0b', icon: 'headphones', sort_order: 2 },
    { id: uuidv4(), name: '运营管理', color: '#8b5cf6', icon: 'cog', sort_order: 3 },
    { id: uuidv4(), name: '人力资源', color: '#ec4899', icon: 'users', sort_order: 4 },
  ];

  const insertCategory = db.prepare(`
    INSERT INTO categories (id, name, color, icon, sort_order)
    VALUES (@id, @name, @color, @icon, @sort_order)
  `);

  for (const category of categories) {
    insertCategory.run(category);
  }

  // Insert default workflow config
  const defaultWorkflow = {
    id: uuidv4(),
    name: 'Default Workflow',
    description: 'Standard task workflow for the team',
    is_default: 1,
    statuses: JSON.stringify([
      { id: 'pending', name: '待处理', color: '#6b7280', order: 1 },
      { id: 'in_progress', name: '进行中', color: '#3b82f6', order: 2 },
      { id: 'waiting', name: '等待确认', color: '#f59e0b', order: 3 },
      { id: 'review', name: '审核中', color: '#8b5cf6', order: 4 },
      { id: 'completed', name: '已完成', color: '#10b981', order: 5 },
      { id: 'cancelled', name: '已取消', color: '#ef4444', order: 6 },
      { id: 'deferred', name: '已延期', color: '#f97316', order: 7 },
    ]),
    transitions: JSON.stringify([
      { from: 'pending', to: ['in_progress', 'cancelled'] },
      { from: 'in_progress', to: ['waiting', 'review', 'completed', 'deferred', 'cancelled'] },
      { from: 'waiting', to: ['in_progress', 'completed', 'deferred'] },
      { from: 'review', to: ['in_progress', 'completed', 'deferred'] },
      { from: 'deferred', to: ['in_progress', 'cancelled'] },
    ]),
    role_restrictions: JSON.stringify({}),
  };

  const insertWorkflow = db.prepare(`
    INSERT INTO workflow_configs (id, name, description, is_default, statuses, transitions, role_restrictions)
    VALUES (@id, @name, @description, @is_default, @statuses, @transitions, @role_restrictions)
  `);

  insertWorkflow.run(defaultWorkflow);

  console.log('Database seeded successfully');
  console.log('Default admin: admin@example.com / admin123');
}

seedDatabase().catch(console.error);
