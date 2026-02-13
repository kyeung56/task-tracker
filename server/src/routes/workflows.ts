import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { authMiddleware, requirePermission, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get all workflows
router.get('/', authMiddleware, (req: AuthRequest, res) => {
  try {
    const workflows = db.prepare(`
      SELECT * FROM workflow_configs ORDER BY is_default DESC, name
    `).all() as any[];

    res.json({
      success: true,
      data: workflows.map((w) => ({
        id: w.id,
        name: w.name,
        description: w.description,
        isDefault: w.is_default === 1,
        statuses: JSON.parse(w.statuses),
        transitions: JSON.parse(w.transitions),
        roleRestrictions: JSON.parse(w.role_restrictions),
        createdAt: w.created_at,
        updatedAt: w.updated_at,
      })),
    });
  } catch (error) {
    console.error('Get workflows error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_WORKFLOWS_ERROR',
        message: 'Failed to get workflows',
      },
    });
  }
});

// Get default workflow
router.get('/default', authMiddleware, (req: AuthRequest, res) => {
  try {
    const workflow = db.prepare(`
      SELECT * FROM workflow_configs WHERE is_default = 1 LIMIT 1
    `).get() as any;

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'WORKFLOW_NOT_FOUND',
          message: 'No default workflow configured',
        },
      });
    }

    res.json({
      success: true,
      data: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        isDefault: workflow.is_default === 1,
        statuses: JSON.parse(workflow.statuses),
        transitions: JSON.parse(workflow.transitions),
        roleRestrictions: JSON.parse(workflow.role_restrictions),
        createdAt: workflow.created_at,
        updatedAt: workflow.updated_at,
      },
    });
  } catch (error) {
    console.error('Get default workflow error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_WORKFLOW_ERROR',
        message: 'Failed to get default workflow',
      },
    });
  }
});

// Get workflow by ID
router.get('/:id', authMiddleware, (req: AuthRequest, res) => {
  try {
    const workflow = db.prepare(`
      SELECT * FROM workflow_configs WHERE id = ?
    `).get(req.params.id) as any;

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'WORKFLOW_NOT_FOUND',
          message: 'Workflow not found',
        },
      });
    }

    res.json({
      success: true,
      data: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        isDefault: workflow.is_default === 1,
        statuses: JSON.parse(workflow.statuses),
        transitions: JSON.parse(workflow.transitions),
        roleRestrictions: JSON.parse(workflow.role_restrictions),
        createdAt: workflow.created_at,
        updatedAt: workflow.updated_at,
      },
    });
  } catch (error) {
    console.error('Get workflow error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_WORKFLOW_ERROR',
        message: 'Failed to get workflow',
      },
    });
  }
});

