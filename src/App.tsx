import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/AuthContext";
import { CourseProvider } from "./context/CourseContext";
import PrivateRoute from "./components/PrivateRoute";

// Pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import LearnerDashboard from "./pages/LearnerDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import Profile from "./pages/Profile";
import Certificates from "./pages/Certificates";
import AdminDashboard from "./pages/AdminDashboard";
import UserManagement from "./pages/UserManagement";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";
import AuthSuccess from "./pages/AuthSuccess";

const queryClient = new QueryClient();

const DashboardRedirect = () => {
  const { effectiveRole } = useAuth();
  if (effectiveRole === "admin") return <Navigate to="/admin-dashboard" replace />;
  if (effectiveRole === "manager") return <Navigate to="/manager-dashboard" replace />;
  return <Navigate to="/learner-dashboard" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <CourseProvider>
            <Toaster />
            <Sonner />
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/auth/success" element={<AuthSuccess />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/courses/:id" element={<CourseDetail />} />

              {/* Default redirect based on role */}
              <Route path="/dashboard" element={<PrivateRoute><DashboardRedirect /></PrivateRoute>} />

              {/* Role-Specific Dashboards */}
              <Route path="/learner-dashboard" element={
                <PrivateRoute>
                  <LearnerDashboard />
                </PrivateRoute>
              } />

              <Route path="/manager-dashboard" element={
                <PrivateRoute allowedRoles={['manager', 'admin']}>
                  <ManagerDashboard />
                </PrivateRoute>
              } />

              <Route path="/admin-dashboard" element={
                <PrivateRoute allowedRoles={['admin', 'manager']}>
                  <AdminDashboard />
                </PrivateRoute>
              } />

              {/* Shared Routes */}

              <Route path="/profile" element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              } />

              <Route path="/certificates" element={
                <PrivateRoute allowedRoles={['learner']}>
                  <Certificates />
                </PrivateRoute>
              } />

              <Route path="/users" element={
                <PrivateRoute allowedRoles={['manager', 'admin']}>
                  <UserManagement />
                </PrivateRoute>
              } />

              {/* Manager/Admin Routes */}
              <Route path="/reports" element={
                <PrivateRoute allowedRoles={['admin', 'manager']}>
                  <Reports />
                </PrivateRoute>
              } />

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </CourseProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
