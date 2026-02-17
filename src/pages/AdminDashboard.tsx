import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCourses } from '@/context/CourseContext';
import { useAuth } from '@/context/AuthContext';
import { SystemNotification } from '@/types/lms';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import RichTextEditor from '@/components/RichTextEditor';
import {
  Plus,
  Edit2,
  Trash2,
  BookOpen,
  Video,
  FileText,
  HelpCircle,
  X,
  Save,
  Bell,
  Shield,
  TrendingUp,
} from 'lucide-react';
import { Course, Module, QuizQuestion } from '@/types/lms';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { toast } from '@/hooks/use-toast';

type ReportsOverview = {
  enrollmentByMonth?: { month: string; enrollments: number }[];
  categoryDistribution?: { category: string; value: number }[];
};

type ImportedCourseDraft = Omit<Course, "id">;
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
type QuizContentConfig = {
  passScore: number;
  forms: QuizFormQuestion[];
};

const parseQuizPassScore = (content?: string) => {
  if (!content) return DEFAULT_QUIZ_PASS_SCORE;
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed?.passScore === "number") {
      return Math.min(100, Math.max(1, parsed.passScore));
    }
  } catch {
    const match = content.match(/pass(?:ing)?\s*score\s*[:=]\s*(\d{1,3})/i);
    if (match) return Math.min(100, Math.max(1, Number(match[1])));
  }
  return DEFAULT_QUIZ_PASS_SCORE;
};

const setQuizPassScoreInContent = (content: string, passScore: number) => {
  const nextScore = Math.min(100, Math.max(1, passScore));
  try {
    const parsed = content ? JSON.parse(content) : {};
    return JSON.stringify({ ...(parsed || {}), passScore: nextScore, forms: Array.isArray(parsed?.forms) ? parsed.forms : [] });
  } catch {
    return JSON.stringify({ passScore: nextScore, forms: [] });
  }
};

const defaultOptionsForType = (type: QuizFormType) => {
  if (type === "agree") {
    return ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"];
  }
  if (type === "mcq" || type === "checkbox" || type === "choose_photo") {
    return ["Option 1", "Option 2", "Option 3", "Option 4"];
  }
  return [];
};

const parseQuizContentConfig = (content?: string, legacyQuestions?: QuizQuestion[]): QuizContentConfig => {
  if (content) {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed?.forms)) {
        return {
          passScore: typeof parsed.passScore === "number" ? Math.min(100, Math.max(1, parsed.passScore)) : DEFAULT_QUIZ_PASS_SCORE,
          forms: parsed.forms,
        };
      }
    } catch {
      // ignore
    }
  }
  const legacyForms: QuizFormQuestion[] = (legacyQuestions || []).map((q) => ({
    id: q.id,
    type: "mcq",
    prompt: q.question,
    options: q.options,
    correctIndex: q.correctAnswer,
  }));
  return { passScore: parseQuizPassScore(content), forms: legacyForms };
};

const toLegacyMcqQuestions = (forms: QuizFormQuestion[]): QuizQuestion[] =>
  forms
    .filter((f) => f.type === "mcq" && (f.options?.length || 0) >= 2)
    .map((f, idx) => ({
      id: f.id || `q-${Date.now()}-${idx + 1}`,
      question: f.prompt,
      options: f.options || [],
      correctAnswer: typeof f.correctIndex === "number" ? f.correctIndex : 0,
    }));

const parseAnswerTokenToIndex = (token: string, optionCount: number) => {
  const normalized = token.trim().toUpperCase();
  if (!normalized) return 0;
  if (/^\d+$/.test(normalized)) {
    const numeric = Number(normalized) - 1;
    if (!Number.isNaN(numeric) && numeric >= 0 && numeric < optionCount) return numeric;
  }
  const letterCode = normalized.charCodeAt(0) - 65;
  if (letterCode >= 0 && letterCode < optionCount) return letterCode;
  return 0;
};

const parseQuizQuestionsFromText = (raw: string): QuizQuestion[] => {
  const content = raw.trim();
  if (!content) return [];

  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      const normalized = parsed
        .map((item: any, idx: number) => {
          if (!item?.question || !Array.isArray(item?.options) || item.options.length < 2) return null;
          const options = item.options.map((o: any) => String(o));
          const correctAnswer = parseAnswerTokenToIndex(String(item.correctAnswer ?? item.answer ?? "1"), options.length);
          return {
            id: `q-${Date.now()}-${idx + 1}`,
            question: String(item.question),
            options,
            correctAnswer,
          };
        })
        .filter(Boolean) as QuizQuestion[];
      if (normalized.length > 0) return normalized;
    }
  } catch {
    // fall through to text parsing
  }

  const questions: QuizQuestion[] = [];
  const lines = content.replace(/\r/g, "").split("\n");
  let currentQuestion = "";
  let currentOptions: string[] = [];
  let currentAnswer = "1";
  let idx = 0;

  const flushQuestion = () => {
    if (!currentQuestion || currentOptions.length < 2) return;
    questions.push({
      id: `q-${Date.now()}-${idx + 1}`,
      question: currentQuestion.trim(),
      options: currentOptions,
      correctAnswer: parseAnswerTokenToIndex(currentAnswer, currentOptions.length),
    });
    idx += 1;
    currentQuestion = "";
    currentOptions = [];
    currentAnswer = "1";
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushQuestion();
      continue;
    }

    const pipeQuestion = line.match(/^q(?:uestion)?\s*:\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*answer\s*:\s*([A-Da-d1-9])$/i);
    if (pipeQuestion) {
      flushQuestion();
      const [, q, o1, o2, o3, o4, ans] = pipeQuestion;
      questions.push({
        id: `q-${Date.now()}-${idx + 1}`,
        question: q.trim(),
        options: [o1.trim(), o2.trim(), o3.trim(), o4.trim()],
        correctAnswer: parseAnswerTokenToIndex(ans, 4),
      });
      idx += 1;
      continue;
    }

    const qMatch = line.match(/^q(?:uestion)?\s*:\s*(.+)$/i);
    if (qMatch) {
      flushQuestion();
      currentQuestion = qMatch[1].trim();
      continue;
    }

    const optionMatch = line.match(/^[A-Ha-h][\)\.\-:]\s*(.+)$/);
    if (optionMatch) {
      currentOptions.push(optionMatch[1].trim());
      continue;
    }

    const answerMatch = line.match(/^answer\s*:\s*([A-Ha-h1-9])$/i);
    if (answerMatch) {
      currentAnswer = answerMatch[1];
      continue;
    }
  }

  flushQuestion();
  return questions;
};

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
    // legacy plain URL format
  }
  return { fileUrl: content, slideRange: "" };
};

