import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useCourses } from '@/context/CourseContext';
import { SystemNotification } from '@/types/lms';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { 
  Users, 
  BookOpen, 
  Award, 
  TrendingUp,
  ChevronRight,
  Bell,
  Search,
  X,
  Mail,
  ExternalLink,
  HelpCircle,
  Briefcase,
  Edit2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from '@/hooks/use-toast';

const ManagerDashboard: React.FC = () => {
  const { user, users, getAssignedLearners, assignLearnerToManager, assignCourseToLearner } = useAuth();
  const { courses } = useCourses();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedLearnerId, setSelectedLearnerId] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [apiNotifications, setApiNotifications] = useState<SystemNotification[]>([]);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem(`welcome_shown_${user?.id}`);
    if (!hasSeenWelcome && user) {
      setShowWelcomeModal(true);
      localStorage.setItem(`welcome_shown_${user.id}`, 'true');
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void api
      .get<SystemNotification[]>('/notifications')
      .then(({ data }) => setApiNotifications(Array.isArray(data) ? data : []))
      .catch(() => setApiNotifications([]));
  }, [user]);

  if (!user) return null;

  const assignedLearners = getAssignedLearners(user.id);
  const assignedCourses = courses.filter(c => user.assignedCourses?.includes(c.id));
  
  // Get notifications for managers
  const notifications = apiNotifications
    .filter(n => n.targetRoles.includes('manager') && !dismissedNotifications.includes(n.id));

  // Filter learners by search
  const filteredLearners = searchQuery
    ? assignedLearners.filter(l => 
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : assignedLearners;

  // Calculate group stats
  const totalCpdEarned = assignedLearners.reduce((acc, l) => acc + l.totalCpdPoints, 0);
  const totalCompletions = assignedLearners.reduce((acc, l) => acc + l.completedCourses.length, 0);
  const averageProgress = assignedLearners.length > 0
    ? Math.round(assignedLearners.reduce((acc, l) => {
        const avgProgress = l.progress.length > 0
          ? l.progress.reduce((sum, p) => sum + p.progress, 0) / l.progress.length
          : 0;
        return acc + avgProgress;
      }, 0) / assignedLearners.length)
    : 0;

  // Chart data for assigned courses
  const courseCompletionData = assignedCourses.map(course => {
    const completions = assignedLearners.filter(l => l.completedCourses.includes(course.id)).length;
    const enrolled = assignedLearners.filter(l => 
      l.progress.some(p => p.courseId === course.id) || l.completedCourses.includes(course.id)
    ).length;
    return {
      name: course.title.substring(0, 15) + '...',
      completions,
      enrolled,
      rate: enrolled > 0 ? Math.round((completions / enrolled) * 100) : 0
    };
  });

  const dismissNotification = (id: string) => {
    setDismissedNotifications(prev => [...prev, id]);
  };

  const handleSendReminder = (learnerName: string) => {
    toast({
      title: "Reminder Sent",
      description: `A reminder email has been sent to ${learnerName}.`,
    });
  };

  const handleAssignCourse = () => {
    if (selectedLearnerId && selectedCourseId) {
      assignCourseToLearner(selectedLearnerId, selectedCourseId);
      toast({
        title: "Course Assigned",
        description: "The learner has been enrolled in the course.",
      });
      setShowAssignModal(false);
      setSelectedLearnerId(null);
      setSelectedCourseId('');
    }
  };

  const handleLinkExternalContent = () => {
    toast({
      title: "External Content",
      description: "Redirecting to MOH Virtual Academy...",
    });
    window.open('https://academy.health.go.ke', '_blank');
  };

  // Unassigned learners for adding
  const unassignedLearners = users.filter(u => 
    u.role === 'learner' && !user.assignedLearners?.includes(u.id)
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="gradient-hero text-primary-foreground py-8 lg:py-12">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold mb-2">
                  Welcome, {user.name.split(' ')[0]}! 👋
                </h1>
                <p className="text-white/80">
                  Managing {assignedLearners.length} learner{assignedLearners.length !== 1 ? 's' : ''} across {assignedCourses.length} course{assignedCourses.length !== 1 ? 's' : ''}
                </p>
                <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">
                  <Briefcase className="w-4 h-4 inline mr-1" />
                  Manager Dashboard
                </span>
              </div>
              
              <button 
                onClick={handleLinkExternalContent}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary font-semibold rounded-xl hover:bg-white/90 transition-colors shadow-lg"
              >
                <ExternalLink className="w-5 h-5" />
                MOH Virtual Academy
              </button>
            </div>
          </div>
        </section>

        {/* Stats Cards */}
        <section className="container mx-auto px-4 -mt-6 relative z-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{assignedLearners.length}</p>
                  <p className="text-sm text-muted-foreground">Assigned Learners</p>
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{assignedCourses.length}</p>
                  <p className="text-sm text-muted-foreground">Managed Courses</p>
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{averageProgress}%</p>
                  <p className="text-sm text-muted-foreground">Avg Progress</p>
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Award className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalCpdEarned}</p>
                  <p className="text-sm text-muted-foreground">Group CPD</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Notifications */}
        {notifications.length > 0 && (
          <section className="container mx-auto px-4 mt-8">
            {notifications.map(notification => (
              <div 
                key={notification.id}
                className={`mb-4 rounded-xl p-4 flex items-center gap-4 ${
                  notification.type === 'success' ? 'bg-success/5 border border-success/20' :
                  'bg-primary/5 border border-primary/20'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  notification.type === 'success' ? 'bg-success/10' : 'bg-primary/10'
                }`}>
                  <Bell className={`w-5 h-5 ${
                    notification.type === 'success' ? 'text-success' : 'text-primary'
                  }`} />
                </div>
                <p className="flex-1 text-foreground">{notification.message}</p>
                <button 
                  onClick={() => dismissNotification(notification.id)}
                  className="text-muted-foreground hover:text-foreground p-1"
                  aria-label="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </section>
        )}

        {/* Course Completion Chart */}
        <section className="container mx-auto px-4 py-8">
          <div className="card-elevated p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">Course Performance</h2>
                <p className="text-sm text-muted-foreground">Completion rates for your assigned courses</p>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={courseCompletionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="enrolled" fill="hsl(var(--primary))" name="Enrolled" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completions" fill="hsl(var(--success))" name="Completed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Assigned Learners Table */}
        <section className="container mx-auto px-4 py-8">
          <div className="card-elevated overflow-hidden">
            <div className="p-6 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Assigned Learners</h2>
                  <p className="text-sm text-muted-foreground">Monitor progress and send reminders</p>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search learners..."
                      className="input-field pl-10 py-2 text-sm w-48"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Learner</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-foreground hidden md:table-cell">Department</th>
                    <th className="text-center px-6 py-4 text-sm font-semibold text-foreground">Progress</th>
                    <th className="text-center px-6 py-4 text-sm font-semibold text-foreground">CPD Points</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLearners.map((learner) => {
                    const avgProgress = learner.progress.length > 0
                      ? Math.round(learner.progress.reduce((sum, p) => sum + p.progress, 0) / learner.progress.length)
                      : 0;
                    return (
                      <tr key={learner.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                              {learner.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{learner.name}</p>
                              <p className="text-sm text-muted-foreground">{learner.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 hidden md:table-cell text-muted-foreground">
                          {learner.department}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${avgProgress}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-foreground">{avgProgress}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="badge badge-success">{learner.totalCpdPoints}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedLearnerId(learner.id);
                                setShowAssignModal(true);
                              }}
                              className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                              aria-label="Assign course"
                              title="Assign course"
                            >
                              <BookOpen className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleSendReminder(learner.name)}
                              className="p-2 rounded-lg text-muted-foreground hover:text-warning hover:bg-warning/10 transition-colors"
                              aria-label="Send reminder"
                              title="Send reminder"
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredLearners.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                        {searchQuery ? 'No learners found matching your search.' : 'No assigned learners yet.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Assigned Courses */}
        <section className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">Managed Courses</h2>
              <p className="text-sm text-muted-foreground">Courses you're responsible for</p>
            </div>
            <Link to="/courses" className="text-primary font-medium text-sm hover:underline flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assignedCourses.slice(0, 3).map((course) => (
              <div key={course.id} className="card-elevated p-6">
                <img 
                  src={course.thumbnail} 
                  alt={course.title}
                  className="w-full h-32 object-cover rounded-lg mb-4"
                />
                <h3 className="font-semibold text-foreground mb-2">{course.title}</h3>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {assignedLearners.filter(l => 
                      l.progress.some(p => p.courseId === course.id) || l.completedCourses.includes(course.id)
                    ).length} enrolled
                  </span>
                  <Link 
                    to={`/courses/${course.id}`}
                    className="text-primary font-medium hover:underline flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" /> Edit Content
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />

      {/* Welcome Modal */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md rounded-xl shadow-xl overflow-hidden animate-slide-up">
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full gradient-primary flex items-center justify-center">
                <HelpCircle className="w-8 h-8 text-primary-foreground" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Welcome, Manager!</h2>
              <p className="text-muted-foreground mb-6">
                As a Manager, you can monitor your assigned learners' progress, manage course content, send reminders, and view group reports. Your dashboard shows real-time analytics for your team.
              </p>
              <button 
                onClick={() => setShowWelcomeModal(false)}
                className="btn-primary w-full"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Course Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md rounded-xl shadow-xl overflow-hidden animate-slide-up">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-foreground">Assign Course</h2>
                <button 
                  onClick={() => setShowAssignModal(false)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Select Course</label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="input-field"
                  >
                    <option value="">Choose a course...</option>
                    {assignedCourses.map(course => (
                      <option key={course.id} value={course.id}>{course.title}</option>
                    ))}
                  </select>
                </div>
                
                <button
                  onClick={handleAssignCourse}
                  disabled={!selectedCourseId}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Assign Course
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;
