import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { tokenStore } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const AuthSuccess = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth(); // We might need to fetch user if not present, but simple page reload or app mount handles it.

    useEffect(() => {
        const accessToken = searchParams.get("accessToken");
        const refreshToken = searchParams.get("refreshToken");

        if (accessToken && refreshToken) {
            tokenStore.set(accessToken, refreshToken);
            // We need to reload or re-fetch user. 
            // easiest is to redirect to a page that will trigger auth check or just reload window
            window.location.href = "/dashboard";
        } else {
            navigate("/login");
        }
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h2 className="text-xl font-semibold text-gray-900">Authenticating...</h2>
                <p className="text-gray-500">Please wait while we log you in.</p>
            </div>
        </div>
    );
};

export default AuthSuccess;