// Create workflow (admin only)
router.post('/', authMiddleware, requirePermission('canManageWorkflows'), (req: AuthRequest, res) => {
  try {
    const { name, description, statuses, transitions, roleRestrictions = {}, isDefault = false } = req.body;

    if (!name || !statuses || !transitions) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name, statuses, and transitions are required',
        },
      });
    }

    const id = uuidv4();

    // If setting as default, unset other defaults
    if (isDefault) {
      db.prepare('UPDATE workflow_configs SET is_default = 0').run();
    }

    db.prepare(`
      INSERT INTO workflow_configs (id, name, description, is_default, statuses, transitions, role_restrictions)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      name,
      description || null,
      isDefault ? 1 : 0,
      JSON.stringify(statuses),
      JSON.stringify(transitions),
      JSON.stringify(roleRestrictions)
    );

    res.status(201).json({
      success: true,
      data: {
        id,
        name,
        description,
        isDefault,
        statuses,
        transitions,
        roleRestrictions,
      },
    });
  } catch (error) {
    console.error('Create workflow error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_WORKFLOW_ERROR',
        message: 'Failed to create workflow',
      },
    });
  }
});

// Update workflow (admin only)
router.put('/:id', authMiddleware, requirePermission('canManageWorkflows'), (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, description, statuses, transitions, roleRestrictions, isDefault } = req.body;

    const existing = db.prepare('SELECT * FROM workflow_configs WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'WORKFLOW_NOT_FOUND',
          message: 'Workflow not found',
        },
      });
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      db.prepare('UPDATE workflow_configs SET is_default = 0').run();
    }

    db.prepare(`
      UPDATE workflow_configs
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          is_default = COALESCE(?, is_default),
          statuses = COALESCE(?, statuses),
          transitions = COALESCE(?, transitions),
          role_restrictions = COALESCE(?, role_restrictions),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name,
      description,
      isDefault !== undefined ? (isDefault ? 1 : 0) : undefined,
      statuses ? JSON.stringify(statuses) : undefined,
      transitions ? JSON.stringify(transitions) : undefined,
      roleRestrictions ? JSON.stringify(roleRestrictions) : undefined,
      id
    );

    const workflow = db.prepare('SELECT * FROM workflow_configs WHERE id = ?').get(id) as any;

    res.json({
      success: true,
      data: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        isDefault: workflow.is_default === 1,
        statuses: JSON.parse(workflow.statuses),
        transitions: JSON.parse(workflow.transitions),
        roleRestrictions: JSON.parse(workflow.role_restrictions),
        createdAt: workflow.created_at,
        updatedAt: workflow.updated_at,
      },
    });
  } catch (error) {
    console.error('Update workflow error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_WORKFLOW_ERROR',
        message: 'Failed to update workflow',
      },
    });
  }
});

// Delete workflow (admin only)
router.delete('/:id', authMiddleware, requirePermission('canManageWorkflows'), (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const workflow = db.prepare('SELECT * FROM workflow_configs WHERE id = ?').get(id) as any;
    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'WORKFLOW_NOT_FOUND',
          message: 'Workflow not found',
        },
      });
    }

    if (workflow.is_default === 1) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_DELETE_DEFAULT',
          message: 'Cannot delete the default workflow',
        },
      });
    }

    db.prepare('DELETE FROM workflow_configs WHERE id = ?').run(id);

    res.json({
      success: true,
      data: { message: 'Workflow deleted successfully' },
    });
  } catch (error) {
    console.error('Delete workflow error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_WORKFLOW_ERROR',
        message: 'Failed to delete workflow',
      },
    });
  }
});

// Validate status transition
router.post('/:id/validate-transition', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { fromStatus, toStatus, userRole } = req.body;

    const workflow = db.prepare('SELECT * FROM workflow_configs WHERE id = ?').get(id) as any;
    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'WORKFLOW_NOT_FOUND',
          message: 'Workflow not found',
        },
      });
    }

    const transitions = JSON.parse(workflow.transitions) as { from: string; to: string[] }[];
    const roleRestrictions = JSON.parse(workflow.role_restrictions) as Record<string, string[]>;

    // Find the transition rule
    const transitionRule = transitions.find((t) => t.from === fromStatus);

    if (!transitionRule) {
      return res.json({
        success: true,
        data: { valid: false, reason: 'No transition rule found for current status' },
      });
    }

    if (!transitionRule.to.includes(toStatus)) {
      return res.json({
        success: true,
        data: { valid: false, reason: 'Transition not allowed' },
      });
    }

    // Check role restrictions
    const transitionKey = `${fromStatus}->${toStatus}`;
    if (roleRestrictions[transitionKey] && roleRestrictions[transitionKey].length > 0) {
      if (!roleRestrictions[transitionKey].includes(userRole)) {
        return res.json({
          success: true,
          data: { valid: false, reason: 'Role not authorized for this transition' },
        });
      }
    }

    res.json({
      success: true,
      data: { valid: true },
    });
  } catch (error) {
    console.error('Validate transition error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'VALIDATE_TRANSITION_ERROR',
        message: 'Failed to validate transition',
      },
    });
  }
});

export default router;
