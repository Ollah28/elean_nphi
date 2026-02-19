import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { User as UserIcon, Lock, Eye, EyeOff, AlertCircle, X, Mail } from 'lucide-react';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialView?: 'login' | 'register';
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, initialView = 'login' }) => {
    const [view, setView] = useState<'login' | 'register' | 'forgot-password'>(initialView);
    const [name, setName] = useState('');
    const [username, setUsername] = useState(''); // Used as email for login
    const [email, setEmail] = useState(''); // Used for register/forgot-password
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const { login, register } = useAuth();
    const navigate = useNavigate();

    // Reset state when modal opens or view changes
    useEffect(() => {
        if (isOpen) {
            setView(initialView);
            resetForm();
        }
    }, [isOpen, initialView]);

    const resetForm = () => {
        setError('');
        setSuccessMessage('');
        setName('');
        setUsername('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
    };

    const validateRegister = (): boolean => {
        if (name.trim().length < 2) {
            setError('Name must be at least 2 characters');
            return false;
        }
        if (!email.includes('@') || !email.includes('.')) {
            setError('Please enter a valid email address');
            return false;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return false;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (view === 'login') {
                const result = await login(username, password);
                if (result.success) {
                    onClose();
                    navigate(result.redirectPath, { replace: true });
                } else {
                    setError('Invalid username or password');
                }
            } else if (view === 'register') {
                if (!validateRegister()) {
                    setIsLoading(false);
                    return;
                }
                const result = await register(name.trim(), email.trim().toLowerCase(), password);
                if (result.success) {
                    setSuccessMessage(result.message || 'Registration successful! Please check your email.');
                } else {
                    setError(result.error || 'Registration failed');
                }
            } else if (view === 'forgot-password') {
                // Call forgot password API
                // Since context doesn't have forgotPassword, we'll fetch directly or add to context.
                // Ideally add to Context, but for speed, let's direct fetch here.
                // Actually, let's use a simple fetch since context changes are broad.
                const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/auth/forgot-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email.trim().toLowerCase() }),
                });

                // Always show success message for security
                setSuccessMessage('If an account exists with this email, you will receive a password reset link shortly.');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    if (successMessage) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center pt-4 sm:pt-0">
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
                <div className="relative w-full max-w-md bg-background p-8 rounded-2xl shadow-2xl border border-border animate-slide-up mx-4 text-center">
                    <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                        <X className="w-6 h-6" />
                    </button>
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Mail className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold mb-4">
                        {view === 'forgot-password' ? 'Reset Email Sent' : 'Check Your Email'}
                    </h2>
                    <p className="text-muted-foreground mb-8">{successMessage}</p>
                    <button
                        onClick={() => {
                            setSuccessMessage('');
                            setView('login');
                        }}
                        className="btn-primary w-full py-3 block"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    // Determine title text
    let title = 'Welcome Back';
    let subtitle = 'Sign in to your account';
    if (view === 'register') {
        title = 'Create Account';
        subtitle = 'Join as a learner today';
    } else if (view === 'forgot-password') {
        title = 'Reset Password';
        subtitle = 'Enter your email to receive a reset link';
    }

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 sm:items-center sm:pt-0 overflow-y-auto">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative w-full max-w-md bg-background p-8 rounded-2xl shadow-2xl border border-border animate-slide-down mx-4 my-8">
                <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-6 h-6" />
                </button>

                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
                        <UserIcon className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">{title}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm animate-shake">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    {view === 'register' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Full Name</label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="input-field pl-10"
                                    placeholder="Enter full name"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {view !== 'forgot-password' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                                {view === 'login' ? 'Username or Email' : 'Email Address'}
                            </label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                {view === 'login' ? (
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="input-field pl-10"
                                        placeholder="Enter username"
                                        required
                                    />
                                ) : (
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="input-field pl-10"
                                        placeholder="Enter email"
                                        required
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {view === 'forgot-password' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Email Address</label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input-field pl-10"
                                    placeholder="Enter your registered email"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {view !== 'forgot-password' && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-foreground">Password</label>
                                {view === 'login' && (
                                    <button
                                        type="button"
                                        onClick={() => setView('forgot-password')}
                                        className="text-xs text-primary hover:underline focus:outline-none"
                                    >
                                        Forgot password?
                                    </button>
                                )}
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-field pl-10 pr-10"
                                    placeholder="Enter password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    )}

                    {view === 'register' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="input-field pl-10"
                                    placeholder="Confirm password"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full btn-primary py-2.5 flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Processing...</span>
                            </>
                        ) : (
                            view === 'login' ? 'Sign In' : (view === 'register' ? 'Create Account' : 'Send Reset Link')
                        )}
                    </button>
                </form>



                <p className="mt-6 text-center text-sm text-muted-foreground">
                    {view === 'login' ? "Don't have an account? " : (view === 'register' ? "Already have an account? " : "Remember your password? ")}
                    <button
                        onClick={() => {
                            setError('');
                            if (view === 'forgot-password') setView('login');
                            else setView(view === 'login' ? 'register' : 'login');
                        }}
                        className="text-primary font-medium hover:underline"
                    >
                        {view === 'login' ? 'Register' : 'Login'}
                    </button>
                </p>
            </div>
        </div >
    );
};

export default LoginModal;
