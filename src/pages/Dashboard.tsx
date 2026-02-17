import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useCourses } from '@/context/CourseContext';
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
  Target
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user, updateUserProgress } = useAuth();
  const { courses, getCourseById } = useCourses();

  if (!user) return null;

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

  const handleEnroll = (courseId: string) => {
    updateUserProgress(courseId, { 
      progress: 0, 
      lastModuleIndex: 0,
      startedAt: new Date().toISOString()
    });
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

        {/* Notification Banner */}
        <section className="container mx-auto px-4 mt-8">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">New courses available!</p>
              <p className="text-sm text-muted-foreground">
                Check out our latest health workforce training courses and earn more CPD points.
              </p>
            </div>
            <Link 
              to="/courses" 
              className="text-primary font-medium text-sm hover:underline flex items-center gap-1"
            >
              View All <ChevronRight className="w-4 h-4" />
            </Link>
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
    </div>
  );
};

export default Dashboard;
