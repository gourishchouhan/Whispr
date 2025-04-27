// src/app/register/page.jsx
"use client";

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
import { useRouter } from "next/navigation"; // Import useRouter

const RegisterPage = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter(); // Initialize router

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    // Basic client-side validation
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return; // Stop submission if validation fails
    }
    setLoading(true); // Set loading only after validation passes

    console.log("Attempting registration with:", { username, email, password });
    const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/auth/register`;
    console.log("API URL:", apiUrl); // For debugging

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      console.log("Registration successful:", data);

      // Optional: Store token immediately after registration?
      // Or just redirect to login? Let's redirect to login for now.
      // if (data.token) {
      //   localStorage.setItem("whisprToken", data.token);
      //   localStorage.setItem("whisprUser", JSON.stringify({ ... }));
      // }

      // --- Redirect to login page after successful registration ---
      router.push("/login?registered=true"); // Redirect to login, maybe add query param

    } catch (err) {
      console.error("Registration fetch error:", err);
      setError(err.message ? err.message.toString() : 'An unknown error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  // ... rest of the component (return statement) remains the same ...
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>
            Enter your details to register for Whispr.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister}>
            {error && (
              <p className="mb-4 text-center text-sm text-red-600">{error}</p>
            )}
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
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
                  placeholder="Create a password (min. 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>
            </div>
            <Button type="submit" className="w-full mt-6" disabled={loading}>
              {loading ? "Registering..." : "Register"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center text-sm">
          <p>
            Already have an account?&nbsp;
            <Link href="/login" className="text-indigo-600 hover:underline">
              Login here
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default RegisterPage;
