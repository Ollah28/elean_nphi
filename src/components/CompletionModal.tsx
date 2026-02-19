import React, { useEffect } from 'react';
import { X, CheckCircle, Award, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CompletionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onNext?: () => void;
    type: 'module' | 'quiz' | 'course';
    title?: string;
    score?: number;
}

const CompletionModal: React.FC<CompletionModalProps> = ({ isOpen, onClose, onNext, type, title, score }) => {
    useEffect(() => {
        if (isOpen) {
            const duration = 3000;
            const end = Date.now() + duration;

            const frame = () => {
                confetti({
                    particleCount: 2,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: ['#5BBFBA', '#5F6CAF', '#E7F6F5'] // NPHI Brand Colors (Teal, Purple, Light Teal)
                });
                confetti({
                    particleCount: 2,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: ['#5BBFBA', '#5F6CAF', '#E7F6F5']
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            };

            frame();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const content = {
        module: {
            icon: CheckCircle,
            color: 'text-green-500',
            bg: 'bg-green-100',
            heading: 'Module Completed!',
            subtext: 'Great job! You\'ve finished this section.',
            btnText: 'Continue to Next Module'
        },
        quiz: {
            icon: Award,
            color: 'text-blue-500',
            bg: 'bg-blue-100',
            heading: 'Quiz Passed!',
            subtext: `You scored ${score}%! well done.`,
            btnText: 'Continue Learning'
        },
        course: {
            icon: Award,
            color: 'text-purple-500',
            bg: 'bg-purple-100',
            heading: 'Course Completed!',
            subtext: 'You have successfully finished this course.',
            btnText: 'View Certificate'
        }
    }[type];

    // If score is low (failed quiz), don't show confetti and show different message?
    // But this modal is only called on *success* success based on parent logic.

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 transform transition-all animate-bounce-in text-center border-4 border-white ring-4 ring-primary/10">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className={`w-20 h-20 mx-auto rounded-full ${content.bg} flex items-center justify-center mb-6 shadow-inner`}>
                    <content.icon className={`w-10 h-10 ${content.color}`} />
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {title || content.heading}
                </h2>

                <p className="text-gray-500 mb-8">
                    {content.subtext}
                </p>

                <div className="space-y-3">
                    {onNext && (
                        <button
                            onClick={() => {
                                onNext();
                                onClose();
                            }}
                            className="w-full btn-primary py-3 text-lg font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all transform hover:-translate-y-0.5"
                        >
                            {content.btnText}
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    )}

                    <button
                        onClick={onClose}
                        className="w-full py-3 text-gray-500 hover:text-gray-700 font-medium hover:bg-gray-50 rounded-lg transition-colors"
                    >
                        Stay Here
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CompletionModal;
