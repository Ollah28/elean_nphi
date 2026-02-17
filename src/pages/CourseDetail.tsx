import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useCourses } from '@/context/CourseContext';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import RichTextEditor from '@/components/RichTextEditor';
import DOMPurify from 'dompurify';
import {
  ChevronLeft,
  Play,
  FileText,
  HelpCircle,
  CheckCircle,
  Circle,
  Clock,
  Award,
  Users,
  Star,
  ChevronDown,
  ChevronUp,
  Download,
  ArrowRight
} from 'lucide-react';
import { Module, QuizQuestion } from '@/types/lms';

const DEFAULT_QUIZ_PASS_SCORE = 70;
type QuizFormType = "mcq" | "checkbox" | "paragraph" | "short_answer" | "rating" | "agree" | "choose_photo";
type QuizFormQuestion = {
  id: string;
  type: QuizFormType;
  prompt: string;
  options?: string[];
  correctIndex?: number;
  correctIndexes?: number[];
  answerText?: string;
  scaleMax?: number;
};

const getQuizPassScore = (content?: string) => {
  if (!content) return DEFAULT_QUIZ_PASS_SCORE;
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed?.passScore === 'number') {
      return Math.min(100, Math.max(1, parsed.passScore));
    }
  } catch {
    const match = content.match(/pass(?:ing)?\s*score\s*[:=]\s*(\d{1,3})/i);
    if (match) return Math.min(100, Math.max(1, Number(match[1])));
  }
  return DEFAULT_QUIZ_PASS_SCORE;
};

const extractYouTubeVideoId = (url?: string) => {
  if (!url) return null;
  const trimmed = url.trim();
  const matchers = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{6,})/i,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{6,})/i,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{6,})/i,
  ];
  for (const re of matchers) {
    const match = trimmed.match(re);
    if (match?.[1]) return match[1];
  }
  return null;
};

const parseQuizFormsFromModule = (module: Module): QuizFormQuestion[] => {
  try {
    const parsed = module.content ? JSON.parse(module.content) : null;
    if (Array.isArray(parsed?.forms)) return parsed.forms as QuizFormQuestion[];
  } catch {
    // ignore
  }
  return (module.questions || []).map((q) => ({
    id: q.id,
    type: "mcq" as const,
    prompt: q.question,
    options: q.options,
    correctIndex: q.correctAnswer,
  }));
};

const normalizeText = (value: string) => value.trim().toLowerCase();

const parsePptModuleContent = (content?: string): { fileUrl: string; slideRange: string } => {
  if (!content) return { fileUrl: "", slideRange: "" };
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed.fileUrl === "string") {
      return {
        fileUrl: parsed.fileUrl,
        slideRange: typeof parsed.slideRange === "string" ? parsed.slideRange : "",
      };
    }
  } catch {
    // legacy plain URL
  }
  return { fileUrl: content, slideRange: "" };
};

const CourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, effectiveRole, updateUserProgress, completeCourse } = useAuth();
  const { getCourseById } = useCourses();

  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, any>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [completedModules, setCompletedModules] = useState<string[]>([]);
  const [assignmentContent, setAssignmentContent] = useState('');
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentFileUploading, setAssignmentFileUploading] = useState(false);
  const [assignmentSavedAt, setAssignmentSavedAt] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  const course = getCourseById(id || '');
  const userProgress = user?.progress.find(p => p.courseId === id);

  useEffect(() => {
    if (userProgress) {
      setActiveModuleIndex(userProgress.lastModuleIndex);
      // Load completed modules from progress
      const completed = course?.modules
        .slice(0, userProgress.lastModuleIndex)
        .map(m => m.id) || [];
      setCompletedModules(completed);
    }
  }, [userProgress, course]);

  useEffect(() => {
    // Auto-expand current module section
    if (course?.modules[activeModuleIndex]) {
      setExpandedModules([course.modules[activeModuleIndex].id]);
    }
  }, [activeModuleIndex, course]);

  useEffect(() => {
    if (!user || !course) return;
    const module = course.modules[activeModuleIndex];
    if (!module || module.type !== 'assignment' || effectiveRole !== 'learner') {
      setAssignmentContent('');
      setAssignmentSavedAt(null);
      return;
    }
    setAssignmentLoading(true);
    void api
      .get<{ content: string; submittedAt: string } | null>(`/me/assignments/${module.id}`)
      .then(({ data }) => {
        setAssignmentContent(data?.content || '');
        setAssignmentSavedAt(data?.submittedAt || null);
      })
      .catch(() => {
        setAssignmentContent('');
        setAssignmentSavedAt(null);
      })
      .finally(() => setAssignmentLoading(false));
  }, [activeModuleIndex, course, user, effectiveRole]);

  if (!course) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-bold text-foreground mb-2">Course not found</h2>
            <Link to="/courses" className="text-primary hover:underline">
              Back to courses
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const currentModule = course.modules[activeModuleIndex];
  const totalModules = course.modules.length;
  const progress = Math.round((completedModules.length / totalModules) * 100);
  const isEnrolled = userProgress !== undefined || user?.completedCourses.includes(course.id) || user?.role === 'admin';
  const isCourseComplete = user?.completedCourses.includes(course.id);
  const isInstructor = user?.role === 'admin';

  const handleEnroll = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (effectiveRole !== 'learner' || isInstructor) {
      return;
    }
    updateUserProgress(course.id, {
      progress: 0,
      lastModuleIndex: 0,
      startedAt: new Date().toISOString()
    });
  };

  const markModuleComplete = (moduleId: string) => {
    if (!completedModules.includes(moduleId)) {
      const newCompleted = [...completedModules, moduleId];
      setCompletedModules(newCompleted);

      // Update progress
      const newProgress = Math.round((newCompleted.length / totalModules) * 100);
      updateUserProgress(course.id, {
        progress: newProgress,
        lastModuleIndex: activeModuleIndex
      });
    }
  };

  const handleModuleComplete = () => {
    markModuleComplete(currentModule.id);

    if (activeModuleIndex < totalModules - 1) {
      setActiveModuleIndex(activeModuleIndex + 1);
      setQuizAnswers({});
      setQuizSubmitted(false);
    }
  };

  const handleQuizSubmit = () => {
    const forms = parseQuizFormsFromModule(currentModule);
    if (!forms.length) return;
    const passScore = getQuizPassScore(currentModule.content);

    let scoredCount = 0;
    let correctCount = 0;
    forms.forEach((q) => {
      const answer = quizAnswers[q.id];
      if (q.type === "mcq" || q.type === "choose_photo" || q.type === "agree" || q.type === "rating") {
        if (typeof q.correctIndex === "number") {
          scoredCount += 1;
          if (answer === q.correctIndex) correctCount += 1;
        }
        return;
      }
      if (q.type === "checkbox") {
        if ((q.correctIndexes || []).length > 0) {
          scoredCount += 1;
          const expected = new Set(q.correctIndexes || []);
          const actual = new Set(Array.isArray(answer) ? answer : []);
          const sameSize = expected.size === actual.size;
          const sameValues = [...expected].every((v) => actual.has(v));
          if (sameSize && sameValues) correctCount += 1;
        }
        return;
      }
      if (q.type === "short_answer" || q.type === "paragraph") {
        if (q.answerText && q.answerText.trim()) {
          scoredCount += 1;
          if (normalizeText(String(answer || "")) === normalizeText(q.answerText)) correctCount += 1;
        }
      }
    });

    const score =
      scoredCount > 0
        ? Math.round((correctCount / scoredCount) * 100)
        : 100;
    setQuizScore(score);
    setQuizSubmitted(true);

    if (score >= passScore) {
      markModuleComplete(currentModule.id);
    }
  };

  const handleAssignmentSubmit = async () => {
    if (!course || !currentModule || currentModule.type !== 'assignment') return;
    const plain = assignmentContent.replace(/<[^>]+>/g, "").trim();
    if (!plain) return;
    setAssignmentLoading(true);
    try {
      const { data } = await api.post<{ submittedAt: string }>('/me/assignments/submit', {
        courseId: course.id,
        moduleId: currentModule.id,
        content: assignmentContent,
      });
      setAssignmentSavedAt(data?.submittedAt || new Date().toISOString());
      markModuleComplete(currentModule.id);
    } finally {
      setAssignmentLoading(false);
    }
  };

  const handleAssignmentFileUpload = async (file: File) => {
    setAssignmentFileUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post<{ url: string }>("/uploads", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const fileLink = `<p><a href="${data.url}" target="_blank" rel="noopener noreferrer">${file.name}</a></p>`;
      setAssignmentContent((prev) => `${prev}${fileLink}`);
    } finally {
      setAssignmentFileUploading(false);
    }
  };

  const handleCompleteCourse = () => {
    if (effectiveRole !== 'learner') return;
    completeCourse(course.id, course.title, course.cpdPoints);
    navigate('/certificates');
  };

  const toggleModuleExpand = (moduleId: string) => {
    setExpandedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const getModuleIcon = (type: Module['type']) => {
    switch (type) {
      case 'video': return Play;
      case 'pdf': return FileText;
      case 'ppt': return FileText;
      case 'word': return FileText;
      case 'assignment': return FileText;
      case 'quiz': return HelpCircle;
    }
  };

  const renderModuleContent = () => {
    switch (currentModule.type) {
      case 'video':
        const youtubeId = extractYouTubeVideoId(currentModule.content);
        return (
          <div className="space-y-4">
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
              {youtubeId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeId}`}
                  title={currentModule.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  ref={videoRef}
                  src={currentModule.content}
                  controls
                  className="w-full h-full"
                  onEnded={() => markModuleComplete(currentModule.id)}
                />
              )}
            </div>
            <button
              onClick={handleModuleComplete}
              className="btn-primary flex items-center gap-2"
            >
              Mark as Complete & Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        );

      case 'pdf':
      case 'ppt':
      case 'word':
        const pptMeta = currentModule.type === "ppt" ? parsePptModuleContent(currentModule.content) : null;
        const docUrl = currentModule.type === "ppt" ? pptMeta?.fileUrl || "" : currentModule.content;
        return (
          <div className="space-y-4">
            <div className="bg-muted rounded-xl p-8 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {currentModule.title}
              </h3>
              <p className="text-muted-foreground mb-6">
                Review this document to continue with the course.
              </p>
              {currentModule.type === "ppt" && pptMeta?.slideRange && (
                <p className="text-sm text-muted-foreground mb-4">
                  This module covers slides: <span className="font-medium text-foreground">{pptMeta.slideRange}</span>
                </p>
              )}
              <div className="flex justify-center gap-4">
                <a
                  href={docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  View Document
                </a>
                <a
                  href={docUrl}
                  download
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
                {currentModule.type === 'word' && currentModule.slidesUrl && (
                  <a
                    href={currentModule.slidesUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary inline-flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    View Slides
                  </a>
                )}
              </div>
            </div>
            <button
              onClick={handleModuleComplete}
              className="btn-primary flex items-center gap-2"
            >
              Mark as Complete & Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        );

      case 'assignment':
        return (
          <div className="space-y-4">
            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
              <h3 className="text-xl font-semibold text-foreground">{currentModule.title}</h3>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(currentModule.content || "<p>No instructions provided.</p>"),
                }}
              />
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Your Submission (Rich Text)</label>
                <RichTextEditor
                  value={assignmentContent}
                  onChange={setAssignmentContent}
                  placeholder="Write and format your assignment submission here..."
                  minHeightClass="min-h-[180px]"
                />
                <div className="mt-3">
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Attach file(s): PDF, PPT, Word, Video, Images
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.ppt,.pptx,.doc,.docx,video/*,image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleAssignmentFileUpload(file);
                      e.target.value = "";
                    }}
                    className="input-field py-2 text-sm"
                  />
                  {assignmentFileUploading && (
                    <p className="text-xs text-primary mt-1">Uploading attachment...</p>
                  )}
                </div>
                {assignmentSavedAt && (
                  <p className="text-xs text-success mt-2">
                    Last submitted: {new Date(assignmentSavedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => void handleAssignmentSubmit()}
              disabled={assignmentLoading || assignmentContent.replace(/<[^>]+>/g, "").trim().length === 0}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {assignmentLoading ? "Submitting..." : "Submit Assignment"}
            </button>
          </div>
        );

      case 'quiz':
        const quizForms = parseQuizFormsFromModule(currentModule);
        const allRequiredAnswered = quizForms.every((q) => {
          const answer = quizAnswers[q.id];
          if (q.type === "checkbox") return Array.isArray(answer) && answer.length > 0;
          if (q.type === "short_answer" || q.type === "paragraph") return String(answer || "").trim().length > 0;
          return typeof answer === "number";
        });
        return (
          <div className="space-y-6">
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-xl font-semibold text-foreground mb-6">
                {currentModule.title}
              </h3>

              {quizForms.map((question, qIndex) => (
                <div key={question.id} className="mb-6 last:mb-0 space-y-3">
                  <p className="font-medium text-foreground mb-3">
                    {qIndex + 1}. {question.prompt}
                  </p>
                  {(question.type === "mcq" || question.type === "choose_photo" || question.type === "agree" || question.type === "rating") && (
                    <div className="space-y-2">
                      {(question.type === "rating"
                        ? Array.from({ length: question.scaleMax || 5 }).map((_, i) => String(i + 1))
                        : question.options || []).map((option, oIndex) => {
                          const isSelected = quizAnswers[question.id] === oIndex;
                          return (
                            <button
                              key={oIndex}
                              onClick={() => !quizSubmitted && setQuizAnswers({ ...quizAnswers, [question.id]: oIndex })}
                              disabled={quizSubmitted}
                              className={`w-full text-left p-4 rounded-lg border transition-all ${isSelected ? "bg-primary/10 border-primary border-2" : "bg-muted hover:bg-muted/80 border-border"
                                }`}
                            >
                              <span className="flex items-center gap-3">
                                <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"
                                  }`}>
                                  {isSelected && <CheckCircle className="w-4 h-4" />}
                                </span>
                                <span className="text-foreground">{option}</span>
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  )}
                  {question.type === "checkbox" && (
                    <div className="space-y-2">
                      {(question.options || []).map((option, oIndex) => {
                        const selected = Array.isArray(quizAnswers[question.id]) && quizAnswers[question.id].includes(oIndex);
                        return (
                          <button
                            key={oIndex}
                            onClick={() => {
                              if (quizSubmitted) return;
                              const current = Array.isArray(quizAnswers[question.id]) ? quizAnswers[question.id] : [];
                              const next = current.includes(oIndex)
                                ? current.filter((i: number) => i !== oIndex)
                                : [...current, oIndex];
                              setQuizAnswers({ ...quizAnswers, [question.id]: next });
                            }}
                            className={`w-full text-left p-4 rounded-lg border transition-all ${selected ? "bg-primary/10 border-primary border-2" : "bg-muted hover:bg-muted/80 border-border"
                              }`}
                          >
                            <span className="text-foreground">{option}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {(question.type === "short_answer" || question.type === "paragraph") && (
                    question.type === "short_answer" ? (
                      <input
                        type="text"
                        value={String(quizAnswers[question.id] || "")}
                        onChange={(e) => !quizSubmitted && setQuizAnswers({ ...quizAnswers, [question.id]: e.target.value })}
                        className="input-field"
                        placeholder="Type your answer"
                        disabled={quizSubmitted}
                      />
                    ) : (
                      <textarea
                        value={String(quizAnswers[question.id] || "")}
                        onChange={(e) => !quizSubmitted && setQuizAnswers({ ...quizAnswers, [question.id]: e.target.value })}
                        className="input-field min-h-[120px]"
                        placeholder="Type your paragraph answer"
                        disabled={quizSubmitted}
                      />
                    )
                  )}
                </div>
              ))}

              {quizSubmitted ? (
                <div className={`p-4 rounded-lg ${quizScore >= getQuizPassScore(currentModule.content) ? 'bg-success/10' : 'bg-destructive/10'}`}>
                  <p className={`font-semibold ${quizScore >= getQuizPassScore(currentModule.content) ? 'text-success' : 'text-destructive'}`}>
                    Your Score: {quizScore}%
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {quizScore >= getQuizPassScore(currentModule.content)
                      ? 'Great job! You passed the assessment.'
                      : `You need at least ${getQuizPassScore(currentModule.content)}% to pass. Please review and try again.`}
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleQuizSubmit}
                  disabled={!allRequiredAnswered}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Answers
                </button>
              )}
            </div>

            {quizSubmitted && quizScore >= getQuizPassScore(currentModule.content) && activeModuleIndex < totalModules - 1 && (
              <button
                onClick={handleModuleComplete}
                className="btn-primary flex items-center gap-2"
              >
                Continue to Next Module
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {quizSubmitted && quizScore < getQuizPassScore(currentModule.content) && (
              <button
                onClick={() => {
                  setQuizAnswers({});
                  setQuizSubmitted(false);
                }}
                className="btn-secondary"
              >
                Try Again
              </button>
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Header */}
        <section className="bg-card border-b border-border py-6">
          <div className="container mx-auto px-4">
            <Link
              to="/courses"
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground mb-4"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Courses
            </Link>

            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="badge badge-primary">{course.category}</span>
                  <span className={`badge ${course.level === 'Beginner' ? 'badge-success' :
                    course.level === 'Intermediate' ? 'badge-warning' : 'badge-primary'
                    }`}>
                    {course.level}
                  </span>
                </div>

                <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-3">
                  {course.title}
                </h1>

                <div
                  className="prose prose-sm max-w-none text-muted-foreground mb-4"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(course.description) }}
                />

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {course.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {course.enrolledCount.toLocaleString()} enrolled
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-warning fill-warning" />
                    {course.rating}
                  </span>
                  <span className="flex items-center gap-1">
                    <Award className="w-4 h-4 text-primary" />
                    {course.cpdPoints} CPD Points
                  </span>
                </div>
              </div>

              {!isEnrolled && effectiveRole === 'learner' && !isInstructor && (
                <button onClick={handleEnroll} className="btn-primary lg:w-auto">
                  Enroll Now - Earn {course.cpdPoints} CPD
                </button>
              )}

              {isEnrolled && effectiveRole === 'learner' && !isCourseComplete && completedModules.length === totalModules && (
                <button onClick={handleCompleteCourse} className="btn-primary gradient-success lg:w-auto flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Complete & Get Certificate
                </button>
              )}
            </div>

            {isEnrolled && (
              <div className="mt-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Course Progress</span>
                  <span className="font-medium text-primary">{progress}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Course Content */}
        <section className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {isEnrolled ? (
                <>
                  <h2 className="text-xl font-bold text-foreground mb-4">
                    {currentModule.title}
                  </h2>
                  {renderModuleContent()}
                </>
              ) : (
                <div className="card-elevated p-8 text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full gradient-primary flex items-center justify-center">
                    <Play className="w-10 h-10 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    {user ? 'Ready to Start Learning?' : 'Login to Start Learning'}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {!user
                      ? `You must be logged in to enroll in this course and earn ${course.cpdPoints} CPD points.`
                      : effectiveRole !== 'learner'
                        ? 'Switch to Learner View to enroll in this course.'
                        : isInstructor
                          ? 'Instructors cannot enroll in courses, including their own.'
                          : `Enroll now to access all ${totalModules} modules and earn ${course.cpdPoints} CPD points upon completion.`
                    }
                  </p>
                  <button onClick={handleEnroll} className="btn-primary" disabled={!!user && (effectiveRole !== 'learner' || isInstructor)}>
                    {!user ? 'Log in to Enroll' : effectiveRole !== 'learner' ? 'Learner View Required' : isInstructor ? 'Instructors Cannot Enroll' : 'Enroll in This Course'}
                  </button>
                </div>
              )}
            </div>

            {/* Sidebar - Module List */}
            <div className="lg:col-span-1">
              <div className="card-elevated sticky top-24">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold text-foreground">Course Modules</h3>
                  <p className="text-sm text-muted-foreground">
                    {completedModules.length} of {totalModules} completed
                  </p>
                </div>

                <div className="divide-y divide-border max-h-96 overflow-y-auto">
                  {course.modules.map((module, index) => {
                    const Icon = getModuleIcon(module.type);
                    const isComplete = completedModules.includes(module.id);
                    const isCurrent = index === activeModuleIndex;
                    const isExpanded = expandedModules.includes(module.id);

                    return (
                      <div key={module.id}>
                        <button
                          onClick={() => {
                            if (isEnrolled) {
                              setActiveModuleIndex(index);
                              setQuizAnswers({});
                              setQuizSubmitted(false);
                            }
                            toggleModuleExpand(module.id);
                          }}
                          className={`w-full p-4 text-left flex items-start gap-3 transition-colors ${isCurrent ? 'bg-primary/5' : 'hover:bg-muted'
                            }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isComplete
                            ? 'bg-success text-success-foreground'
                            : isCurrent
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                            }`}>
                            {isComplete ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <Icon className="w-4 h-4" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className={`font-medium truncate ${isCurrent ? 'text-primary' : 'text-foreground'
                              }`}>
                              {module.title}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {module.type}
                              {module.duration && ` · ${Math.round(module.duration / 60)} min`}
                            </p>
                          </div>

                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4 text-sm text-muted-foreground bg-muted/30">
                            {module.type === 'video' && 'Watch the video lesson to learn key concepts.'}
                            {(module.type === 'pdf' || module.type === 'ppt' || module.type === 'word') && 'Review the document materials provided.'}
                            {module.type === 'word' && module.slidesUrl && ' Slides were generated from this document and are available in the module viewer.'}
                            {module.type === 'assignment' && 'Read instructions and submit a rich-text assignment response.'}
                            {module.type === 'quiz' && `Answer ${module.questions?.length || 0} questions to test your knowledge.`}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default CourseDetail;