const buildPptModuleContent = (fileUrl: string, slideRange: string) =>
  JSON.stringify({ fileUrl, slideRange });

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const plainTextToRichHtml = (value: string) => {
  const paragraphs = value
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => `<p>${escapeHtml(chunk).replace(/\n/g, "<br />")}</p>`);
  return paragraphs.join("") || "<p>Course content imported from text file.</p>";
};

const parseCourseFromText = (rawText: string, fallbackInstructor: string): ImportedCourseDraft => {
  const normalized = rawText.replace(/\r/g, "").trim();
  const lines = normalized.split("\n");
  const firstContentLine = lines.find((line) => line.trim().length > 0)?.trim() || "Imported Course";

  const fieldPatterns: Record<string, RegExp> = {
    title: /^title\s*:\s*(.+)$/im,
    category: /^category\s*:\s*(.+)$/im,
    instructor: /^instructor\s*:\s*(.+)$/im,
    duration: /^duration\s*:\s*(.+)$/im,
    level: /^level\s*:\s*(Beginner|Intermediate|Advanced)\s*$/im,
    cpdPoints: /^cpd\s*points?\s*:\s*(\d+)$/im,
  };

  const getField = (name: keyof typeof fieldPatterns) => normalized.match(fieldPatterns[name])?.[1]?.trim();
  const title = getField("title") || firstContentLine;
  const category = getField("category") || "General";
  const instructor = getField("instructor") || fallbackInstructor || "Instructor";
  const duration = getField("duration") || "1 hour";
  const level = (getField("level") as Course["level"] | undefined) || "Beginner";
  const cpdPoints = Number(getField("cpdPoints") || 10);

  const moduleRegex = /^module\s*:\s*(video|youtube|pdf|ppt|word|quiz|assignment|notes|case\s*study)\s*\|\s*([^|]+)\|\s*(.+)$/gim;
  const parsedModules: Module[] = [];
  let moduleMatch = moduleRegex.exec(normalized);
  while (moduleMatch) {
    const rawType = moduleMatch[1].trim().toLowerCase();
    const type: Module["type"] =
      rawType === "youtube"
        ? "video"
        : rawType === "notes" || rawType === "case study"
          ? "assignment"
          : (rawType as Module["type"]);
    const moduleTitle = moduleMatch[2].trim();
    const moduleContent = moduleMatch[3].trim();
    const quizQuestions = type === "quiz" ? parseQuizQuestionsFromText(moduleContent) : [];
    parsedModules.push({
      id: `mod-${Date.now()}-${parsedModules.length + 1}`,
      title: moduleTitle || `Module ${parsedModules.length + 1}`,
      type,
      content:
        type === "assignment"
          ? plainTextToRichHtml(moduleContent)
          : type === "quiz"
            ? setQuizPassScoreInContent("", parseQuizPassScore(moduleContent))
            : moduleContent,
      completed: false,
      ...(type === "video" ? { duration: 600 } : {}),
      ...(type === "quiz" ? { questions: quizQuestions } : {}),
    });
    moduleMatch = moduleRegex.exec(normalized);
  }

  const descriptionMatch = normalized.match(/^description\s*:\s*([\s\S]*?)(?:\nmodule\s*:|$)/im);
  const descriptionText = descriptionMatch?.[1]?.trim() || normalized;
  const description = plainTextToRichHtml(descriptionText);

  const modules =
    parsedModules.length > 0
      ? parsedModules
      : [
        {
          id: `mod-${Date.now()}-1`,
          title: "Learning Material",
          type: "assignment" as const,
          content: plainTextToRichHtml(normalized),
          completed: false,
        },
      ];

  return {
    title,
    description,
    category,
    instructor,
    duration,
    cpdPoints: Number.isNaN(cpdPoints) ? 10 : cpdPoints,
    level,
    thumbnail: "",
    modules,
    enrolledCount: 0,
    rating: 0,
  };
};

