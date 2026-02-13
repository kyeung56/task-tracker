import React from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { usePermissions, mapRoleToUserRole, type UserRole } from '../hooks/usePermissions';
import type { TeamMember } from '../types';

interface UserSelectorProps {
  teamMembers: TeamMember[];
}

const roleLabels: Record<UserRole, { label: string; color: string; icon: string }> = {
  admin: { label: '管理员', color: 'bg-red-500', icon: '👑' },
  manager: { label: '经理', color: 'bg-purple-500', icon: '📋' },
  developer: { label: '开发者', color: 'bg-blue-500', icon: '💻' },
  designer: { label: '设计师', color: 'bg-pink-500', icon: '🎨' },
  qa: { label: '测试人员', color: 'bg-green-500', icon: '🔍' },
  other: { label: '其他', color: 'bg-gray-500', icon: '👤' },
};

const UserSelector: React.FC<UserSelectorProps> = ({ teamMembers }) => {
  const { t } = useLanguage();
  const { currentUserId, currentUserRole, currentUserName, setCurrentUser } = usePermissions();

  const handleUserChange = (userId: string) => {
    if (userId === '') {
      setCurrentUser(null, 'developer', '');
      return;
    }
    const member = teamMembers.find(m => m.id === userId);
    if (member) {
      const role = mapRoleToUserRole(member.role);
      setCurrentUser(member.id, role, member.name);
    }
  };

  const handleRoleChange = (role: UserRole) => {
    setCurrentUser(currentUserId, role, currentUserName);
  };

  const currentRoleInfo = roleLabels[currentUserRole];

  return (
    <div className="space-y-3">
      {/* Current User Display */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg">
        <div className={`w-8 h-8 rounded-full ${currentRoleInfo.color} flex items-center justify-center text-lg`}>
          {currentRoleInfo.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {currentUserName || t('unassigned')}
          </p>
          <p className="text-xs text-slate-400">{currentRoleInfo.label}</p>
        </div>
      </div>

      {/* User Selection */}
      <select
        value={currentUserId || ''}
        onChange={(e) => handleUserChange(e.target.value)}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">{t('selectUser') || '选择用户...'}</option>
        {teamMembers.map(member => (
          <option key={member.id} value={member.id}>
            {member.name} ({roleLabels[mapRoleToUserRole(member.role)]?.label || member.role})
          </option>
        ))}
      </select>

      {/* Role Selection */}
      <div className="space-y-1">
        <p className="text-xs text-slate-400 px-1">{t('selectRole') || '切换角色'}</p>
        <div className="grid grid-cols-2 gap-1">
          {(Object.keys(roleLabels) as UserRole[]).map(role => {
            const info = roleLabels[role];
            const isActive = currentUserRole === role;
            return (
              <button
                key={role}
                onClick={() => handleRoleChange(role)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? `${info.color} text-white`
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <span>{info.icon}</span>
                <span>{info.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default UserSelector;
