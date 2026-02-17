import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Users, Star, Award, Play } from 'lucide-react';
import { Course } from '@/types/lms';

interface CourseCardProps {
  course: Course;
  progress?: number;
  showProgress?: boolean;
  onEnroll?: () => void;
  isEnrolled?: boolean;
}

const CourseCard: React.FC<CourseCardProps> = ({ 
  course, 
  progress = 0, 
  showProgress = false,
  onEnroll,
  isEnrolled = false
}) => {
  const levelColors = {
    Beginner: 'badge-success',
    Intermediate: 'badge-warning',
    Advanced: 'badge-primary'
  };
  const plainDescription = course.description.replace(/<[^>]+>/g, " ");

  return (
    <div className="card-elevated group overflow-hidden">
      {/* Thumbnail */}
      <div className="relative h-40 overflow-hidden">
        {course.thumbnail ? (
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-muted/50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Category Badge */}
        <div className="absolute top-3 left-3">
          <span className="badge bg-card/90 backdrop-blur-sm text-foreground">
            {course.category}
          </span>
        </div>

        {/* Level Badge */}
        <div className="absolute top-3 right-3">
          <span className={`badge ${levelColors[course.level]}`}>
            {course.level}
          </span>
        </div>

        {/* Play Button Overlay */}
        <Link 
          to={`/courses/${course.id}`}
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        >
          <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center shadow-button transform scale-90 group-hover:scale-100 transition-transform">
            <Play className="w-6 h-6 text-primary-foreground ml-1" />
          </div>
        </Link>
      </div>

      {/* Content */}
      <div className="p-5">
        <Link to={`/courses/${course.id}`}>
          <h3 className="font-semibold text-foreground text-lg mb-2 line-clamp-1 group-hover:text-primary transition-colors">
            {course.title}
          </h3>
        </Link>
        
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {plainDescription}
        </p>

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{course.duration}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            <span>{course.enrolledCount.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-warning fill-warning" />
            <span>{course.rating}</span>
          </div>
          <div className="flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-primary" />
            <span>{course.cpdPoints} CPD</span>
          </div>
        </div>

        {/* Progress Bar */}
        {showProgress && (
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-primary">{progress}%</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-bar-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Button */}
        {isEnrolled ? (
          <Link 
            to={`/courses/${course.id}`}
            className="w-full btn-primary text-center block text-sm"
          >
            {progress > 0 && progress < 100 ? 'Continue Learning' : progress === 100 ? 'Review Course' : 'Start Course'}
          </Link>
        ) : onEnroll ? (
          <button onClick={onEnroll} className="w-full btn-secondary text-sm">
            Enroll Now
          </button>
        ) : (
          <Link 
            to={`/courses/${course.id}`}
            className="w-full btn-secondary text-center block text-sm"
          >
            View Details
          </Link>
        )}
      </div>
    </div>
  );
};

export default CourseCard;