const AdminDashboard: React.FC = () => {
  const { courses, addCourse, deleteCourse, updateCourse } = useCourses();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const txtImportInputRef = useRef<HTMLInputElement | null>(null);
  const adminDisplayName = user?.name?.trim().split(' ')[0] || 'Instructor';
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);
  const [apiNotifications, setApiNotifications] = useState<SystemNotification[]>([]);
  const [enrollmentByMonth, setEnrollmentByMonth] = useState<{ month: string; enrollments: number }[]>([]);
  const [categoryDistribution, setCategoryDistribution] = useState<{ category: string; value: number }[]>([]);
  const [thumbnailFileName, setThumbnailFileName] = useState('');
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [thumbnailError, setThumbnailError] = useState('');
  const [isImportingTxt, setIsImportingTxt] = useState(false);
  const [courseCreateMode, setCourseCreateMode] = useState<"manual" | "upload">("manual");
  const [uploadingModuleIndex, setUploadingModuleIndex] = useState<number | null>(null);
  const [moduleUploadErrors, setModuleUploadErrors] = useState<Record<number, string>>({});

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    instructor: '',
    duration: '',
    cpdPoints: 10,
    level: 'Beginner' as Course['level'],
    thumbnail: ''
  });

  const [modules, setModules] = useState<Omit<Module, 'id'>[]>([]);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem(`welcome_shown_${user?.id}`);
    if (!hasSeenWelcome && user) {
      setShowWelcomeModal(true);
      localStorage.setItem(`welcome_shown_${user.id}`, 'true');
    }
  }, [user]);

  useEffect(() => {
    const openAddCourse = (location.state as { openAddCourse?: boolean } | null)?.openAddCourse;
    if (openAddCourse) {
      openModal();
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!user) return;
    void api
      .get<SystemNotification[]>('/notifications')
      .then(({ data }) => setApiNotifications(Array.isArray(data) ? data : []))
      .catch(() => setApiNotifications([]));

    void api
      .get<ReportsOverview>('/reports/overview')
      .then(({ data }) => {
        setEnrollmentByMonth(data.enrollmentByMonth || []);
        setCategoryDistribution(data.categoryDistribution || []);
      })
      .catch(() => {
        setEnrollmentByMonth([]);
        setCategoryDistribution([]);
      });
  }, [user]);

  const notifications = apiNotifications
    .filter(n => n.targetRoles.includes('admin') && !dismissedNotifications.includes(n.id));

  const dismissNotification = (id: string) => {
    setDismissedNotifications(prev => [...prev, id]);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
      instructor: '',
      duration: '',
      cpdPoints: 10,
      level: 'Beginner',
      thumbnail: ''
    });
    setModules([]);
    setEditingCourse(null);
    setThumbnailFileName('');
    setThumbnailError('');
    setUploadingModuleIndex(null);
    setModuleUploadErrors({});
    setCourseCreateMode("manual");
  };

  const openModal = (course?: Course) => {
    if (course) {
      const normalizedThumbnail =
        !course.thumbnail || course.thumbnail.endsWith("/placeholder.svg") ? "" : course.thumbnail;
      setEditingCourse(course);
      setCourseCreateMode("manual");
      setFormData({
        title: course.title,
        description: course.description,
        category: course.category,
        instructor: course.instructor,
        duration: course.duration,
        cpdPoints: course.cpdPoints,
        level: course.level,
        thumbnail: normalizedThumbnail
      });
      setModules(course.modules.map(m => ({ ...m })));
      setThumbnailFileName(normalizedThumbnail ? (normalizedThumbnail.split('/').pop() || "") : "");
      setThumbnailError('');
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const addModule = (type: Module['type']) => {
    const newModule: Omit<Module, 'id'> = {
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Module`,
      type,
      content:
        type === 'quiz'
          ? JSON.stringify({ passScore: DEFAULT_QUIZ_PASS_SCORE, forms: [] })
          : type === 'ppt'
            ? buildPptModuleContent("", "")
            : '',
      completed: false,
      ...(type === 'video' ? { duration: 600 } : {}),
      ...(type === 'quiz' ? { questions: [] } : {})
    };
    setModules([...modules, newModule]);
  };

  const addPresetModule = (preset: "notes" | "youtube" | "case_study") => {
    if (preset === "youtube") {
      const newModule: Omit<Module, "id"> = {
        title: "YouTube Lesson",
        type: "video",
        content: "",
        duration: 600,
        completed: false,
      };
      setModules([...modules, newModule]);
      return;
    }
    const title = preset === "notes" ? "Notes" : "Case Study";
    const newModule: Omit<Module, "id"> = {
      title,
      type: "assignment",
      content: "<p>Write content here...</p>",
      completed: false,
    };
    setModules([...modules, newModule]);
  };

  const updateQuizConfig = (index: number, next: QuizContentConfig) => {
    const safeForms = next.forms || [];
    updateModule(index, {
      content: JSON.stringify({ passScore: Math.min(100, Math.max(1, next.passScore)), forms: safeForms }),
      questions: toLegacyMcqQuestions(safeForms),
    });
  };

  const addQuizFormQuestion = (index: number, type: QuizFormType) => {
    const module = modules[index];
    const existing = parseQuizContentConfig(module?.content, module?.questions);
    const newQuestion: QuizFormQuestion = {
      id: `qf-${Date.now()}-${existing.forms.length + 1}`,
      type,
      prompt: "",
      options: defaultOptionsForType(type),
      correctIndex: 0,
      correctIndexes: type === "checkbox" ? [0] : undefined,
      answerText: type === "short_answer" || type === "paragraph" ? "" : undefined,
      scaleMax: type === "rating" ? 5 : undefined,
    };
    updateQuizConfig(index, { ...existing, forms: [...existing.forms, newQuestion] });
  };

  const updateQuizFormQuestion = (index: number, questionId: string, updater: (q: QuizFormQuestion) => QuizFormQuestion) => {
    const module = modules[index];
    const existing = parseQuizContentConfig(module?.content, module?.questions);
    const forms = existing.forms.map((q) => (q.id === questionId ? updater(q) : q));
    updateQuizConfig(index, { ...existing, forms });
  };

  const removeQuizFormQuestion = (index: number, questionId: string) => {
    const module = modules[index];
    const existing = parseQuizContentConfig(module?.content, module?.questions);
    updateQuizConfig(index, { ...existing, forms: existing.forms.filter((q) => q.id !== questionId) });
  };

  const updateModule = (index: number, updates: Partial<Module>) => {
    setModules(modules.map((m, i) => i === index ? { ...m, ...updates } : m));
  };

  const removeModule = (index: number) => {
    setModules(modules.filter((_, i) => i !== index));
  };

  const getDocumentAcceptByType = (type: Module['type']) => {
    if (type === 'pdf') return '.pdf';
    if (type === 'ppt') return '.ppt,.pptx';
    if (type === 'word') return '.doc,.docx';
    return '';
  };

  const handleModuleDocumentUpload = async (index: number, file: File) => {
    const module = modules[index];
    if (!module || !['pdf', 'ppt', 'word'].includes(module.type)) return;

    setModuleUploadErrors((prev) => ({ ...prev, [index]: '' }));
    setUploadingModuleIndex(index);

    try {
      const form = new FormData();
      form.append('file', file);
      const uploadRes = await api.post<{ url: string }>('/uploads', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (module.type === 'word') {
        try {
          const slidesRes = await api.post<{ slidesUrl: string }>('/uploads/word-to-slides', {
            fileUrl: uploadRes.data.url,
          });
          updateModule(index, { content: uploadRes.data.url, slidesUrl: slidesRes.data.slidesUrl });
        } catch {
          updateModule(index, { content: uploadRes.data.url, slidesUrl: undefined });
          setModuleUploadErrors((prev) => ({
            ...prev,
            [index]: 'Word uploaded, but slide conversion failed.',
          }));
        }
      } else {
        if (module.type === "ppt") {
          const current = parsePptModuleContent(module.content);
          updateModule(index, { content: buildPptModuleContent(uploadRes.data.url, current.slideRange) });
        } else {
          updateModule(index, { content: uploadRes.data.url });
        }
      }
    } catch (error: any) {
      const msg = error?.response?.data?.error?.message || error?.response?.data?.message;
      setModuleUploadErrors((prev) => ({
        ...prev,
        [index]: `Document upload failed: ${Array.isArray(msg) ? msg[0] : msg || 'Unknown error'}`,
      }));
    } finally {
      setUploadingModuleIndex(null);
    }
  };

  const handleModuleVideoUpload = async (index: number, file: File) => {
    const module = modules[index];
    if (!module || module.type !== "video") return;

    setModuleUploadErrors((prev) => ({ ...prev, [index]: '' }));
    setUploadingModuleIndex(index);

    try {
      const form = new FormData();
      form.append("file", file);
      const uploadRes = await api.post<{ url: string }>("/uploads", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      updateModule(index, { content: uploadRes.data.url });
    } catch (error: any) {
      // Handle nested error object from HttpExceptionFilter
      const msg = error?.response?.data?.error?.message || error?.response?.data?.message;
      setModuleUploadErrors((prev) => ({
        ...prev,
        [index]: `Video upload failed: ${Array.isArray(msg) ? msg[0] : msg || "Unknown error"}`,
      }));
    } finally {
      setUploadingModuleIndex(null);
    }
  };

  const handleThumbnailFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setThumbnailError('');
    setIsUploadingThumbnail(true);

    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post<{ url: string }>('/uploads', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setFormData((prev) => ({ ...prev, thumbnail: data.url }));
      setThumbnailFileName(file.name);
    } catch (error: any) {
      const apiMessage = error?.response?.data?.error?.message || error?.response?.data?.message;
      const detail = Array.isArray(apiMessage) ? apiMessage[0] : apiMessage;
      setThumbnailError(detail || 'Thumbnail upload failed. Please try again.');
    } finally {
      setIsUploadingThumbnail(false);
      e.target.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const plainDescription = (formData.description || "").replace(/<[^>]+>/g, "").trim();
    if (!plainDescription) {
      toast({
        title: "Description required",
        description: "Please provide a course description using the rich text editor.",
      });
      return;
    }
    if (!formData.thumbnail) {
      toast({
        title: "Thumbnail required",
        description: "Please upload a thumbnail image.",
      });
      return;
    }
    const missingDocument = modules.some(
      (m) => (m.type === 'pdf' || m.type === 'ppt' || m.type === 'word') && !m.content,
    );
    if (missingDocument) {
      toast({
        title: "Document upload required",
        description: "Please upload file(s) for PDF, PPT, and Word modules before saving.",
      });
      return;
    }
    const missingAssignmentInstructions = modules.some((m) => {
      if (m.type !== 'assignment') return false;
      const plain = (m.content || "").replace(/<[^>]+>/g, "").trim();
      return plain.length === 0;
    });
    if (missingAssignmentInstructions) {
      toast({
        title: "Assignment instructions required",
        description: "Please provide rich-text instructions for every assignment module.",
      });
      return;
    }

    const courseData = {
      ...formData,
      modules: modules.map((m, i) => ({ ...m, id: `mod-${Date.now()}-${i}` })) as Module[],
      enrolledCount: editingCourse?.enrolledCount || 0,
      rating: editingCourse?.rating || 4.5
    };

    const submitAction = async () => {
      try {
        if (editingCourse) {
          await updateCourse(editingCourse.id, courseData);
          toast({
            title: "Course Updated",
            description: `${formData.title} has been updated.`,
          });
        } else {
          await addCourse(courseData);
          toast({
            title: "Course Created",
            description: `${formData.title} has been added to the catalog.`,
          });
        }
        closeModal();
      } catch (error: any) {
        toast({
          title: "Operation Failed",
          description: error?.response?.data?.message || "Could not save course. Please try again.",
          variant: "destructive",
        });
      }
    };

    void submitAction();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      try {
        await deleteCourse(id);
        toast({
          title: "Course Deleted",
          description: "The course has been removed.",
        });
      } catch (error: any) {
        toast({
          title: "Delete Failed",
          description: error?.response?.data?.message || "Could not delete course. You may not have permission.",
          variant: "destructive",
        });
      }
    }
  };

  const handleTxtImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingTxt(true);
    try {
      const text = await file.text();
      const courseData = parseCourseFromText(text, user?.name || "Instructor");
      addCourse(courseData);
      toast({
        title: "Course Imported",
        description: `${courseData.title} was created from ${file.name}.`,
      });
      closeModal();
    } catch {
      toast({
        title: "Import failed",
        description: "Could not parse the text file. Please check the format and try again.",
      });
    } finally {
      setIsImportingTxt(false);
      e.target.value = "";
    }
  };

  // Aggregate stats
  const totalEnrollments = courses.reduce((acc, c) => acc + (c.enrolledCount || 0), 0);
  const averageRating = courses.length > 0
    ? (courses.reduce((acc, c) => acc + (c.rating || 0), 0) / courses.length).toFixed(1)
    : "0.0";

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--accent))', 'hsl(var(--destructive))'];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Header */}
        <section className="gradient-hero text-primary-foreground py-8 lg:py-12">
          <div className="container mx-auto px-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold mb-2">Instructor Dashboard</h1>
                <p className="text-white/80">Course publishing, learners, and insights</p>
                <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">
                  <Shield className="w-4 h-4 inline mr-1" />
                  Instructor
                </span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => openModal()}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary font-semibold rounded-xl hover:bg-white/90 transition-colors shadow-lg"
                >
                  <Plus className="w-5 h-5" />
                  Add Course
                </button>
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
                className="mb-4 rounded-xl p-4 flex items-center gap-4 bg-destructive/5 border border-destructive/20"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-destructive/10">
                  <Bell className="w-5 h-5 text-destructive" />
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

        {/* Stats */}
        <section className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{courses.length}</p>
                  <p className="text-sm text-muted-foreground">Courses</p>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalEnrollments}</p>
                  <p className="text-sm text-muted-foreground">Enrollments</p>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{averageRating}</p>
                  <p className="text-sm text-muted-foreground">Avg Course Rating</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="card-elevated p-6">
              <h3 className="font-semibold text-foreground mb-4">Enrollment Trends</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={enrollmentByMonth}>
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
                    <Bar dataKey="enrollments" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card-elevated p-6">
              <h3 className="font-semibold text-foreground mb-4">Category Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                      label={({ category }) => category}
                    >
                      {categoryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Course Table */}
          <div className="card-elevated overflow-hidden">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-bold text-foreground">Course Management</h2>
              <p className="text-sm text-muted-foreground">Add, edit, or remove courses</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Course</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-foreground hidden md:table-cell">Category</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-foreground hidden lg:table-cell">Instructor</th>
                    <th className="text-center px-6 py-4 text-sm font-semibold text-foreground">Modules</th>
                    <th className="text-center px-6 py-4 text-sm font-semibold text-foreground">CPD</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {courses.map((course) => (
                    <tr key={course.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {course.thumbnail ? (
                            <img
                              src={course.thumbnail}
                              alt={course.title}
                              className="w-12 h-9 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-12 h-9 rounded-lg border border-border bg-muted/50" />
                          )}
                          <div>
                            <p className="font-medium text-foreground line-clamp-1">{course.title}</p>
                            <p className="text-sm text-muted-foreground">{course.duration}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <span className="badge badge-primary">{course.category}</span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground hidden lg:table-cell">
                        {course.instructor}
                      </td>
                      <td className="px-6 py-4 text-center text-foreground">
                        {course.modules.length}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="badge badge-success">{course.cpdPoints}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openModal(course)}
                            className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            aria-label="Edit course"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(course.id)}
                            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            aria-label="Delete course"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                <Shield className="w-8 h-8 text-primary-foreground" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Welcome, {adminDisplayName}!</h2>
              <p className="text-muted-foreground mb-6">
                As an Instructor, you can create and manage courses, review reports, and support platform learning operations.
              </p>
              <button
                onClick={() => setShowWelcomeModal(false)}
                className="btn-primary w-full"
              >
                Let's Go
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-6xl max-h-[90vh] rounded-xl shadow-xl overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-bold text-foreground">
                {editingCourse ? 'Edit Course' : 'Add New Course'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="p-6 space-y-4">
                {!editingCourse && (
                  <div className="rounded-lg border border-border bg-muted/40 p-2 inline-flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCourseCreateMode("manual")}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium ${courseCreateMode === "manual"
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                        }`}
                    >
                      Manual
                    </button>
                    <button
                      type="button"
                      onClick={() => setCourseCreateMode("upload")}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium ${courseCreateMode === "upload"
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                        }`}
                    >
                      Upload
                    </button>
                  </div>
                )}

                {!editingCourse && courseCreateMode === "upload" && (
                  <div className="space-y-3 rounded-lg border border-border p-4 bg-muted/30">
                    <p className="text-sm text-foreground font-medium">Upload course from .txt</p>
                    <p className="text-xs text-muted-foreground">
                      Import metadata, modules, and quiz questions automatically from a `.txt` file.
                    </p>
                    <input
                      ref={txtImportInputRef}
                      type="file"
                      accept=".txt,text/plain"
                      onChange={handleTxtImport}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => txtImportInputRef.current?.click()}
                      className="btn-primary inline-flex items-center gap-2"
                      disabled={isImportingTxt}
                    >
                      <FileText className="w-4 h-4" />
                      {isImportingTxt ? "Importing..." : "Choose .txt and Import"}
                    </button>
                  </div>
                )}

                {(editingCourse || courseCreateMode === "manual") && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Title</label>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          className="input-field"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Category</label>
                        <input
                          type="text"
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="input-field"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                      <RichTextEditor
                        value={formData.description}
                        onChange={(next) => setFormData({ ...formData, description: next })}
                        placeholder="Write a compelling course description..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Instructor</label>
                        <input
                          type="text"
                          value={formData.instructor}
                          onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                          className="input-field"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Duration</label>
                        <input
                          type="text"
                          value={formData.duration}
                          onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                          className="input-field"
                          placeholder="e.g., 4 hours"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">CPD Points</label>
                        <input
                          type="number"
                          value={formData.cpdPoints}
                          onChange={(e) => setFormData({ ...formData, cpdPoints: parseInt(e.target.value) })}
                          className="input-field"
                          min={1}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Level</label>
                      <select
                        value={formData.level}
                        onChange={(e) => setFormData({ ...formData, level: e.target.value as Course['level'] })}
                        className="input-field"
                      >
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Thumbnail Image</label>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,.svg"
                        onChange={handleThumbnailFileChange}
                        className="input-field py-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Landscape is recommended, but all image orientations are allowed.
                      </p>
                      {isUploadingThumbnail && (
                        <p className="text-xs text-primary mt-2">Uploading thumbnail...</p>
                      )}
                      {thumbnailFileName && (
                        <p className="text-xs text-success mt-2">Selected: {thumbnailFileName}</p>
                      )}
                      {thumbnailError && (
                        <p className="text-xs text-destructive mt-2">{thumbnailError}</p>
                      )}
                      {formData.thumbnail && (
                        <img
                          src={formData.thumbnail}
                          alt="Thumbnail preview"
                          className="mt-3 h-28 w-full object-cover rounded-lg border border-border"
                        />
                      )}
                    </div>

                    {/* Modules Section */}
                    <div className="border-t border-border pt-4 mt-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-foreground">Modules</h3>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => addPresetModule('notes')} className="btn-secondary text-xs py-1 px-2 flex items-center gap-1">
                            <FileText className="w-3 h-3" /> Notes
                          </button>
                          <button type="button" onClick={() => addModule('video')} className="btn-secondary text-xs py-1 px-2 flex items-center gap-1">
                            <Video className="w-3 h-3" /> Video
                          </button>
                          <button type="button" onClick={() => addPresetModule('youtube')} className="btn-secondary text-xs py-1 px-2 flex items-center gap-1">
                            <Video className="w-3 h-3" /> YouTube
                          </button>
                          <button type="button" onClick={() => addModule('pdf')} className="btn-secondary text-xs py-1 px-2 flex items-center gap-1">
                            <FileText className="w-3 h-3" /> PDF
                          </button>
                          <button type="button" onClick={() => addModule('ppt')} className="btn-secondary text-xs py-1 px-2 flex items-center gap-1">
                            <FileText className="w-3 h-3" /> PPT
                          </button>
                          <button type="button" onClick={() => addModule('word')} className="btn-secondary text-xs py-1 px-2 flex items-center gap-1">
                            <FileText className="w-3 h-3" /> Word
                          </button>
                          <button type="button" onClick={() => addModule('assignment')} className="btn-secondary text-xs py-1 px-2 flex items-center gap-1">
                            <FileText className="w-3 h-3" /> Assignment
                          </button>
                          <button type="button" onClick={() => addPresetModule('case_study')} className="btn-secondary text-xs py-1 px-2 flex items-center gap-1">
                            <FileText className="w-3 h-3" /> Case Study
                          </button>
                          <button type="button" onClick={() => addModule('quiz')} className="btn-secondary text-xs py-1 px-2 flex items-center gap-1">
                            <HelpCircle className="w-3 h-3" /> Quiz
                          </button>
                        </div>
                      </div>

                      {modules.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No modules added yet. Add notes, video, YouTube, PDF, PPT, Word, assignment, case study, or quiz modules above.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {modules.map((module, index) => (
                            <div key={index} className="p-3 bg-muted rounded-lg space-y-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-card flex items-center justify-center">
                                  {module.type === 'video' && <Video className="w-4 h-4 text-primary" />}
                                  {(module.type === 'pdf' || module.type === 'ppt' || module.type === 'word') && <FileText className="w-4 h-4 text-warning" />}
                                  {module.type === 'assignment' && <FileText className="w-4 h-4 text-accent" />}
                                  {module.type === 'quiz' && <HelpCircle className="w-4 h-4 text-success" />}
                                </div>
                                <input
                                  type="text"
                                  value={module.title}
                                  onChange={(e) => updateModule(index, { title: e.target.value })}
                                  className="flex-1 bg-transparent border-none focus:outline-none text-foreground"
                                  placeholder="Module title"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeModule(index)}
                                  className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>

                              {module.type === 'video' && (
                                <div className="space-y-2">
                                  <p className="text-xs text-muted-foreground">
                                    Upload video first (recommended). You can optionally add a YouTube link for in-platform embed playback.
                                  </p>
                                  <input
                                    type="file"
                                    accept="video/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        void handleModuleVideoUpload(index, file);
                                      }
                                      e.target.value = '';
                                    }}
                                    className="input-field py-2 text-sm"
                                  />
                                  {uploadingModuleIndex === index && (
                                    <p className="text-xs text-primary">Uploading video...</p>
                                  )}
                                  <input
                                    type="url"
                                    value={module.content}
                                    onChange={(e) => updateModule(index, { content: e.target.value })}
                                    className="input-field py-2 text-sm"
                                    placeholder="Optional YouTube URL or direct video URL"
                                  />
                                  {module.content && (
                                    <a
                                      href={module.content}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-primary hover:underline break-all"
                                    >
                                      Current video source
                                    </a>
                                  )}
                                  {moduleUploadErrors[index] && (
                                    <p className="text-xs text-destructive">{moduleUploadErrors[index]}</p>
                                  )}
                                </div>
                              )}

                              {(module.type === 'pdf' || module.type === 'ppt' || module.type === 'word') && (
                                <div className="space-y-2">
                                  <input
                                    type="file"
                                    accept={getDocumentAcceptByType(module.type)}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        void handleModuleDocumentUpload(index, file);
                                      }
                                      e.target.value = '';
                                    }}
                                    className="input-field py-2 text-sm"
                                  />
                                  {module.type === "ppt" && (
                                    <input
                                      type="text"
                                      value={parsePptModuleContent(module.content).slideRange}
                                      onChange={(e) => {
                                        const parsed = parsePptModuleContent(module.content);
                                        updateModule(index, {
                                          content: buildPptModuleContent(parsed.fileUrl, e.target.value),
                                        });
                                      }}
                                      className="input-field py-2 text-sm"
                                      placeholder="Slides for this module (e.g., 1-5,8,10-12)"
                                    />
                                  )}
                                  {uploadingModuleIndex === index && (
                                    <p className="text-xs text-primary">Uploading document...</p>
                                  )}
                                  {(module.type === "ppt" ? parsePptModuleContent(module.content).fileUrl : module.content) && (
                                    <a
                                      href={module.type === "ppt" ? parsePptModuleContent(module.content).fileUrl : module.content}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-primary hover:underline break-all"
                                    >
                                      Uploaded file
                                    </a>
                                  )}
                                  {module.type === "ppt" && parsePptModuleContent(module.content).slideRange && (
                                    <p className="text-xs text-muted-foreground">
                                      Slide range for this module: {parsePptModuleContent(module.content).slideRange}
                                    </p>
                                  )}
                                  {module.type === 'word' && module.slidesUrl && (
                                    <a
                                      href={module.slidesUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-success hover:underline break-all block"
                                    >
                                      Generated slides available
                                    </a>
                                  )}
                                  {moduleUploadErrors[index] && (
                                    <p className="text-xs text-destructive">{moduleUploadErrors[index]}</p>
                                  )}
                                </div>
                              )}

                              {module.type === 'assignment' && (
                                <div className="space-y-2">
                                  <label className="block text-xs font-medium text-foreground">Assignment Instructions (Rich Text)</label>
                                  <RichTextEditor
                                    value={module.content}
                                    onChange={(next) => updateModule(index, { content: next })}
                                    placeholder="Describe assignment instructions, grading criteria, and expected format..."
                                    minHeightClass="min-h-[120px]"
                                  />
                                </div>
                              )}

                              {module.type === 'quiz' && (
                                <div className="space-y-2">
                                  <label className="block text-xs font-medium text-foreground">Passing Score (%)</label>
                                  <input
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={parseQuizPassScore(module.content)}
                                    onChange={(e) =>
                                      updateQuizConfig(index, {
                                        ...parseQuizContentConfig(module.content, module.questions),
                                        passScore: Number(e.target.value || DEFAULT_QUIZ_PASS_SCORE),
                                      })
                                    }
                                    className="input-field py-2 text-sm"
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    Learners must reach this score to pass the quiz module.
                                  </p>
                                  <div className="flex flex-wrap gap-2 pt-2">
                                    <button type="button" className="btn-secondary text-xs py-1 px-2" onClick={() => addQuizFormQuestion(index, "mcq")}>+ MCQ</button>
                                    <button type="button" className="btn-secondary text-xs py-1 px-2" onClick={() => addQuizFormQuestion(index, "checkbox")}>+ Checkbox</button>
                                    <button type="button" className="btn-secondary text-xs py-1 px-2" onClick={() => addQuizFormQuestion(index, "short_answer")}>+ Short Answer</button>
                                    <button type="button" className="btn-secondary text-xs py-1 px-2" onClick={() => addQuizFormQuestion(index, "paragraph")}>+ Paragraph</button>
                                    <button type="button" className="btn-secondary text-xs py-1 px-2" onClick={() => addQuizFormQuestion(index, "rating")}>+ Rating</button>
                                    <button type="button" className="btn-secondary text-xs py-1 px-2" onClick={() => addQuizFormQuestion(index, "agree")}>+ Agree/Disagree</button>
                                    <button type="button" className="btn-secondary text-xs py-1 px-2" onClick={() => addQuizFormQuestion(index, "choose_photo")}>+ Choose Photo</button>
                                  </div>
                                  {parseQuizContentConfig(module.content, module.questions).forms.length > 0 && (
                                    <div className="space-y-3 pt-2">
                                      {parseQuizContentConfig(module.content, module.questions).forms.map((q, qIdx) => (
                                        <div key={q.id} className="rounded border border-border p-3 space-y-2 bg-background">
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                              Q{qIdx + 1} · {q.type.replace("_", " ")}
                                            </span>
                                            <button
                                              type="button"
                                              className="text-xs text-destructive hover:underline"
                                              onClick={() => removeQuizFormQuestion(index, q.id)}
                                            >
                                              Remove
                                            </button>
                                          </div>
                                          <input
                                            type="text"
                                            value={q.prompt}
                                            onChange={(e) =>
                                              updateQuizFormQuestion(index, q.id, (prev) => ({ ...prev, prompt: e.target.value }))
                                            }
                                            className="input-field py-2 text-sm"
                                            placeholder="Question prompt"
                                          />
                                          {(q.type === "mcq" || q.type === "checkbox" || q.type === "choose_photo" || q.type === "agree") && (
                                            <div className="space-y-2">
                                              {(q.options || []).map((opt, optIdx) => (
                                                <div key={`${q.id}-opt-${optIdx}`} className="flex gap-2 items-center">
                                                  <input
                                                    type="text"
                                                    value={opt}
                                                    onChange={(e) =>
                                                      updateQuizFormQuestion(index, q.id, (prev) => ({
                                                        ...prev,
                                                        options: (prev.options || []).map((v, i) => (i === optIdx ? e.target.value : v)),
                                                      }))
                                                    }
                                                    className="input-field py-1 text-sm"
                                                    placeholder={`Option ${optIdx + 1}`}
                                                  />
                                                  {q.type !== "checkbox" && (
                                                    <button
                                                      type="button"
                                                      className={`px-2 py-1 text-xs rounded border ${(q.correctIndex ?? 0) === optIdx ? "bg-success/20 border-success" : "border-border"
                                                        }`}
                                                      onClick={() =>
                                                        updateQuizFormQuestion(index, q.id, (prev) => ({ ...prev, correctIndex: optIdx }))
                                                      }
                                                    >
                                                      Correct
                                                    </button>
                                                  )}
                                                  {q.type === "checkbox" && (
                                                    <button
                                                      type="button"
                                                      className={`px-2 py-1 text-xs rounded border ${(q.correctIndexes || []).includes(optIdx) ? "bg-success/20 border-success" : "border-border"
                                                        }`}
                                                      onClick={() =>
                                                        updateQuizFormQuestion(index, q.id, (prev) => {
                                                          const current = prev.correctIndexes || [];
                                                          const next = current.includes(optIdx)
                                                            ? current.filter((i) => i !== optIdx)
                                                            : [...current, optIdx];
                                                          return { ...prev, correctIndexes: next };
                                                        })
                                                      }
                                                    >
                                                      Correct
                                                    </button>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                          {(q.type === "short_answer" || q.type === "paragraph") && (
                                            <input
                                              type="text"
                                              value={q.answerText || ""}
                                              onChange={(e) =>
                                                updateQuizFormQuestion(index, q.id, (prev) => ({ ...prev, answerText: e.target.value }))
                                              }
                                              className="input-field py-2 text-sm"
                                              placeholder="Optional answer key for auto-marking"
                                            />
                                          )}
                                          {q.type === "rating" && (
                                            <div className="grid grid-cols-2 gap-2">
                                              <input
                                                type="number"
                                                min={2}
                                                max={10}
                                                value={q.scaleMax || 5}
                                                onChange={(e) =>
                                                  updateQuizFormQuestion(index, q.id, (prev) => ({
                                                    ...prev,
                                                    scaleMax: Number(e.target.value || 5),
                                                  }))
                                                }
                                                className="input-field py-2 text-sm"
                                                placeholder="Scale max"
                                              />
                                              <input
                                                type="number"
                                                min={1}
                                                max={q.scaleMax || 5}
                                                value={typeof q.correctIndex === "number" ? q.correctIndex + 1 : 1}
                                                onChange={(e) =>
                                                  updateQuizFormQuestion(index, q.id, (prev) => ({
                                                    ...prev,
                                                    correctIndex: Math.max(0, Number(e.target.value || 1) - 1),
                                                  }))
                                                }
                                                className="input-field py-2 text-sm"
                                                placeholder="Correct value"
                                              />
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-3 p-6 border-t border-border">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">
                  Cancel
                </button>
                {(editingCourse || courseCreateMode === "manual") && (
                  <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                    <Save className="w-4 h-4" />
                    {editingCourse ? 'Update Course' : 'Create Course'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
