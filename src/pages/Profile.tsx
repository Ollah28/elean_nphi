import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useCourses } from '@/context/CourseContext';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { toast } from '@/hooks/use-toast';
import {
  User,
  Mail,
  Building,
  Calendar,
  Award,
  BookOpen,
  TrendingUp,
  CheckCircle,
  Clock,
  Edit2,
  Camera,
  Save,
  X,
} from 'lucide-react';

const Profile: React.FC = () => {
  const { user, updateMyProfile } = useAuth();
  const { getCourseById } = useCourses();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDepartment, setFormDepartment] = useState('');
  const [formAvatar, setFormAvatar] = useState('');

  if (!user) return null;

  const isLearner = user.role === 'learner';
  const roleLabel = user.role === 'admin' ? 'Instructor' : user.role === 'manager' ? 'Manager' : 'Learner';

  const completedCourseDetails = user.completedCourses
    .map((courseId) => getCourseById(courseId))
    .filter(Boolean);

  const inProgressCourses = user.progress
    .filter((p) => p.progress > 0 && p.progress < 100)
    .map((p) => {
      const course = getCourseById(p.courseId);
      return course ? { ...course, progress: p.progress } : null;
    })
    .filter(Boolean);

  const initial = useMemo(() => user.name.charAt(0).toUpperCase(), [user.name]);

  const openEditModal = () => {
    setFormName(user.name || '');
    setFormDepartment(user.department || '');
    setFormAvatar(user.avatar || '');
    setIsEditOpen(true);
  };

  const handleAvatarUpload = async (file: File) => {
    setIsUploadingAvatar(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post<{ url: string }>('/uploads', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFormAvatar(data.url);
      toast({ title: 'Photo uploaded', description: 'Profile photo is ready to save.' });
    } catch {
      toast({ title: 'Upload failed', description: 'Unable to upload profile photo.' });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formName.trim().length < 2) {
      toast({ title: 'Invalid name', description: 'Name must be at least 2 characters.' });
      return;
    }

    setIsSaving(true);
    const ok = await updateMyProfile({
      name: formName.trim(),
      department: formDepartment.trim(),
      avatar: formAvatar || undefined,
    });
    setIsSaving(false);

    if (ok) {
      toast({ title: 'Profile updated', description: 'Your changes have been saved.' });
      setIsEditOpen(false);
      return;
    }

    toast({ title: 'Update failed', description: 'Could not update your profile.' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        <section className="gradient-hero text-primary-foreground py-12">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-4xl font-bold overflow-hidden">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  initial
                )}
              </div>

              <div className="text-center md:text-left">
                <h1 className="text-2xl lg:text-3xl font-bold mb-2">{user.name}</h1>
                <p className="text-white/80">{roleLabel} · {user.department || 'No department'}</p>
              </div>

              <div className="ml-auto hidden md:flex items-center gap-3">
                <button onClick={openEditModal} className="btn-secondary bg-white/20 text-white border-white/30 hover:bg-white/30">
                  <Edit2 className="w-4 h-4 mr-2 inline" />
                  Edit Profile
                </button>
                {isLearner && (
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
                    <Award className="w-10 h-10 mx-auto mb-2" />
                    <p className="text-3xl font-bold">{user.totalCpdPoints}</p>
                    <p className="text-sm text-white/70">Total CPD Points</p>
                  </div>
                )}
              </div>
            </div>
            <div className="md:hidden mt-4">
              <button onClick={openEditModal} className="btn-secondary bg-white/20 text-white border-white/30 hover:bg-white/30 w-full">
                <Edit2 className="w-4 h-4 mr-2 inline" />
                Edit Profile
              </button>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 -mt-6 relative z-10">
          {isLearner ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="stat-card">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Award className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{user.totalCpdPoints}</p>
                    <p className="text-sm text-muted-foreground">CPD Points</p>
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{user.completedCourses.length}</p>
                    <p className="text-sm text-muted-foreground">Completed</p>
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{inProgressCourses.length}</p>
                    <p className="text-sm text-muted-foreground">In Progress</p>
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{user.certificates.length}</p>
                    <p className="text-sm text-muted-foreground">Certificates</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="stat-card">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{roleLabel}</p>
                    <p className="text-sm text-muted-foreground">Role</p>
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                    <Mail className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{user.email.split('@')[0]}</p>
                    <p className="text-sm text-muted-foreground">Account</p>
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                    <Building className="w-6 h-6 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{user.department || '-'}</p>
                    <p className="text-sm text-muted-foreground">Department</p>
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {new Date(user.joinedAt).getFullYear()}
                    </p>
                    <p className="text-sm text-muted-foreground">Member Since</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="card-elevated p-6">
                <h2 className="text-lg font-semibold text-foreground mb-6">Account Information</h2>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Full Name</p>
                      <p className="font-medium text-foreground">{user.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Mail className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium text-foreground">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Building className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Department</p>
                      <p className="font-medium text-foreground">{user.department || '-'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Member Since</p>
                      <p className="font-medium text-foreground">
                        {new Date(user.joinedAt).toLocaleDateString('en-US', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              {isLearner ? (
                <>
                  <div className="card-elevated">
                    <div className="p-6 border-b border-border">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-lg font-semibold text-foreground">Completed Courses</h2>
                          <p className="text-sm text-muted-foreground">Your achievements and earned CPD points</p>
                        </div>
                        <Link to="/certificates" className="text-primary text-sm font-medium hover:underline">
                          View Certificates
                        </Link>
                      </div>
                    </div>

                    {completedCourseDetails.length === 0 ? (
                      <div className="p-8 text-center">
                        <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="font-medium text-foreground mb-2">No completed courses yet</h3>
                        <p className="text-sm text-muted-foreground mb-4">Start learning to earn your first certificate!</p>
                        <Link to="/courses" className="btn-primary inline-block text-sm">
                          Browse Courses
                        </Link>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {completedCourseDetails.map((course) => {
                          const cert = user.certificates.find((c) => c.courseId === course!.id);
                          return (
                            <div key={course!.id} className="p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors">
                              <img src={course!.thumbnail} alt={course!.title} className="w-16 h-12 rounded-lg object-cover" />
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-foreground truncate">{course!.title}</h3>
                                <p className="text-sm text-muted-foreground">
                                  Completed {cert ? new Date(cert.completedAt).toLocaleDateString() : 'Recently'}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="badge badge-success">
                                  <Award className="w-3 h-3 mr-1" />
                                  {course!.cpdPoints} CPD
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {inProgressCourses.length > 0 && (
                    <div className="card-elevated mt-6">
                      <div className="p-6 border-b border-border">
                        <h2 className="text-lg font-semibold text-foreground">Currently Learning</h2>
                      </div>
                      <div className="divide-y divide-border">
                        {inProgressCourses.map((course) => (
                          <Link
                            key={course!.id}
                            to={`/courses/${course!.id}`}
                            className="p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors block"
                          >
                            <img src={course!.thumbnail} alt={course!.title} className="w-16 h-12 rounded-lg object-cover" />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-foreground truncate">{course!.title}</h3>
                              <div className="mt-2">
                                <div className="progress-bar h-1.5">
                                  <div className="progress-bar-fill" style={{ width: `${(course as any).progress}%` }} />
                                </div>
                              </div>
                            </div>
                            <span className="text-sm font-medium text-primary">{(course as any).progress}%</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="card-elevated p-8 text-center">
                  <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold text-foreground mb-2">Profile Overview</h3>
                  <p className="text-muted-foreground">Certificates and learner progress are only shown for learner accounts.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md rounded-xl shadow-xl overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-bold text-foreground">Edit Profile</h2>
              <button onClick={() => setIsEditOpen(false)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={saveProfile} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Profile Photo</label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                    {formAvatar ? (
                      <img src={formAvatar} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-semibold text-muted-foreground">{initial}</span>
                    )}
                  </div>
                  <label className="btn-secondary cursor-pointer inline-flex items-center">
                    <Camera className="w-4 h-4 mr-2" />
                    {isUploadingAvatar ? 'Uploading...' : 'Upload Photo'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleAvatarUpload(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Full Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="input-field"
                  required
                  minLength={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Department</label>
                <input
                  type="text"
                  value={formDepartment}
                  onChange={(e) => setFormDepartment(e.target.value)}
                  className="input-field"
                  placeholder="Enter department"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsEditOpen(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={isSaving} className="btn-primary flex-1 inline-flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
