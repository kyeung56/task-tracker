import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import notificationsApi from '../../api/notifications';
import type { NotificationPreferences, EmailConfig } from '../../types';

interface NotificationSettingsProps {
  isAdmin: boolean;
  onClose?: () => void;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ isAdmin, onClose }) => {
  const { t } = useLanguage();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [emailConfig, setEmailConfig] = useState<EmailConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'preferences' | 'email'>('preferences');

  // Email config form state
  const [emailForm, setEmailForm] = useState({
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: '',
    smtpPassword: '',
    fromEmail: '',
    fromName: 'Task Tracker',
    isEnabled: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const prefs = await notificationsApi.getPreferences();
      setPreferences(prefs);

      if (isAdmin) {
        const config = await notificationsApi.getEmailConfig();
        if (config) {
          setEmailConfig(config);
          setEmailForm({
            smtpHost: config.smtpHost || '',
            smtpPort: config.smtpPort || 587,
            smtpSecure: config.smtpSecure || false,
            smtpUser: config.smtpUser || '',
            smtpPassword: '',
            fromEmail: config.fromEmail || '',
            fromName: config.fromName || 'Task Tracker',
            isEnabled: config.isEnabled || false,
          });
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceChange = async (key: keyof NotificationPreferences, value: boolean | number) => {
    if (!preferences) return;

    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);

    setSaving(true);
    try {
      await notificationsApi.updatePreferences({ [key]: value });
    } catch (error) {
      console.error('Failed to update preference:', error);
      setPreferences(preferences); // Revert on error
    } finally {
      setSaving(false);
    }
  };

  const handleEmailConfigChange = (key: keyof typeof emailForm, value: string | number | boolean) => {
    setEmailForm(prev => ({ ...prev, [key]: value }));
  };

  const saveEmailConfig = async () => {
    setSaving(true);
    try {
      const config = await notificationsApi.updateEmailConfig({
        smtpHost: emailForm.smtpHost,
        smtpPort: emailForm.smtpPort,
        smtpSecure: emailForm.smtpSecure,
        smtpUser: emailForm.smtpUser,
        smtpPassword: emailForm.smtpPassword || undefined,
        fromEmail: emailForm.fromEmail,
        fromName: emailForm.fromName,
        isEnabled: emailForm.isEnabled,
      });
      if (config) {
        setEmailConfig(config);
      }
    } catch (error) {
      console.error('Failed to save email config:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) return;

    setTesting(true);
    setTestResult(null);
    try {
      const result = await notificationsApi.testEmailConfig(testEmail);
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, message: 'Failed to send test email' });
    } finally {
      setTesting(false);
    }
  };

  const ToggleSwitch: React.FC<{
    checked: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
  }> = ({ checked, onChange, disabled }) => (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-indigo-600' : 'bg-gray-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('notificationSettings') || 'Notification Settings'}
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {isAdmin && (
          <div className="mt-4 flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('preferences')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'preferences'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('myPreferences') || 'My Preferences'}
            </button>
            <button
              onClick={() => setActiveTab('email')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'email'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('emailConfig') || 'Email Configuration'}
            </button>
          </div>
        )}
      </div>

      <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
        {saving && (
          <div className="fixed top-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
            {t('saving') || 'Saving...'}
          </div>
        )}

        {(activeTab === 'preferences' || !isAdmin) && preferences && (
          <div className="space-y-6">
            {/* Task Assignment */}
            <div className="border-b border-gray-100 pb-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                {t('taskAssignment') || 'Task Assignment'}
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('inAppNotification') || 'In-App Notification'}</span>
                  <ToggleSwitch
                    checked={preferences.taskAssignedInApp}
                    onChange={(v) => handlePreferenceChange('taskAssignedInApp', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('emailNotification') || 'Email Notification'}</span>
                  <ToggleSwitch
                    checked={preferences.taskAssignedEmail}
                    onChange={(v) => handlePreferenceChange('taskAssignedEmail', v)}
                  />
                </div>
              </div>
            </div>

            {/* Mentions */}
            <div className="border-b border-gray-100 pb-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                {t('mentions') || '@Mentions'}
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('inAppNotification') || 'In-App Notification'}</span>
                  <ToggleSwitch
                    checked={preferences.mentionedInApp}
                    onChange={(v) => handlePreferenceChange('mentionedInApp', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('emailNotification') || 'Email Notification'}</span>
                  <ToggleSwitch
                    checked={preferences.mentionedEmail}
                    onChange={(v) => handlePreferenceChange('mentionedEmail', v)}
                  />
                </div>
              </div>
            </div>

            {/* Status Changes */}
            <div className="border-b border-gray-100 pb-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                {t('statusChanges') || 'Status Changes'}
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('inAppNotification') || 'In-App Notification'}</span>
                  <ToggleSwitch
                    checked={preferences.statusChangedInApp}
                    onChange={(v) => handlePreferenceChange('statusChangedInApp', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('emailNotification') || 'Email Notification'}</span>
                  <ToggleSwitch
                    checked={preferences.statusChangedEmail}
                    onChange={(v) => handlePreferenceChange('statusChangedEmail', v)}
                  />
                </div>
              </div>
            </div>

            {/* Due Date Reminders */}
            <div className="border-b border-gray-100 pb-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                {t('dueDateReminders') || 'Due Date Reminders'}
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('dueSoonInApp') || 'Due Soon (In-App)'}</span>
                  <ToggleSwitch
                    checked={preferences.dueSoonInApp}
                    onChange={(v) => handlePreferenceChange('dueSoonInApp', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('dueSoonEmail') || 'Due Soon (Email)'}</span>
                  <ToggleSwitch
                    checked={preferences.dueSoonEmail}
                    onChange={(v) => handlePreferenceChange('dueSoonEmail', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('overdueInApp') || 'Overdue (In-App)'}</span>
                  <ToggleSwitch
                    checked={preferences.overdueInApp}
                    onChange={(v) => handlePreferenceChange('overdueInApp', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('overdueEmail') || 'Overdue (Email)'}</span>
                  <ToggleSwitch
                    checked={preferences.overdueEmail}
                    onChange={(v) => handlePreferenceChange('overdueEmail', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('remindDaysBefore') || 'Days Before Due'}</span>
                  <select
                    value={preferences.dueSoonDays}
                    onChange={(e) => handlePreferenceChange('dueSoonDays', parseInt(e.target.value))}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    <option value={1}>1 day</option>
                    <option value={2}>2 days</option>
                    <option value={3}>3 days</option>
                    <option value={5}>5 days</option>
                    <option value={7}>7 days</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'email' && isAdmin && (
          <div className="space-y-6">
            {/* Enable Email */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-medium text-gray-900">
                  {t('enableEmailNotifications') || 'Enable Email Notifications'}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {t('enableEmailDesc') || 'Turn on to send email notifications to users'}
                </p>
              </div>
              <ToggleSwitch
                checked={emailForm.isEnabled}
                onChange={(v) => handleEmailConfigChange('isEnabled', v)}
              />
            </div>

            {/* SMTP Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900">
                {t('smtpSettings') || 'SMTP Settings'}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('smtpHost') || 'SMTP Host'}
                  </label>
                  <input
                    type="text"
                    value={emailForm.smtpHost}
                    onChange={(e) => handleEmailConfigChange('smtpHost', e.target.value)}
                    placeholder="smtp.example.com"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('smtpPort') || 'Port'}
                  </label>
                  <input
                    type="number"
                    value={emailForm.smtpPort}
                    onChange={(e) => handleEmailConfigChange('smtpPort', parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="smtpSecure"
                  checked={emailForm.smtpSecure}
                  onChange={(e) => handleEmailConfigChange('smtpSecure', e.target.checked)}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                />
                <label htmlFor="smtpSecure" className="ml-2 text-sm text-gray-700">
                  {t('useTLS') || 'Use TLS/SSL'}
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('smtpUser') || 'Username'}
                  </label>
                  <input
                    type="text"
                    value={emailForm.smtpUser}
                    onChange={(e) => handleEmailConfigChange('smtpUser', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('smtpPassword') || 'Password'}
                  </label>
                  <input
                    type="password"
                    value={emailForm.smtpPassword}
                    onChange={(e) => handleEmailConfigChange('smtpPassword', e.target.value)}
                    placeholder={emailConfig?.smtpPasswordSet ? '••••••••' : ''}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Sender Settings */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-medium text-gray-900">
                {t('senderSettings') || 'Sender Settings'}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('fromEmail') || 'From Email'}
                  </label>
                  <input
                    type="email"
                    value={emailForm.fromEmail}
                    onChange={(e) => handleEmailConfigChange('fromEmail', e.target.value)}
                    placeholder="noreply@example.com"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('fromName') || 'From Name'}
                  </label>
                  <input
                    type="text"
                    value={emailForm.fromName}
                    onChange={(e) => handleEmailConfigChange('fromName', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Save & Test */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <button
                onClick={saveEmailConfig}
                disabled={saving}
                className="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? (t('saving') || 'Saving...') : (t('saveChanges') || 'Save Changes')}
              </button>

              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder={t('testEmailAddress') || 'Email to test'}
                  className="border border-gray-300 rounded px-3 py-2 text-sm w-48"
                />
                <button
                  onClick={handleTestEmail}
                  disabled={testing || !testEmail}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
                >
                  {testing ? (t('sending') || 'Sending...') : (t('testEmail') || 'Test')}
                </button>
              </div>
            </div>

            {testResult && (
              <div className={`p-3 rounded ${testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {testResult.success
                  ? (t('testEmailSent') || 'Test email sent successfully!')
                  : testResult.message
                }
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationSettings;
