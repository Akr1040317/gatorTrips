import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import NavbarComponent from './nav';
import Home from './home';
import Login from './Login';
import Signup from './Signup';
import TripsPage from './TripsPage';
import TripPage from './TripPage';
import { AuthProvider } from './AuthContext';
import ProtectedRoute from './ProtectedRoute';
import './index.css';
import 'bootstrap/dist/css/bootstrap.min.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <NavbarComponent />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/trips" element={<ProtectedRoute element={<TripsPage />} />} />
          <Route path="/trip/:id" element={<ProtectedRoute element={<TripPage />} />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);