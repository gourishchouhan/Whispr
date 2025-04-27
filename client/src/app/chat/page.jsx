// src/app/chat/page.jsx
"use client"; // Required for hooks and event handlers

import React, { useEffect } from "react"; // Import useEffect
import { useAuth } from "@/context/AuthContext"; // Import useAuth
import { useRouter } from "next/navigation"; // Import useRouter
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Import Input for message bar

const ChatPage = () => {
  const { user, logout, isAuthenticated, loading } = useAuth(); // Get auth state
  const router = useRouter();

  // Effect to check authentication status and redirect if necessary
  useEffect(() => {
    // Wait until loading is false before checking authentication
    if (!loading) {
      if (!isAuthenticated) {
        console.log("ChatPage: User not authenticated, redirecting to login.");
        router.push("/login");
      } else {
        console.log("ChatPage: User is authenticated:", user);
      }
    }
  }, [isAuthenticated, loading, router, user]); // Added user to dependencies

  const handleLogout = () => {
    logout(); // Call context logout function
  };

  // While loading auth status, show a loading indicator
  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            {/* You can replace this with a ShadCN spinner/skeleton later */}
            <p>Loading authentication...</p>
        </div>
    );
  }

  // If not authenticated (and not loading), return null to prevent rendering
  // before the redirect effect kicks in.
  if (!isAuthenticated) {
      return null;
  }

  // Render the chat page content only if authenticated
  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-gray-800 text-white p-4 flex justify-between items-center shadow-md">
        <h1 className="text-xl font-bold">Whispr Chat</h1>
        <div className="flex items-center">
          {/* Display username from context */}
          <span className="mr-4">Welcome, {user?.username || "User"}!</span>
          <Button variant="destructive" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 grid grid-cols-1 md:grid-cols-4 gap-4 overflow-hidden">
        {/* Sidebar (Users/Friends List) */}
        <aside className="col-span-1 bg-gray-100 p-3 rounded-lg shadow flex flex-col overflow-y-auto">
          <h2 className="font-semibold mb-3 text-lg border-b pb-2">Users</h2>
          {/* User list will go here */}
          <div className="flex-1">
             <p className="text-sm text-gray-500">User list placeholder...</p>
             {/* Example User Item Structure */}
             {/* <div className="p-2 hover:bg-gray-200 rounded cursor-pointer">User 1</div> */}
             {/* <div className="p-2 hover:bg-gray-200 rounded cursor-pointer">User 2</div> */}
          </div>
        </aside>

        {/* Chat Window Area */}
        <section className="col-span-1 md:col-span-3 bg-white p-4 rounded-lg shadow flex flex-col overflow-hidden">
          {/* Chat Header (Optional: Show who you're chatting with) */}
          <div className="border-b pb-2 mb-4">
             <h2 className="font-semibold text-lg">Chat Window</h2>
             {/* <p className="text-sm text-gray-600">Chatting with: [Selected User]</p> */}
          </div>

          {/* Message Display Area */}
          <div className="flex-1 overflow-y-auto mb-4 pr-2">
            {/* Messages will go here */}
            <p className="text-sm text-gray-500">Messages placeholder...</p>
            {/* Example Message Structure */}
            {/* <div className="mb-2 text-right">
                <span className="bg-blue-500 text-white px-3 py-1 rounded-lg inline-block">Your message...</span>
            </div>
            <div className="mb-2 text-left">
                <span className="bg-gray-200 text-gray-800 px-3 py-1 rounded-lg inline-block">Other user's message...</span>
            </div> */}
          </div>

          {/* Message Input Area */}
          <div className="mt-auto flex gap-2">
            <Input
              type="text"
              placeholder="Type your message..."
              className="flex-1 focus:ring-indigo-500"
              // Add state and onChange handler later
            />
            <Button>
              Send
              {/* Add onClick handler later */}
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ChatPage;
