import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const Register: React.FC = () => {
  const location = useLocation();

  // Redirect to home and open the register modal
  return <Navigate to="/" state={{ from: location, openLogin: true, view: 'register' }} replace />;
};

export default Register;
