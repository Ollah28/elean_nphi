import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCourses } from '@/context/CourseContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { ArrowRight, BookOpen, Users, Award, CheckCircle } from 'lucide-react';

const Home: React.FC = () => {
    const { courses } = useCourses();
    const navigate = useNavigate();

    // Get top 3 featured courses (mock logic: just take first 3)
    const featuredCourses = courses.slice(0, 3);

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Navbar />

            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative overflow-hidden bg-primary text-primary-foreground pt-16 pb-24 lg:pt-32 lg:pb-40">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIvPjwvZz48L2c+PC9zdmc+')] opacity-20" />
                    <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-secondary/30" />

                    <div className="container relative mx-auto px-4">
                        <div className="flex flex-col lg:flex-row items-center gap-12">
                            <div className="flex-1 text-center lg:text-left">
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8 animate-float">
                                    <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                                    <span className="text-sm font-medium">Official NPHI eLearning Portal</span>
                                </div>

                                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight">
                                    Empowering Health <br className="hidden md:block" />
                                    <span className="text-secondary">
                                        Workers Worldwide
                                    </span>
                                </h1>

                                <p className="text-lg md:text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                                    Access quality training, earn CPD points, and advance your healthcare career
                                    with our comprehensive, expert-led courses.
                                </p>

                                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                                    <Link
                                        to="/register"
                                        className="w-full sm:w-auto px-8 py-4 bg-secondary text-secondary-foreground rounded-xl font-bold hover:bg-secondary/90 transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
                                    >
                                        Start Learning Now
                                        <ArrowRight className="w-5 h-5" />
                                    </Link>
                                    <Link
                                        to="/login"
                                        className="w-full sm:w-auto px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl font-semibold hover:bg-white/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        Log In
                                    </Link>
                                </div>
                            </div>

                            <div className="flex-1 relative hidden lg:block">
                                <div className="relative z-10 animate-slide-up">
                                    <img
                                        src="/images/african_nurse_with_laptop.png"
                                        alt="Healthcare Professional Learning"
                                        className="w-full max-w-lg mx-auto object-contain drop-shadow-2xl rounded-2xl"
                                    />
                                    {/* Floating elements for visual interest */}
                                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-secondary/20 rounded-full blur-xl animate-pulse" />
                                    <div className="absolute top-1/2 -left-10 w-32 h-32 bg-primary-foreground/10 rounded-full blur-xl" />

                                    <div className="absolute bottom-10 -left-12 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 shadow-xl animate-float" style={{ animationDelay: '2s' }}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                                                <CheckCircle className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-white">CPD Accredited</p>
                                                <p className="text-xs text-white/70">Verified Certificates</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Stats Section */}
                <section className="py-12 bg-muted/30 border-b border-border">
                    <div className="container mx-auto px-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                            <div className="text-center">
                                <p className="text-3xl md:text-4xl font-bold text-primary mb-1">50+</p>
                                <p className="text-sm text-muted-foreground font-medium">Active Courses</p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl md:text-4xl font-bold text-secondary mb-1">10K+</p>
                                <p className="text-sm text-muted-foreground font-medium">Learners</p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl md:text-4xl font-bold text-primary mb-1">500+</p>
                                <p className="text-sm text-muted-foreground font-medium">CPD Points Awarded</p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl md:text-4xl font-bold text-secondary mb-1">24/7</p>
                                <p className="text-sm text-muted-foreground font-medium">Access Anywhere</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Featured Courses */}
                <section className="py-20 lg:py-24">
                    <div className="container mx-auto px-4">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-12">
                            <div>
                                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                                    Featured Training Programs
                                </h2>
                                <p className="text-lg text-muted-foreground max-w-2xl">
                                    Explore our most popular accredited courses designed for healthcare professionals.
                                </p>
                            </div>
                            <Link
                                to="/courses"
                                className="group flex items-center gap-2 text-primary font-semibold hover:text-primary/80 transition-colors"
                            >
                                View All Courses
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {featuredCourses.map(course => (
                                <div
                                    key={course.id}
                                    onClick={() => navigate(`/courses/${course.id}`)}
                                    className="group bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer"
                                >
                                    <div className="relative aspect-video overflow-hidden bg-muted">
                                        <img
                                            src={course.thumbnail}
                                            alt={course.title}
                                            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute top-4 left-4">
                                            <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-bold text-primary shadow-sm">
                                                {course.category}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-6">
                                        <h3 className="text-xl font-bold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                                            {course.title}
                                        </h3>
                                        <p className="text-muted-foreground text-sm mb-6 line-clamp-2">
                                            {course.description}
                                        </p>

                                        <div className="flex items-center justify-between pt-6 border-t border-border">
                                            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                                <Award className="w-4 h-4 text-secondary" />
                                                <span>{course.cpdPoints} CPD Points</span>
                                            </div>
                                            <span className="text-primary text-sm font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                                Details
                                                <ArrowRight className="w-4 h-4" />
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Why Choose NPHI Section */}
                <section className="py-20 bg-muted/30">
                    <div className="container mx-auto px-4">
                        <div className="max-w-3xl mx-auto text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                                Why learn with NPHI?
                            </h2>
                            <p className="text-lg text-muted-foreground">
                                Our platform is designed to meet the evolving needs of public health professionals in Kenya and beyond.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="bg-card p-8 rounded-2xl border border-border">
                                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                                    <Award className="w-8 h-8 text-primary" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">Accredited Content</h3>
                                <p className="text-muted-foreground">
                                    All courses are verified by subject matter experts and earn you recognized CPD points.
                                </p>
                            </div>
                            <div className="bg-card p-8 rounded-2xl border border-border">
                                <div className="w-14 h-14 bg-secondary/10 rounded-xl flex items-center justify-center mb-6">
                                    <BookOpen className="w-8 h-8 text-secondary" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">Flexible Learning</h3>
                                <p className="text-muted-foreground">
                                    Learn at your own pace, anytime, anywhere, on any device.
                                </p>
                            </div>
                            <div className="bg-card p-8 rounded-2xl border border-border">
                                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                                    <Users className="w-8 h-8 text-primary" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">Community & Support</h3>
                                <p className="text-muted-foreground">
                                    Join a network of thousands of health professionals and get support when you need it.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-24">
                    <div className="container mx-auto px-4">
                        <div className="relative rounded-3xl overflow-hidden bg-primary px-6 py-16 md:px-16 text-center">
                            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIvPjwvZz48L2c+PC9zdmc+')] opacity-20" />
                            <div className="relative z-10 max-w-2xl mx-auto">
                                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                                    Ready to advance your career?
                                </h2>
                                <p className="text-white/80 text-lg mb-8">
                                    Join thousands of healthcare professionals already learning on NPHI. Registration is free and takes less than a minute.
                                </p>
                                <Link
                                    to="/register"
                                    className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary rounded-xl font-bold hover:bg-white/90 transition-all shadow-lg transform hover:scale-105"
                                >
                                    Create Free Account
                                    <ArrowRight className="w-5 h-5" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default Home;
