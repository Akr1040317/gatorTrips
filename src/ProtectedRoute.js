import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

function ProtectedRoute({ element }) {
  const { currentUser } = useAuth();

  return currentUser ? element : <Navigate to="/" />;
}

export default ProtectedRoute;