import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useCourses } from '@/context/CourseContext';
import { SystemNotification } from '@/types/lms';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CourseCard from '@/components/CourseCard';
import { 
  BookOpen, 
  Award, 
  Clock, 
  TrendingUp,
  Play,
  ChevronRight,
  Bell,
  Target,
  X,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const LearnerDashboard: React.FC = () => {
  const { user, updateUserProgress } = useAuth();
  const { courses, getCourseById } = useCourses();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);
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
  const learnerDisplayName = user.name?.trim().split(" ")[0] || "Learner";

  // Get courses in progress
  const coursesInProgress = user.progress
    .filter(p => p.progress > 0 && p.progress < 100)
    .map(p => {
      const course = getCourseById(p.courseId);
      return course ? { course, progress: p.progress } : null;
    })
    .filter(Boolean) as { course: typeof courses[0]; progress: number }[];

  // Get enrolled but not started courses
  const enrolledCourses = user.progress
    .filter(p => p.progress === 0)
    .map(p => getCourseById(p.courseId))
    .filter(Boolean) as typeof courses;

  // Get recommended courses (not enrolled)
  const enrolledIds = user.progress.map(p => p.courseId);
  const recommendedCourses = courses
    .filter(c => !enrolledIds.includes(c.id) && !user.completedCourses.includes(c.id))
    .slice(0, 3);

  // Calculate stats
  const totalTimeSpent = user.progress.reduce((acc, p) => {
    const course = getCourseById(p.courseId);
    if (!course) return acc;
    return acc + (course.modules.reduce((m, mod) => m + (mod.duration || 600), 0) * (p.progress / 100));
  }, 0);
  const hoursSpent = Math.round(totalTimeSpent / 3600);

  // Get role-specific notifications
  const notifications = apiNotifications
    .filter(n => n.targetRoles.includes('learner') && !dismissedNotifications.includes(n.id));

  const personalCpdGrowth = useMemo(() => {
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthly = new Array<number>(12).fill(0);

    user.certificates.forEach((cert) => {
      const date = new Date(cert.completedAt);
      if (!Number.isNaN(date.getTime())) {
        monthly[date.getMonth()] += cert.cpdPoints;
      }
    });

    if (user.certificates.length === 0 && user.totalCpdPoints > 0) {
      monthly[new Date().getMonth()] = user.totalCpdPoints;
    }

    let running = 0;
    return monthLabels.map((month, index) => {
      running += monthly[index];
      return { month, points: running };
    });
  }, [user.certificates, user.totalCpdPoints]);

  const handleEnroll = (courseId: string) => {
    updateUserProgress(courseId, { 
      progress: 0, 
      lastModuleIndex: 0,
      startedAt: new Date().toISOString()
    });
  };

  const dismissNotification = (id: string) => {
    setDismissedNotifications(prev => [...prev, id]);
  };

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
                  Welcome back, {user.name.split(' ')[0]}! 👋
                </h1>
                <p className="text-white/80">
                  {coursesInProgress.length > 0 
                    ? `You have ${coursesInProgress.length} course${coursesInProgress.length > 1 ? 's' : ''} in progress`
                    : 'Ready to start a new learning journey?'
                  }
                </p>
                <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">
                  <Sparkles className="w-4 h-4 inline mr-1" />
                  Learner Dashboard
                </span>
              </div>
              
              {coursesInProgress.length > 0 && (
                <Link 
                  to={`/courses/${coursesInProgress[0].course.id}`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary font-semibold rounded-xl hover:bg-white/90 transition-colors shadow-lg"
                >
                  <Play className="w-5 h-5" />
                  Continue Learning
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Stats Cards */}
        <section className="container mx-auto px-4 -mt-6 relative z-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{coursesInProgress.length}</p>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <Target className="w-6 h-6 text-success" />
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
                  <p className="text-2xl font-bold text-foreground">{hoursSpent}h</p>
                  <p className="text-sm text-muted-foreground">Time Spent</p>
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Award className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{user.totalCpdPoints}</p>
                  <p className="text-sm text-muted-foreground">CPD Points</p>
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
                  notification.type === 'info' ? 'bg-primary/5 border border-primary/20' :
                  notification.type === 'warning' ? 'bg-warning/5 border border-warning/20' :
                  notification.type === 'success' ? 'bg-success/5 border border-success/20' :
                  'bg-destructive/5 border border-destructive/20'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  notification.type === 'info' ? 'bg-primary/10' :
                  notification.type === 'warning' ? 'bg-warning/10' :
                  notification.type === 'success' ? 'bg-success/10' :
                  'bg-destructive/10'
                }`}>
                  <Bell className={`w-5 h-5 ${
                    notification.type === 'info' ? 'text-primary' :
                    notification.type === 'warning' ? 'text-warning' :
                    notification.type === 'success' ? 'text-success' :
                    'text-destructive'
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

        {/* CPD Growth Chart */}
        <section className="container mx-auto px-4 py-8">
          <div className="card-elevated p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Your CPD Growth
                </h2>
                <p className="text-sm text-muted-foreground">Track your professional development progress</p>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={personalCpdGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="points" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Continue Learning */}
        {coursesInProgress.length > 0 && (
          <section className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">Continue Learning</h2>
                <p className="text-sm text-muted-foreground">Pick up where you left off</p>
              </div>
              <Link to="/courses" className="text-primary font-medium text-sm hover:underline flex items-center gap-1">
                See All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {coursesInProgress.slice(0, 3).map(({ course, progress }) => (
                <CourseCard 
                  key={course.id}
                  course={course}
                  progress={progress}
                  showProgress
                  isEnrolled
                />
              ))}
            </div>
          </section>
        )}

        {/* My Courses */}
        {enrolledCourses.length > 0 && (
          <section className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">My Courses</h2>
                <p className="text-sm text-muted-foreground">Courses you've enrolled in</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledCourses.slice(0, 3).map((course) => (
                <CourseCard 
                  key={course.id}
                  course={course}
                  progress={0}
                  showProgress
                  isEnrolled
                />
              ))}
            </div>
          </section>
        )}

        {/* Recommended Courses */}
        {recommendedCourses.length > 0 && (
          <section className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Recommended for You
                </h2>
                <p className="text-sm text-muted-foreground">Based on your interests</p>
              </div>
              <Link to="/courses" className="text-primary font-medium text-sm hover:underline flex items-center gap-1">
                Browse All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendedCourses.map((course) => (
                <CourseCard 
                  key={course.id}
                  course={course}
                  onEnroll={() => handleEnroll(course.id)}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />

      {/* Welcome Modal for First-Time Learners */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md rounded-xl shadow-xl overflow-hidden animate-slide-up">
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full gradient-primary flex items-center justify-center">
                <HelpCircle className="w-8 h-8 text-primary-foreground" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Welcome, {learnerDisplayName}!</h2>
              <p className="text-muted-foreground mb-6">
                Browse courses, enroll in the ones you need, track your progress, and earn your certificate after completing each course.
              </p>
              <button 
                onClick={() => setShowWelcomeModal(false)}
                className="btn-primary w-full"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearnerDashboard;
