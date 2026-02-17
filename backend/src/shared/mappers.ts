import {
  Certificate,
  Course,
  Module,
  Notification,
  Progress,
  QuizQuestion,
  Role,
  User,
} from "@prisma/client";

type CourseWithModules = Course & {
  modules: (Module & { questions: QuizQuestion[] })[];
};

type UserWithRelations = User & {
  progressRecords: Progress[];
  certificates: Certificate[];
  managedCourses?: Pick<Course, "id">[];
  assignedLearners?: Pick<User, "id">[];
};

export function toFrontendCourse(course: CourseWithModules) {
  return {
    id: course.id,
    title: course.title,
    description: course.description,
    thumbnail: course.thumbnail,
    instructor: course.instructor,
    category: course.category,
    duration: course.duration,
    modules: course.modules
      .sort((a, b) => a.position - b.position)
      .map((m) => ({
        id: m.id,
        title: m.title,
        type: m.type,
        content: m.content,
        slidesUrl: m.slidesUrl ?? undefined,
        duration: m.duration ?? undefined,
        completed: m.completed ?? undefined,
        questions:
          m.type === "quiz"
            ? m.questions
                .sort((a, b) => a.position - b.position)
                .map((q) => ({
                  id: q.id,
                  question: q.question,
                  options: q.options,
                  correctAnswer: q.correctAnswer,
                }))
            : undefined,
      })),
    cpdPoints: course.cpdPoints,
    enrolledCount: course.enrolledCount,
    rating: course.rating,
    level: course.level as "Beginner" | "Intermediate" | "Advanced",
    assignedManagerId: course.assignedManagerId ?? undefined,
  };
}

export function toFrontendProgress(progress: Progress) {
  return {
    courseId: progress.courseId,
    progress: progress.progress,
    lastModuleIndex: progress.lastModuleIndex,
    lastVideoTime: progress.lastVideoTime ?? undefined,
    startedAt: progress.startedAt.toISOString(),
    completedAt: progress.completedAt?.toISOString(),
    quizScores: (progress.quizScores as Record<string, number>) ?? {},
  };
}

export function toFrontendCertificate(certificate: Certificate) {
  return {
    id: certificate.id,
    courseId: certificate.courseId,
    courseName: certificate.courseName,
    completedAt: certificate.completedAt.toISOString(),
    cpdPoints: certificate.cpdPoints,
  };
}

export function toFrontendUser(user: UserWithRelations) {
  const completedCourses = Array.from(new Set(user.certificates.map((c) => c.courseId)));
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    canSwitchToLearnerView: user.canSwitchToLearnerView,
    avatar: user.avatar ?? undefined,
    department: user.department ?? undefined,
    joinedAt: user.joinedAt.toISOString().split("T")[0],
    totalCpdPoints: user.role === Role.learner ? user.totalCpdPoints : 0,
    completedCourses,
    certificates: user.certificates.map(toFrontendCertificate),
    progress: user.progressRecords.map(toFrontendProgress),
    assignedManagerId: user.assignedManagerId ?? undefined,
    assignedCourses: user.managedCourses?.map((c) => c.id) ?? undefined,
    assignedLearners: user.assignedLearners?.map((u) => u.id) ?? undefined,
  };
}

export function toFrontendNotification(notification: Notification) {
  return {
    id: notification.id,
    type: notification.type,
    message: notification.message,
    targetRoles: notification.targetRoles,
    createdAt: notification.createdAt.toISOString(),
    expiresAt: notification.expiresAt?.toISOString(),
  };
}
