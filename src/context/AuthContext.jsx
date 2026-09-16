import React, { createContext, useState, useEffect } from 'react';
import { parseApiResponse } from '../utils/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      try {
        const payloadStr = token.split('.')[1];
        if (!payloadStr) throw new Error('Invalid token format');

        const normalized = payloadStr.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
        
        // Decode base64 and handle UTF-8 properly (for Thai characters)
        const base64Decoded = atob(padded);
        const uint8Array = new Uint8Array(base64Decoded.split('').map(c => c.charCodeAt(0)));
        const decodedPayload = new TextDecoder().decode(uint8Array);
        const payload = JSON.parse(decodedPayload);

        setUser({
          id: payload.userId || payload.id,
          name: payload.name,
          studentId: payload.studentId,
          email: payload.email,
          role: payload.role || 'user'
        });
      } catch (e) {
        console.error('Invalid token', e);
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
      }
    } else {
      localStorage.removeItem('token');
      setUser(null);
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await parseApiResponse(res);

    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const register = async (name, studentId, email, password) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, studentId, email, password })
    });

    return parseApiResponse(res);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
