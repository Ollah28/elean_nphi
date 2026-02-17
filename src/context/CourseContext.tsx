import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { Course } from "@/types/lms";
import { api } from "@/lib/api";

interface CourseContextType {
  courses: Course[];
  getCourseById: (id: string) => Course | undefined;
  addCourse: (course: Omit<Course, "id">) => Promise<void>;
  updateCourse: (id: string, updates: Partial<Course>) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  searchCourses: (query: string) => Course[];
  filterByCategory: (category: string) => Course[];
  categories: string[];
}

const CourseContext = createContext<CourseContextType | undefined>(undefined);

export const CourseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [categoriesFromApi, setCategoriesFromApi] = useState<string[]>(["All"]);

  const loadCourses = async () => {
    try {
      let endpoint = "/courses?limit=500";
      try {
        const { data: me } = await api.get<{ role: "learner" | "admin" | "manager" }>("/me");
        if (me?.role === "admin" || me?.role === "manager") {
          endpoint = "/courses/manage?limit=500";
        }
      } catch {
        endpoint = "/courses?limit=500";
      }
      const { data } = await api.get(endpoint);
      setCourses(data.data || []);
    } catch {
      setCourses([]);
    }
  };

  const loadCategories = async () => {
    try {
      let endpoint = "/courses/categories";
      try {
        const { data: me } = await api.get<{ role: "learner" | "admin" | "manager" }>("/me");
        if (me?.role === "admin" || me?.role === "manager") {
          endpoint = "/courses/manage/categories";
        }
      } catch {
        endpoint = "/courses/categories";
      }
      const { data } = await api.get<string[]>(endpoint);
      setCategoriesFromApi(data?.length ? data : ["All"]);
    } catch {
      setCategoriesFromApi(["All"]);
    }
  };

  useEffect(() => {
    void loadCourses();
    void loadCategories();
  }, []);

  const getCourseById = (id: string) => courses.find((c) => c.id === id);

  const addCourse = async (course: Omit<Course, "id">) => {
    try {
      const { data } = await api.post<Course>("/courses", course);
      setCourses((prev) => [data, ...prev]);
    } catch (error) {
      throw error;
    }
  };

  const updateCourse = async (id: string, updates: Partial<Course>) => {
    try {
      const { data } = await api.patch<Course>(`/courses/${id}`, updates);
      setCourses((prev) => prev.map((c) => (c.id === id ? data : c)));
    } catch (error) {
      throw error;
    }
  };

  const deleteCourse = async (id: string) => {
    try {
      await api.delete(`/courses/${id}`);
      setCourses((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      throw error;
    }
  };

  const searchCourses = (query: string) => {
    const lower = query.toLowerCase();
    return courses.filter(
      (c) =>
        c.title.toLowerCase().includes(lower) ||
        c.description.toLowerCase().includes(lower) ||
        c.category.toLowerCase().includes(lower),
    );
  };

  const filterByCategory = (category: string) => {
    if (category === "All") return courses;
    return courses.filter((c) => c.category === category);
  };

  const categories = useMemo(() => {
    if (categoriesFromApi.length > 1) return categoriesFromApi;
    return ["All", ...new Set(courses.map((c) => c.category))];
  }, [categoriesFromApi, courses]);

  return (
    <CourseContext.Provider
      value={{
        courses,
        getCourseById,
        addCourse,
        updateCourse,
        deleteCourse,
        searchCourses,
        filterByCategory,
        categories,
      }}
    >
      {children}
    </CourseContext.Provider>
  );
};

export const useCourses = () => {
  const context = useContext(CourseContext);
  if (context === undefined) {
    throw new Error("useCourses must be used within a CourseProvider");
  }
  return context;
};
