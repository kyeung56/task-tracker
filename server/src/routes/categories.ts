import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get all categories
router.get('/', authMiddleware, (req: AuthRequest, res) => {
  try {
    const categories = db.prepare(`
      SELECT * FROM categories ORDER BY sort_order, name
    `).all() as any[];

    res.json({
      success: true,
      data: categories.map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
        icon: c.icon,
        sortOrder: c.sort_order,
        createdAt: c.created_at,
      })),
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_CATEGORIES_ERROR',
        message: 'Failed to get categories',
      },
    });
  }
});

// Create category
router.post('/', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { name, color = '#6366f1', icon, sortOrder = 0 } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name is required',
        },
      });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO categories (id, name, color, icon, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, name, color, icon || null, sortOrder);

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as any;

    res.status(201).json({
      success: true,
      data: {
        id: category.id,
        name: category.name,
        color: category.color,
        icon: category.icon,
        sortOrder: category.sort_order,
        createdAt: category.created_at,
      },
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_CATEGORY_ERROR',
        message: 'Failed to create category',
      },
    });
  }
});

// Update category
router.put('/:id', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, color, icon, sortOrder } = req.body;

    const existing = db.prepare('SELECT id FROM categories WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: 'Category not found',
        },
      });
    }

    db.prepare(`
      UPDATE categories
      SET name = COALESCE(?, name),
          color = COALESCE(?, color),
          icon = COALESCE(?, icon),
          sort_order = COALESCE(?, sort_order)
      WHERE id = ?
    `).run(name, color, icon, sortOrder, id);

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as any;

    res.json({
      success: true,
      data: {
        id: category.id,
        name: category.name,
        color: category.color,
        icon: category.icon,
        sortOrder: category.sort_order,
        createdAt: category.created_at,
      },
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_CATEGORY_ERROR',
        message: 'Failed to update category',
      },
    });
  }
});

// Delete category
router.delete('/:id', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Check if category has tasks
    const tasksCount = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE category_id = ?').get(id) as { count: number };
    if (tasksCount.count > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CATEGORY_IN_USE',
          message: 'Cannot delete category with associated tasks',
        },
      });
    }

    db.prepare('DELETE FROM categories WHERE id = ?').run(id);

    res.json({
      success: true,
      data: { message: 'Category deleted successfully' },
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_CATEGORY_ERROR',
        message: 'Failed to delete category',
      },
    });
  }
});

export default router;
