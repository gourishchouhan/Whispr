// src/app/chat/page.jsx
"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { io } from "socket.io-client";

// Store socket instance outside component state to prevent re-render loops
let socketInstance = null;

const ChatPage = () => {
  const { user, token, logout, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);

  // State for chat functionality
  const [currentMessage, setCurrentMessage] = useState("");
  const [messages, setMessages] = useState([]);
  // TODO: Replace this with actual state for selected user
  const [selectedChatUserId, setSelectedChatUserId] = useState("placeholder_receiver_id"); // Placeholder

  // Effect for Socket Connection Management
  useEffect(() => {
    if (loading) {
      console.log("ChatPage Socket Effect: Waiting for auth loading...");
      return;
    }

    if (isAuthenticated && token) {
      if (!socketInstance) {
        console.log("ChatPage Socket Effect: Authenticated, attempting connection...");
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
        const backendUrl = apiUrl.replace("/api", "");
        console.log("Connecting to Socket.IO server at:", backendUrl);

        socketInstance = io(backendUrl, { auth: { token } });

        socketInstance.on("connect", () => {
          console.log(`Socket connected: ${socketInstance.id}`);
          setIsConnected(true);
        });

        socketInstance.on("connected", () => {
          console.log("Socket acknowledged connection ('connected' event).");
        });

        socketInstance.on("disconnect", (reason) => {
          console.log(`Socket disconnected: ${reason}`);
          setIsConnected(false);
          socketInstance = null;
          if (reason === "io server disconnect") {
            console.error("Server disconnected socket (auth issue?).");
            logout();
          }
        });

        socketInstance.on("connect_error", (error) => {
          console.error("Socket connection error:", error.message);
          setIsConnected(false);
          socketInstance = null;
          if (error.message.includes("Authentication error")) {
            console.error("Authentication failed during connection.");
            logout();
          }
        });

        socketInstance.on("receiveMessage", (newMessage) => {
          console.log("Message received from socket:", newMessage);
          // TODO: Filter message based on selectedChatUserId
          // For now, just add any received message
          setMessages((prevMessages) => [...prevMessages, newMessage]);
          // TODO: Scroll to bottom
        });

        // TODO: Add listeners for typing indicators
      }
    } else {
      // Not authenticated or no token
      if (socketInstance) {
        console.log("ChatPage Socket Effect: Not authenticated, disconnecting.");
        socketInstance.disconnect();
        socketInstance = null;
        setIsConnected(false);
      }
      console.log("ChatPage Socket Effect: Not authenticated, redirecting.");
      router.push("/login");
    }

    // Cleanup on component unmount
    return () => {
      console.log("ChatPage Socket Effect: Unmount cleanup.");
      if (socketInstance) {
        console.log("Disconnecting socket on unmount.");
        socketInstance.disconnect();
        socketInstance = null;
        setIsConnected(false);
      }
    };
  }, [isAuthenticated, token, loading, router, logout]);


  const handleLogout = () => {
    if (socketInstance) {
      console.log("handleLogout: Disconnecting socket.");
      socketInstance.disconnect();
      socketInstance = null;
      setIsConnected(false);
    }
    logout();
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    const messageContent = currentMessage.trim();

    // Ensure we have required info to send
    if (!socketInstance || !isConnected || !messageContent || !selectedChatUserId || !user) {
      console.warn("Cannot send message. Check connection, message, selection, or user state.", {
          isConnected, messageContent, selectedChatUserId, userExists: !!user
      });
      return;
    }

    console.log(`Sending message to ${selectedChatUserId}: ${messageContent}`);

    const messageData = {
      receiverId: selectedChatUserId,
      content: messageContent,
    };

    // 1. Emit the message to the backend
    socketInstance.emit("sendMessage", messageData);

    // 2. Optimistically update the sender's UI
    const optimisticMessage = {
      _id: `temp-${Date.now()}-${Math.random()}`, // Temporary unique ID
      sender: {
        _id: user._id,
        username: user.username,
      },
      receiver: selectedChatUserId,
      content: messageContent,
      createdAt: new Date().toISOString(),
    };
    setMessages((prevMessages) => [...prevMessages, optimisticMessage]);
    // TODO: Scroll to bottom after adding message

    // 3. Clear the input field
    setCurrentMessage("");
  };


  // --- Render Logic ---
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Prevent rendering before redirect
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-gray-800 text-white p-4 flex justify-between items-center shadow-md">
        <h1 className="text-xl font-bold">Whispr Chat</h1>
        <div className="flex items-center">
          <span className={`mr-2 h-3 w-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} title={isConnected ? 'Connected' : 'Disconnected'}></span>
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
          <div className="flex-1">
             <p className="text-sm text-gray-500">User list placeholder...</p>
             {/* TODO: Fetch and display list of users */}
          </div>
        </aside>

        {/* Chat Window Area */}
        <section className="col-span-1 md:col-span-3 bg-white p-4 rounded-lg shadow flex flex-col overflow-hidden">
          {/* Chat Header */}
          <div className="border-b pb-2 mb-4">
             <h2 className="font-semibold text-lg">Chat Window</h2>
             {/* TODO: Show who you're chatting with */}
             <p className="text-sm text-gray-600">Chatting with: {selectedChatUserId === "placeholder_receiver_id" ? "[Select a user]" : selectedChatUserId}</p>
          </div>

          {/* Message Display Area */}
          <div className="flex-1 overflow-y-auto mb-4 pr-2 space-y-4">
            {messages.length === 0 ? (
                 <p className="text-sm text-gray-400 text-center pt-4">No messages yet. Start chatting!</p>
            ) : (
                messages.map((msg) => (
                    <div key={msg._id} className={`flex ${msg.sender._id === user?._id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`p-3 rounded-lg max-w-[70%] shadow-sm ${msg.sender._id === user?._id ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                           <p className="text-sm">{msg.content}</p>
                           <p className="text-xs opacity-70 mt-1 text-right">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                    </div>
                ))
            )}
            {/* TODO: Add ref and scroll-to-bottom logic */}
          </div>

          {/* Message Input Area */}
          <form onSubmit={handleSendMessage} className="mt-auto flex gap-2 border-t pt-4">
            <Input
              type="text"
              placeholder={isConnected ? "Type your message..." : "Connecting..."}
              className="flex-1 focus:ring-1 focus:ring-indigo-500"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              disabled={!isConnected || selectedChatUserId === "placeholder_receiver_id"} // Also disable if no user selected
            />
            <Button type="submit" disabled={!isConnected || !currentMessage.trim() || selectedChatUserId === "placeholder_receiver_id"}>
              Send
            </Button>
          </form>
        </section>
      </main>
    </div>
  );
};

export default ChatPage;
