import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  Save,
  User,
  Mail,
  Building,
  Shield,
  Lock
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { User as UserType } from '@/types/lms';

const UserManagement: React.FC = () => {
  const { user: currentUser, users, addUser, updateUser, deleteUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'learner' | 'manager' | 'admin'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [resettingUser, setResettingUser] = useState<UserType | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'learner',
    department: '',
    canSwitchToLearnerView: false,
    password: '',
    confirmPassword: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: 'learner',
      department: '',
      canSwitchToLearnerView: false,
      password: '',
      confirmPassword: '',
    });
    setEditingUser(null);
  };

  const openModal = (user?: UserType) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department || '',
        canSwitchToLearnerView: !!user.canSwitchToLearnerView,
        password: '',
        confirmPassword: '',
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingUser) {
      updateUser(editingUser.id, {
        name: formData.name,
        email: formData.email,
        role: formData.role as UserType['role'],
        department: formData.department,
        canSwitchToLearnerView: formData.role === 'admin' ? formData.canSwitchToLearnerView : false,
      });
      toast({
        title: "User Updated",
        description: `${formData.name}'s profile has been updated.`,
      });
    } else {
      if (formData.password.length < 6) {
        toast({
          title: "Password too short",
          description: "Password must be at least 6 characters.",
        });
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast({
          title: "Passwords do not match",
          description: "Please confirm the password correctly.",
        });
        return;
      }
      addUser({
        name: formData.name,
        email: formData.email,
        role: formData.role as UserType['role'],
        department: formData.department,
        canSwitchToLearnerView: formData.role === 'admin' ? formData.canSwitchToLearnerView : false,
        password: formData.password,
      });
      toast({
        title: "User Created",
        description: `${formData.name} has been added to the system.`,
      });
    }

    closeModal();
  };

  const handleDelete = async (user: UserType) => {
    if (window.confirm(`Are you sure you want to delete ${user.name}?`)) {
      const ok = await deleteUser(user.id);
      if (ok) {
        toast({
          title: "User Deleted",
          description: `${user.name} has been removed from the system.`,
        });
      } else {
        toast({
          title: "Delete failed",
          description: `Could not delete ${user.name}. Check permissions and try again.`,
        });
      }
    }
  };

  const closeResetModal = () => {
    setResettingUser(null);
    setResetPassword('');
    setResetPasswordConfirm('');
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;
    if (resetPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
      });
      return;
    }
    if (resetPassword !== resetPasswordConfirm) {
      toast({
        title: "Passwords do not match",
        description: "Please confirm the password correctly.",
      });
      return;
    }
    updateUser(resettingUser.id, { password: resetPassword });
    toast({
      title: "Password reset",
      description: `Password updated for ${resettingUser.name}.`,
    });
    closeResetModal();
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Header */}
        <section className="bg-card border-b border-border py-8">
          <div className="container mx-auto px-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">User Management</h1>
                <p className="text-muted-foreground">Manage users and their roles</p>
              </div>
              <button
                onClick={() => openModal()}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add New User
              </button>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{users.length}</p>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {users.filter(u => u.role === 'learner').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Learners</p>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                  <Building className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {users.filter(u => u.role === 'manager').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Managers</p>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {users.filter(u => u.role === 'admin').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Instructors</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="input-field pl-12"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="input-field w-full sm:w-40"
            >
              <option value="all">All Roles</option>
              <option value="learner">Learners</option>
              <option value="manager">Managers</option>
              <option value="admin">Instructors</option>
            </select>
          </div>

          {/* Users Table */}
          <div className="card-elevated overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">User</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-foreground hidden md:table-cell">Department</th>
                    <th className="text-center px-6 py-4 text-sm font-semibold text-foreground">Role</th>
                    <th className="text-center px-6 py-4 text-sm font-semibold text-foreground">CPD Points</th>
                    <th className="text-center px-6 py-4 text-sm font-semibold text-foreground hidden lg:table-cell">Courses</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell text-muted-foreground">
                        {user.department || '-'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`badge ${user.role === 'admin' ? 'bg-destructive/10 text-destructive' :
                          user.role === 'manager' ? 'bg-warning/10 text-warning' :
                            'badge-primary'
                          }`}>
                          {user.role === 'admin' ? 'Admin' : user.role === 'manager' ? 'Manager' : 'Learner'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {user.role === 'learner' ? (
                          <span className="badge badge-success">{user.totalCpdPoints}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center hidden lg:table-cell text-muted-foreground">
                        {user.completedCourses.length} / {user.progress.length + user.completedCourses.length}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openModal(user)}
                            className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            aria-label="Edit user"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setResettingUser(user)}
                            className="p-2 rounded-lg text-muted-foreground hover:text-warning hover:bg-warning/10 transition-colors"
                            aria-label="Reset password"
                            title="Reset password"
                          >
                            <Lock className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => void handleDelete(user)}
                            disabled={user.role === 'manager'}
                            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                            aria-label="Delete user"
                            title={user.role === 'manager' ? 'System Manager cannot be deleted' : 'Delete user'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md rounded-xl shadow-xl overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-bold text-foreground">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field pl-12"
                    placeholder="Enter full name"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-field pl-12"
                    placeholder="Enter email"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Department</label>
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="input-field pl-12"
                    placeholder="Enter department"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserType['role'] })}
                  className="input-field"
                >
                  <option value="learner">Learner</option>
                  <option value="manager">Manager</option>
                  {currentUser?.role === 'admin' && (
                    <option value="admin">Admin</option>
                  )}
                </select>
              </div>

              {formData.role === 'admin' && currentUser?.role === 'manager' && (
                <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                  <input
                    type="checkbox"
                    checked={formData.canSwitchToLearnerView}
                    onChange={(e) => setFormData({ ...formData, canSwitchToLearnerView: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-foreground">Allow Instructor to switch to Learner view</span>
                </label>
              )}

              {!editingUser && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="input-field pl-12"
                        placeholder="Enter password"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className="input-field pl-12"
                        placeholder="Confirm password"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" />
                  {editingUser ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resettingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md rounded-xl shadow-xl overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-bold text-foreground">Reset Password</h2>
              <button
                onClick={closeResetModal}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Set a new password for <span className="font-medium text-foreground">{resettingUser.name}</span>.
              </p>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    className="input-field pl-12"
                    placeholder="Enter new password"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="password"
                    value={resetPasswordConfirm}
                    onChange={(e) => setResetPasswordConfirm(e.target.value)}
                    className="input-field pl-12"
                    placeholder="Confirm new password"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeResetModal} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
