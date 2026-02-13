import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { Task, TeamMember, Category } from '../types';

// Role types
export type UserRole = 'admin' | 'manager' | 'developer' | 'designer' | 'qa' | 'other';

// Permission types
export interface Permissions {
  canEditAnyTask: boolean;
  canDeleteAnyTask: boolean;
  canEditCategoryTasks: boolean;
  canEditOwnTasksOnly: boolean;
  canManageCategories: boolean;
  canManageTeam: boolean;
  canExport: boolean;
}

interface PermissionContextType {
  currentUserId: string | null;
  currentUserRole: UserRole;
  currentUserName: string;
  permissions: Permissions;
  setCurrentUser: (userId: string | null, role: UserRole, name: string) => void;
  canEditTask: (task: Task, categories: Category[]) => boolean;
  canDeleteTask: (task: Task) => boolean;
  isAdmin: boolean;
  isManager: boolean;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

// Permission rules by role
const rolePermissions: Record<UserRole, Permissions> = {
  admin: {
    canEditAnyTask: true,
    canDeleteAnyTask: true,
    canEditCategoryTasks: true,
    canEditOwnTasksOnly: false,
    canManageCategories: true,
    canManageTeam: true,
    canExport: true,
  },
  manager: {
    canEditAnyTask: false,
    canDeleteAnyTask: false,
    canEditCategoryTasks: true,
    canEditOwnTasksOnly: false,
    canManageCategories: true,
    canManageTeam: false,
    canExport: true,
  },
  developer: {
    canEditAnyTask: false,
    canDeleteAnyTask: false,
    canEditCategoryTasks: false,
    canEditOwnTasksOnly: true,
    canManageCategories: false,
    canManageTeam: false,
    canExport: false,
  },
  designer: {
    canEditAnyTask: false,
    canDeleteAnyTask: false,
    canEditCategoryTasks: false,
    canEditOwnTasksOnly: true,
    canManageCategories: false,
    canManageTeam: false,
    canExport: false,
  },
  qa: {
    canEditAnyTask: false,
    canDeleteAnyTask: false,
    canEditCategoryTasks: false,
    canEditOwnTasksOnly: true,
    canManageCategories: false,
    canManageTeam: false,
    canExport: false,
  },
  other: {
    canEditAnyTask: false,
    canDeleteAnyTask: false,
    canEditCategoryTasks: false,
    canEditOwnTasksOnly: true,
    canManageCategories: false,
    canManageTeam: false,
    canExport: false,
  },
};

interface PermissionProviderProps {
  children: React.ReactNode;
}

export function PermissionProvider({ children }: PermissionProviderProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    const saved = localStorage.getItem('currentUserId');
    return saved || null;
  });
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('currentUserRole') as UserRole;
    return saved || 'developer';
  });
  const [currentUserName, setCurrentUserName] = useState<string>(() => {
    const saved = localStorage.getItem('currentUserName');
    return saved || '';
  });

  const permissions = useMemo(() => {
    return rolePermissions[currentUserRole] || rolePermissions.developer;
  }, [currentUserRole]);

  const setCurrentUser = useCallback((userId: string | null, role: UserRole, name: string) => {
    setCurrentUserId(userId);
    setCurrentUserRole(role);
    setCurrentUserName(name);
    if (userId) {
      localStorage.setItem('currentUserId', userId);
      localStorage.setItem('currentUserRole', role);
      localStorage.setItem('currentUserName', name);
    } else {
      localStorage.removeItem('currentUserId');
      localStorage.removeItem('currentUserRole');
      localStorage.removeItem('currentUserName');
    }
  }, []);

  const canEditTask = useCallback((task: Task, categories: Category[]): boolean => {
    // Admin can edit any task
    if (permissions.canEditAnyTask) return true;

    // Check if user is the creator or assignee of the task
    const isOwnTask = task.creatorId === currentUserId || task.assigneeId === currentUserId;

    // Developer can only edit own tasks
    if (permissions.canEditOwnTasksOnly && !permissions.canEditCategoryTasks) {
      return isOwnTask;
    }

    // Manager can edit tasks in categories they manage (for now, all categories)
    // In a real system, you'd have category-manager mappings
    if (permissions.canEditCategoryTasks) {
      return true; // Manager can edit all tasks for simplicity
    }

    return isOwnTask;
  }, [permissions, currentUserId]);

  const canDeleteTask = useCallback((task: Task): boolean => {
    // Only admin can delete any task
    if (permissions.canDeleteAnyTask) return true;

    // Others cannot delete tasks
    return false;
  }, [permissions]);

  const isAdmin = useMemo(() => currentUserRole === 'admin', [currentUserRole]);
  const isManager = useMemo(() => currentUserRole === 'manager' || currentUserRole === 'admin', [currentUserRole]);

  return (
    <PermissionContext.Provider
      value={{
        currentUserId,
        currentUserRole,
        currentUserName,
        permissions,
        setCurrentUser,
        canEditTask,
        canDeleteTask,
        isAdmin,
        isManager,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions(): PermissionContextType {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
}

// Helper function to map role string to UserRole
export function mapRoleToUserRole(role: string): UserRole {
  const roleMap: Record<string, UserRole> = {
    admin: 'admin',
    manager: 'manager',
    developer: 'developer',
    designer: 'designer',
    qa: 'qa',
  };
  return roleMap[role.toLowerCase()] || 'other';
}
