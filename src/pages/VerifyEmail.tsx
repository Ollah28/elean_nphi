import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api, tokenStore } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const VerifyEmail: React.FC = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const { updateUser } = useAuth(); // Actually we might just need to reload user or nothing.

    // We can't really use "updateUser" here because we aren't logged in yet maybe.
    // But verify endpoint returns tokens.

    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [message, setMessage] = useState('Verifying your email...');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Invalid verification link.');
            return;
        }

        const verify = async () => {
            try {
                const { data } = await api.post('/auth/verify-email', { token });
                tokenStore.set(data.accessToken, data.refreshToken);
                setStatus('success');
                setMessage('Email verified successfully! Redirecting...');
                setTimeout(() => {
                    navigate('/learner-dashboard');
                    window.location.reload(); // Reload to ensure AuthContext picks up the new token
                }, 2000);
            } catch (error: any) {
                setStatus('error');
                setMessage(error?.response?.data?.message || 'Verification failed. Token may be invalid or expired.');
            }
        };

        verify();
    }, [token, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="bg-card w-full max-w-md p-8 rounded-2xl shadow-lg border border-border text-center">
                {status === 'verifying' && (
                    <div className="flex flex-col items-center">
                        <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Verifying Email</h2>
                        <p className="text-muted-foreground">{message}</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center animate-slide-up">
                        <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Verified!</h2>
                        <p className="text-muted-foreground mb-4">{message}</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center animate-slide-up">
                        <XCircle className="w-16 h-16 text-destructive mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Verification Failed</h2>
                        <p className="text-muted-foreground mb-6">{message}</p>
                        <Link to="/login" className="btn-primary w-full max-w-xs">
                            Return to Login
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VerifyEmail;
