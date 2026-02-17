import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  Menu,
  X,
  Home,
  BookOpen,
  User,
  Users,
  Award,
  BarChart3,
  LogOut,
  ChevronDown,
  Sparkles
} from 'lucide-react';


const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, effectiveRole, isAdminActingAsLearner, isAuthenticated, logout, switchToAdminMode, switchToLearnerMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsOpen(false);
    setIsUserMenuOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;
  const roleLabel = (role?: 'learner' | 'admin' | 'manager' | null) => {
    if (role === 'admin') return 'Instructor';
    if (role === 'manager') return 'Manager';
    if (role === 'learner') return 'Learner';
    return '';
  };

  useEffect(() => {
    const onClickAway = (event: MouseEvent) => {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', onClickAway);
    }
    return () => document.removeEventListener('mousedown', onClickAway);
  }, [isUserMenuOpen]);

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/courses', label: 'Courses', icon: BookOpen },
  ];

  const managerOnlyLinks = [
    { path: '/users', label: 'Users', icon: Users },
  ];

  const managerAdminLinks = [
    { path: '/reports', label: 'Reports', icon: BarChart3 },
  ];

  const allLinks = [
    ...navLinks,
    ...(effectiveRole === 'manager' ? managerOnlyLinks : []),
    ...(effectiveRole === 'manager' || effectiveRole === 'admin' ? managerAdminLinks : []),
  ];

  const userMenuLinks = [
    { path: '/profile', label: 'Profile', icon: User },
    ...(effectiveRole === 'learner' ? [{ path: '/certificates', label: 'Certificates', icon: Award }] : []),
  ];

  // Modified to show navbar for public users too
  // if (!isAuthenticated) return null; 


  return (
    <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-xl shadow-[0_10px_30px_-18px_rgba(16,24,40,0.35)]">
      <div className="container mx-auto px-4">
        <div className="h-1 w-full bg-gradient-to-r from-primary via-secondary to-accent rounded-b-full" />
        <div className="flex items-center justify-between py-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-muted/50 transition-colors">
            <img
              src="/images/nphi-logo.png"
              alt="NPHI Logo"
              className="h-11 w-auto object-contain"
            />
            <div className="hidden lg:block leading-tight">
              <p className="text-sm font-bold tracking-wide text-foreground">NPHI eLearning</p>
              <p className="text-xs text-muted-foreground">Professional Health Workforce Platform</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1 rounded-2xl border border-border/60 bg-card/70 p-1.5 shadow-sm">
            {isAuthenticated ? (
              allLinks.map(({ path, label, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${isActive(path)
                      ? 'bg-primary text-primary-foreground shadow-button'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium text-sm">{label}</span>
                </Link>
              ))
            ) : (
              // Public Links
              <>
                <Link
                  to="/"
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${isActive('/')
                      ? 'bg-primary text-primary-foreground shadow-button'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                >
                  <Home className="w-4 h-4" />
                  <span className="font-medium text-sm">Home</span>
                </Link>
                <Link
                  to="/courses"
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${isActive('/courses')
                      ? 'bg-primary text-primary-foreground shadow-button'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span className="font-medium text-sm">Courses</span>
                </Link>
              </>
            )}
          </div>

          {/* User Menu & Mobile Toggle */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                {/* CPD Points Badge */}
                {user?.role === 'learner' && (
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-success/10 rounded-full border border-success/20">
                    <Sparkles className="w-3.5 h-3.5 text-success" />
                    <span className="text-sm font-semibold text-success">
                      {user?.totalCpdPoints} CPD
                    </span>
                  </div>
                )}

                {/* User Avatar */}
                <div ref={userMenuRef} className="hidden md:block relative">
                  <button
                    onClick={() => setIsUserMenuOpen((prev) => !prev)}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl border border-border/80 bg-card hover:bg-muted/60 transition-colors shadow-sm"
                  >
                    <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center">
                      <span className="text-primary-foreground text-sm font-semibold">{user?.name.charAt(0)}</span>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-foreground leading-tight">{user?.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {roleLabel(effectiveRole)}
                        {isAdminActingAsLearner ? ' view' : ''}
                      </p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-border bg-card shadow-xl p-2.5 z-50">
                      {userMenuLinks.map(({ path, label, icon: Icon }) => (
                        <Link
                          key={path}
                          to={path}
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-muted transition-colors"
                        >
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          <span>{label}</span>
                        </Link>
                      ))}
                      {user?.role === 'admin' && user?.canSwitchToLearnerView && (
                        <button
                          onClick={() => {
                            if (isAdminActingAsLearner) switchToAdminMode();
                            else switchToLearnerMode();
                            setIsUserMenuOpen(false);
                            navigate('/dashboard');
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-muted transition-colors"
                        >
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span>{isAdminActingAsLearner ? 'Switch to Instructor View' : 'Switch to Learner View'}</span>
                        </button>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              // Guest Actions
              <div className="hidden md:flex items-center gap-3">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors shadow-button"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 rounded-lg text-foreground hover:bg-muted transition-colors"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-border animate-slide-up">
            <div className="flex flex-col gap-1">
              {isAuthenticated ? (
                <>
                  {allLinks.map(({ path, label, icon: Icon }) => (
                    <Link
                      key={path}
                      to={path}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive(path)
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted'
                        }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{label}</span>
                    </Link>
                  ))}
                  <hr className="my-2 border-border" />
                  {userMenuLinks.map(({ path, label, icon: Icon }) => (
                    <Link
                      key={path}
                      to={path}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                        isActive(path) ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{label}</span>
                    </Link>
                  ))}
                  <hr className="my-2 border-border" />
                  <div className="px-4 py-2 flex items-center gap-3">
                    <div className="w-10 h-10 gradient-primary rounded-full flex items-center justify-center">
                      <span className="text-primary-foreground font-semibold">
                        {user?.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{user?.name}</p>
                      <p className="text-sm text-muted-foreground">{roleLabel(user?.role)}</p>
                    </div>
                  </div>
                  {user?.role === 'admin' && user?.canSwitchToLearnerView && (
                    <button
                      onClick={() => {
                        if (isAdminActingAsLearner) switchToAdminMode();
                        else switchToLearnerMode();
                        setIsOpen(false);
                        navigate('/dashboard');
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-muted transition-colors"
                    >
                      <User className="w-5 h-5" />
                      <span className="font-medium">{isAdminActingAsLearner ? 'Switch to Instructor View' : 'Switch to Learner View'}</span>
                    </button>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Logout</span>
                  </button>
                </>
              ) : (
                // Guest Mobile Menu
                <>
                  <Link
                    to="/"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-muted"
                  >
                    <Home className="w-5 h-5" />
                    <span className="font-medium">Home</span>
                  </Link>
                  <Link
                    to="/courses"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-muted"
                  >
                    <BookOpen className="w-5 h-5" />
                    <span className="font-medium">Courses</span>
                  </Link>
                  <hr className="my-2 border-border" />
                  <div className="p-4 grid grid-cols-2 gap-3">
                    <Link
                      to="/login"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center justify-center px-4 py-2 text-sm font-medium border border-input rounded-lg hover:bg-accent hover:text-accent-foreground"
                    >
                      Log In
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center justify-center px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                    >
                      Register
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
