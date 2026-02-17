export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface Module {
  id: string;
  title: string;
  type: "video" | "pdf" | "ppt" | "word" | "quiz" | "assignment";
  content: string;
  duration?: number;
  slidesUrl?: string;
  questions?: QuizQuestion[];
  completed?: boolean;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  instructor: string;
  category: string;
  duration: string;
  modules: Module[];
  cpdPoints: number;
  enrolledCount: number;
  rating: number;
  level: "Beginner" | "Intermediate" | "Advanced";
  assignedManagerId?: string;
  status?: "draft" | "pending_approval" | "published" | "rejected" | "archived";
}

export interface UserProgress {
  courseId: string;
  progress: number;
  lastModuleIndex: number;
  lastVideoTime?: number;
  startedAt: string;
  completedAt?: string;
  quizScores: Record<string, number>;
}

export interface Certificate {
  id: string;
  courseId: string;
  courseName: string;
  completedAt: string;
  cpdPoints: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "learner" | "admin" | "manager";
  canSwitchToLearnerView?: boolean;
  avatar?: string;
  department?: string;
  joinedAt: string;
  totalCpdPoints: number;
  completedCourses: string[];
  certificates: Certificate[];
  progress: UserProgress[];
  assignedManagerId?: string;
  assignedCourses?: string[];
  assignedLearners?: string[];
}

export interface SystemNotification {
  id: string;
  type: "info" | "warning" | "success" | "alert";
  message: string;
  targetRoles: ("learner" | "admin" | "manager")[];
  createdAt: string;
  expiresAt?: string;
}
