// src/context/AuthContext.jsx
"use client"; // Context needs to be client-side

import React, { createContext, useState, useContext, useEffect } from "react";
import { useRouter } from "next/navigation";

// Create the context
const AuthContext = createContext(null);

// Create the provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Store user object (_id, username, email)
  const [token, setToken] = useState(null); // Store JWT token
  const [loading, setLoading] = useState(true); // Loading state to check initial auth status
  const router = useRouter();

  // Check localStorage for token on initial load
  useEffect(() => {
    console.log("AuthProvider: Checking initial auth status...");
    const storedToken = localStorage.getItem("whisprToken");
    const storedUser = localStorage.getItem("whisprUser");

    if (storedToken && storedUser) {
      console.log("AuthProvider: Found token and user in localStorage.");
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("AuthProvider: Error parsing stored user data", error);
        // Clear invalid data if parsing fails
        localStorage.removeItem("whisprToken");
        localStorage.removeItem("whisprUser");
      }
    } else {
        console.log("AuthProvider: No token/user found in localStorage.");
    }
    setLoading(false); // Finished initial check
  }, []);

  // Login function
  const login = (userData, userToken) => {
    console.log("AuthProvider: Logging in user...", userData);
    localStorage.setItem("whisprToken", userToken);
    localStorage.setItem("whisprUser", JSON.stringify(userData));
    setUser(userData);
    setToken(userToken);
    router.push("/chat"); // Redirect to chat after login
  };

  // Logout function
  const logout = () => {
    console.log("AuthProvider: Logging out user...");
    localStorage.removeItem("whisprToken");
    localStorage.removeItem("whisprUser");
    setUser(null);
    setToken(null);
    router.push("/login"); // Redirect to login after logout
  };

  // Value provided by the context
  const value = {
    user,
    token,
    isAuthenticated: !!token, // Boolean flag: true if token exists
    loading, // Expose loading state
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
