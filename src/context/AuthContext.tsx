import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, UserProgress } from "@/types/lms";
import { api, tokenStore, tryRestoreSession } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  effectiveRole: User["role"] | null;
  isAdminActingAsLearner: boolean;
  users: User[];
  isAuthenticated: boolean;
  isLoading: boolean;
  isDarkMode: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; redirectPath: string }>;
  logout: () => void;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  updateUserProgress: (courseId: string, progress: Partial<UserProgress>) => void;
  completeCourse: (courseId: string, courseName: string, cpdPoints: number) => void;
  toggleDarkMode: () => void;
  addUser: (
    userData: Omit<User, "id" | "joinedAt" | "certificates" | "progress" | "completedCourses" | "totalCpdPoints"> & {
      password: string;
    },
  ) => void;
  updateUser: (userId: string, updates: Partial<User> & { password?: string }) => void;
  updateMyProfile: (updates: Partial<Pick<User, "name" | "department" | "avatar">>) => Promise<boolean>;
  deleteUser: (userId: string) => Promise<boolean>;
  getUserById: (userId: string) => User | undefined;
  getAssignedLearners: (managerId: string) => User[];
  assignLearnerToManager: (learnerId: string, managerId: string) => void;
  assignCourseToLearner: (learnerId: string, courseId: string) => void;
  switchToLearnerMode: () => void;
  switchToAdminMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getRedirectPath = (role: User["role"]): string => {
  if (role === "admin") return "/admin-dashboard";
  if (role === "manager") return "/manager-dashboard";
  return "/learner-dashboard";
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [adminRoleMode, setAdminRoleMode] = useState<"admin" | "learner">("admin");
  const effectiveRole: User["role"] | null =
    user?.role === "admin" ? adminRoleMode : (user?.role ?? null);
  const isAdminActingAsLearner = user?.role === "admin" && adminRoleMode === "learner";

  const loadUsersForRole = async (currentUser: User) => {
    try {
      if (currentUser.role === "admin") {
        setUsers([currentUser]);
        return;
      }
      if (currentUser.role === "manager") {
        const [{ data: learnersData }, { data: instructorsData }] = await Promise.all([
          api.get(`/users/${currentUser.id}/assigned-learners`),
          api.get("/users?role=admin&limit=100"),
        ]);
        const managerPlusUsers = [
          currentUser,
          ...((learnersData || []) as User[]),
          ...((instructorsData?.data || []) as User[]),
        ];
        const unique = Array.from(new Map(managerPlusUsers.map((u: User) => [u.id, u])).values());
        setUsers(unique);
        return;
      }
      setUsers([currentUser]);
    } catch {
      setUsers([currentUser]);
    }
  };

  const fetchMe = async () => {
    const { data } = await api.get<User>("/me");
    if (data.role === "admin" && !data.canSwitchToLearnerView && adminRoleMode === "learner") {
      setAdminRoleMode("admin");
      localStorage.setItem("admin_role_mode", "admin");
    }
    setUser(data);
    await loadUsersForRole(data);
  };

  useEffect(() => {
    const darkMode = localStorage.getItem("dark_mode") === "true";
    const savedAdminMode = localStorage.getItem("admin_role_mode");
    if (savedAdminMode === "learner" || savedAdminMode === "admin") {
      setAdminRoleMode(savedAdminMode);
    }
    setIsDarkMode(darkMode);
    if (darkMode) {
      document.documentElement.classList.add("dark");
    }

    const init = async () => {
      try {
        if (!tokenStore.getAccess()) {
          await tryRestoreSession();
        }
        if (tokenStore.getAccess()) {
          await fetchMe();
        }
      } catch {
        tokenStore.clear();
        setUser(null);
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    };
    void init();
  }, []);

  const login = async (
    username: string,
    password: string,
  ): Promise<{ success: boolean; redirectPath: string }> => {
    try {
      const { data } = await api.post("/auth/login", { username, password });
      tokenStore.set(data.accessToken, data.refreshToken);
      if (data.user.role === "admin" && !data.user.canSwitchToLearnerView) {
        setAdminRoleMode("admin");
        localStorage.setItem("admin_role_mode", "admin");
      }
      setUser(data.user);
      if (data.user.role !== "admin") {
        setAdminRoleMode("admin");
        localStorage.removeItem("admin_role_mode");
      }
      await loadUsersForRole(data.user);
      return { success: true, redirectPath: getRedirectPath(data.user.role) };
    } catch {
      return { success: false, redirectPath: "/login" };
    }
  };

  const logout = () => {
    const refreshToken = tokenStore.getRefresh();
    if (refreshToken) {
      void api.post("/auth/logout", { refreshToken }).catch(() => undefined);
    }
    tokenStore.clear();
    setUser(null);
    setUsers([]);
    setAdminRoleMode("admin");
    localStorage.removeItem("admin_role_mode");
  };

  const register = async (
    name: string,
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data } = await api.post("/auth/register", { name, email, password });
      tokenStore.set(data.accessToken, data.refreshToken);
      setUser(data.user);
      setUsers([data.user]);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error?.response?.data?.error?.message || "Registration failed",
      };
    }
  };

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem("dark_mode", String(next));
      if (next) document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
      return next;
    });
  };

  const updateUserProgress = (courseId: string, progressUpdate: Partial<UserProgress>) => {
    if (!user || effectiveRole !== "learner") return;

    const existing = user.progress.find((p) => p.courseId === courseId);
    const merged: UserProgress = {
      courseId,
      progress: existing?.progress ?? 0,
      lastModuleIndex: existing?.lastModuleIndex ?? 0,
      lastVideoTime: existing?.lastVideoTime,
      startedAt: existing?.startedAt ?? new Date().toISOString(),
      completedAt: existing?.completedAt,
      quizScores: progressUpdate.quizScores ?? existing?.quizScores ?? {},
      ...progressUpdate,
    };

    const nextProgress = existing
      ? user.progress.map((p) => (p.courseId === courseId ? merged : p))
      : [...user.progress, merged];

    void api
      .put(`/me/progress/${courseId}`, merged)
      .then(() => setUser({ ...user, progress: nextProgress }))
      .catch(() => undefined);
  };

  const completeCourse = (courseId: string, courseName: string, cpdPoints: number) => {
    if (!user || effectiveRole !== "learner") return;

    void api
      .post("/me/complete-course", { courseId, courseName, cpdPoints })
      .then((res) => setUser(res.data))
      .catch(() => undefined);
  };

  const addUser = (
    userData: Omit<User, "id" | "joinedAt" | "certificates" | "progress" | "completedCourses" | "totalCpdPoints"> & {
      password: string;
    },
  ) => {
    void api
      .post<User>("/users", {
        name: userData.name,
        email: userData.email,
        role: userData.role,
        department: userData.department,
        canSwitchToLearnerView: userData.canSwitchToLearnerView,
        password: userData.password,
      })
      .then((res) => setUsers((prev) => [res.data, ...prev]))
      .catch(() => undefined);
  };

  const updateUser = (userId: string, updates: Partial<User> & { password?: string }) => {
    void api
      .patch<User>(`/users/${userId}`, updates)
      .then((res) => {
        setUsers((prev) => prev.map((u) => (u.id === userId ? res.data : u)));
        if (user?.id === userId) setUser(res.data);
      })
      .catch(() => undefined);
  };

  const deleteUser = async (userId: string): Promise<boolean> => {
    try {
      await api.delete(`/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      return true;
    } catch {
      return false;
    }
  };

  const updateMyProfile = async (
    updates: Partial<Pick<User, "name" | "department" | "avatar">>,
  ): Promise<boolean> => {
    try {
      const { data } = await api.patch<User>("/me/profile", updates);
      setUser(data);
      setUsers((prev) => prev.map((u) => (u.id === data.id ? data : u)));
      return true;
    } catch {
      return false;
    }
  };

  const getUserById = (userId: string) => users.find((u) => u.id === userId);

  const getAssignedLearners = (managerId: string) => {
    const manager = users.find((u) => u.id === managerId);
    if (manager?.assignedLearners?.length) {
      return users.filter((u) => manager.assignedLearners?.includes(u.id));
    }
    return users.filter((u) => u.role === "learner" && u.assignedManagerId === managerId);
  };

  const assignLearnerToManager = (learnerId: string, managerId: string) => {
    void api
      .post(`/users/${managerId}/assign-learner`, { managerId, learnerId })
      .then(async () => {
        if (user?.role === "manager" || user?.role === "admin") {
          await loadUsersForRole(user);
        }
      })
      .catch(() => undefined);
  };

  const assignCourseToLearner = (learnerId: string, courseId: string) => {
    const pathId = user?.id || "self";
    void api.post(`/users/${pathId}/assign-course`, { learnerId, courseId }).catch(() => undefined);
  };

  const switchToLearnerMode = () => {
    if (user?.role !== "admin" || !user.canSwitchToLearnerView) return;
    setAdminRoleMode("learner");
    localStorage.setItem("admin_role_mode", "learner");
  };

  const switchToAdminMode = () => {
    if (user?.role !== "admin") return;
    setAdminRoleMode("admin");
    localStorage.setItem("admin_role_mode", "admin");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        effectiveRole,
        isAdminActingAsLearner,
        users,
        isAuthenticated: !!user,
        isLoading,
        isDarkMode,
        login,
        logout,
        register,
        updateUserProgress,
        completeCourse,
        toggleDarkMode,
        addUser,
        updateUser,
        updateMyProfile,
        deleteUser,
        getUserById,
        getAssignedLearners,
        assignLearnerToManager,
        assignCourseToLearner,
        switchToLearnerMode,
        switchToAdminMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
