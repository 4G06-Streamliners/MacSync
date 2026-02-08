'use client';

import { useState, useEffect } from 'react';
import { User, Mail, Phone, BookOpen, Shield, Save } from 'lucide-react';
import { updateUser } from '../lib/api';
import { useUser } from '../context/UserContext';

export default function ProfilePage() {
  const { currentUser, isAdmin, loading, switchUser } = useUser();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    program: '',
  });

  useEffect(() => {
    if (currentUser) {
      setForm({
        name: currentUser.name,
        email: currentUser.email,
        phoneNumber: currentUser.phoneNumber,
        program: currentUser.program || '',
      });
      setEditing(false);
    }
  }, [currentUser]);

  const handleSave = async () => {
    if (!currentUser) return;
    setSaving(true);
    setSuccess('');

    try {
      await updateUser(currentUser.id, {
        name: form.name,
        phoneNumber: form.phoneNumber,
        program: form.program || null,
      } as any);
      setSuccess('Profile updated successfully.');
      setEditing(false);
      // Refresh user data
      switchUser(currentUser.id);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-[#7A1F3E] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-500 text-center py-16">
          Please select a user to view profile.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-500 mt-1">Manage your account information</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        {/* Avatar & Role */}
        <div className="p-6 border-b border-gray-100 flex items-center gap-4">
          <div className="w-16 h-16 bg-[#7A1F3E] rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {currentUser.name}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              {isAdmin && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                  <Shield className="w-3 h-3" />
                  Admin
                </span>
              )}
              {currentUser.roles?.map((role) => (
                <span
                  key={role}
                  className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Fields */}
        <div className="p-6 space-y-5">
          {success && (
            <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm">
              {success}
            </div>
          )}

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <Mail className="w-4 h-4" /> Email
            </label>
            <input
              type="email"
              value={form.email}
              disabled
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">
              Email cannot be changed.
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <User className="w-4 h-4" /> Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              disabled={!editing}
              className={`w-full px-4 py-2.5 border rounded-lg outline-none ${
                editing
                  ? 'border-gray-300 focus:ring-2 focus:ring-[#7A1F3E] focus:border-transparent'
                  : 'border-gray-200 bg-gray-50 text-gray-500'
              }`}
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <Phone className="w-4 h-4" /> Phone Number
            </label>
            <input
              type="tel"
              value={form.phoneNumber}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, phoneNumber: e.target.value }))
              }
              disabled={!editing}
              className={`w-full px-4 py-2.5 border rounded-lg outline-none ${
                editing
                  ? 'border-gray-300 focus:ring-2 focus:ring-[#7A1F3E] focus:border-transparent'
                  : 'border-gray-200 bg-gray-50 text-gray-500'
              }`}
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <BookOpen className="w-4 h-4" /> Program
            </label>
            <input
              type="text"
              value={form.program}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, program: e.target.value }))
              }
              disabled={!editing}
              placeholder={editing ? 'e.g. Computer Science' : '—'}
              className={`w-full px-4 py-2.5 border rounded-lg outline-none ${
                editing
                  ? 'border-gray-300 focus:ring-2 focus:ring-[#7A1F3E] focus:border-transparent'
                  : 'border-gray-200 bg-gray-50 text-gray-500'
              }`}
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex gap-3">
            {editing ? (
              <>
                <button
                  onClick={() => {
                    setEditing(false);
                    setForm({
                      name: currentUser.name,
                      email: currentUser.email,
                      phoneNumber: currentUser.phoneNumber,
                      program: currentUser.program || '',
                    });
                  }}
                  className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-[#7A1F3E] text-white rounded-lg text-sm font-semibold hover:bg-[#621832] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="px-6 py-2.5 bg-[#7A1F3E] text-white rounded-lg text-sm font-semibold hover:bg-[#621832] transition-colors"
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
