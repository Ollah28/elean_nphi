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
    const [view, setView] = useState<'login' | 'register'>(initialView);
    const [name, setName] = useState('');
    const [username, setUsername] = useState(''); // Used as email for login
    const [email, setEmail] = useState(''); // Used for register
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
            } else {
                if (!validateRegister()) {
                    setIsLoading(false);
                    return;
                }
                const result = await register(name.trim(), email.trim().toLowerCase(), password);
                if (result.success) {
                    setSuccessMessage(result.message || 'Registration successful! Please check your email.');
                    // Don't close immediately, show success message
                } else {
                    setError(result.error || 'Registration failed');
                }
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
                    <h2 className="text-2xl font-bold mb-4">Check Your Email</h2>
                    <p className="text-muted-foreground mb-8">{successMessage}</p>
                    <button
                        onClick={() => {
                            setSuccessMessage('');
                            setView('login');
                        }}
                        className="btn-primary w-full py-3 block"
                    >
                        Proceed to Login
                    </button>
                </div>
            </div>
        );
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
                        {view === 'login' ? <UserIcon className="w-6 h-6" /> : <UserIcon className="w-6 h-6" />}
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">
                        {view === 'login' ? 'Welcome Back' : 'Create Account'}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        {view === 'login' ? 'Sign in to your account' : 'Join as a learner today'}
                    </p>
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

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-foreground">Password</label>
                            {view === 'login' && <a href="#" className="text-xs text-primary hover:underline">Forgot password?</a>}
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
                                <span>{view === 'login' ? 'Signing in...' : 'Creating Account...'}</span>
                            </>
                        ) : (
                            view === 'login' ? 'Sign In' : 'Create Account'
                        )}
                    </button>
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => window.location.href = "http://localhost:3001/auth/google"}
                    className="w-full py-2.5 flex items-center justify-center gap-2 border border-input rounded-lg hover:bg-muted/50 transition-colors text-sm font-medium"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                        />
                        <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                        />
                        <path
                            d="M5.84 14.12c-.22-.66-.35-1.36-.35-2.12s.13-1.46.35-2.12V7.04H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.96l2.66-2.84z"
                            fill="#FBBC05"
                        />
                        <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84c.87-2.6 3.3-4.5 6.16-4.5z"
                            fill="#EA4335"
                        />
                    </svg>
                    {view === 'login' ? 'Sign in with Google' : 'Sign up with Google'}
                </button>

                <p className="mt-6 text-center text-sm text-muted-foreground">
                    {view === 'login' ? "Don't have an account? " : "Already have an account? "}
                    <button
                        onClick={() => {
                            setError('');
                            setView(view === 'login' ? 'register' : 'login');
                        }}
                        className="text-primary font-medium hover:underline"
                    >
                        {view === 'login' ? 'Register' : 'Login'}
                    </button>
                </p>
            </div>
        </div>
    );
};

export default LoginModal;
