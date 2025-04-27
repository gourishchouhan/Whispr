// src/app/login/page.jsx
"use client"; // Required for useState and onClick handlers

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext"; // Import useAuth hook

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const auth = useAuth(); // Get auth context methods

  // Redirect if already logged in (optional but good UX)
  // Note: This might cause a flash if loading state isn't handled perfectly
  // useEffect(() => {
  //   if (!auth.loading && auth.isAuthenticated) {
  //     router.push('/chat');
  //   }
  // }, [auth.isAuthenticated, auth.loading, router]);


  const handleLogin = async (e) => {
    e.preventDefault(); // Prevent default form submission
    setError(""); // Clear previous errors
    setLoading(true); // Set loading state

    console.log("Attempting login with:", { email, password });
    const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/auth/login`;
    console.log("API URL:", apiUrl); // For debugging

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json(); // Attempt to parse JSON regardless of status

      if (!response.ok) {
        // Use message from backend response if available, otherwise generic error
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      console.log("Login successful via API:", data);

      // --- Use AuthContext to login ---
      if (data.token && data._id && data.username && data.email) {
         const userData = { // Prepare user object for context
            _id: data._id,
            username: data.username,
            email: data.email
         };
         auth.login(userData, data.token); // Call context login function
         // Redirection is now handled inside auth.login() in AuthContext
      } else {
        // Handle cases where backend response might be missing expected fields
        console.error("Login response missing required fields:", data);
        throw new Error("Login successful, but received incomplete user data or token.");
      }

    } catch (err) {
      console.error("Login fetch error:", err);
      // Ensure err.message is a string
      setError(err.message ? err.message.toString() : 'An unknown error occurred during login.');
      setLoading(false); // Ensure loading is reset on error
    }
    // No need for finally { setLoading(false) } here if redirection happens on success
    // setLoading(false) is called only in the catch block now.
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Login to Whispr</CardTitle>
          <CardDescription>
            Enter your email and password to access your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            {error && (
              <p className="mb-4 text-center text-sm text-red-600">{error}</p>
            )}
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>
            <Button type="submit" className="w-full mt-6" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center text-sm">
          <p>
            Don't have an account?&nbsp;
            <Link href="/register" className="text-indigo-600 hover:underline">
              Register here
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginPage;
