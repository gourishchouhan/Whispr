// src/app/chat/page.jsx
"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { io } from "socket.io-client";

// Store socket instance outside component state
let socketInstance = null;

const ChatPage = () => {
  // Destructure directly from useAuth
  const { user, token, logout, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);

  // State for chat functionality
  const [currentMessage, setCurrentMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null); // Stores selected user object { _id, username, ... }
  const [usersLoading, setUsersLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Effect for Socket Connection Management
  useEffect(() => {
    if (loading) return; // Wait for auth loading

    if (isAuthenticated && token) {
      if (!socketInstance) {
        console.log("ChatPage Socket Effect: Authenticated, connecting...");
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
        const backendUrl = apiUrl.replace("/api", "");
        socketInstance = io(backendUrl, { auth: { token } });

        socketInstance.on("connect", () => setIsConnected(true));
        socketInstance.on("connected", () => console.log("Socket connection acknowledged by server."));
        socketInstance.on("disconnect", (reason) => {
          console.log(`Socket disconnected: ${reason}`);
          setIsConnected(false);
          socketInstance = null;
          if (reason === "io server disconnect") { logout(); }
        });
        socketInstance.on("connect_error", (error) => {
          console.error("Socket connection error:", error.message);
          setIsConnected(false);
          socketInstance = null;
          if (error.message.includes("Authentication error")) { logout(); }
        });

        // Setup receiveMessage listener (will be updated below if selectedChat changes)
        socketInstance.on("receiveMessage", (newMessage) => {
            // Logic to handle message will depend on selectedChat state
            // We'll refine this listener setup based on selectedChat changes
            console.log("Initial receiveMessage listener setup.");
        });
      }
    } else {
      // Not authenticated
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
        setIsConnected(false);
      }
      console.log("ChatPage Socket Effect: Not authenticated, redirecting.");
      router.push("/login");
    }

    // Cleanup on component unmount
    return () => {
      if (socketInstance) {
        console.log("ChatPage Socket Effect: Unmount cleanup - disconnecting socket.");
        socketInstance.off("receiveMessage"); // Clean up specific listener
        socketInstance.disconnect();
        socketInstance = null;
        setIsConnected(false);
      }
    };
  }, [isAuthenticated, token, loading, router, logout]); // Initial connection effect

  // Effect to update socket listener when selectedChat changes
   useEffect(() => {
    if (socketInstance) {
        // Remove previous listener to avoid duplicates
        socketInstance.off("receiveMessage");

        // Add new listener with current selectedChat context
        socketInstance.on("receiveMessage", (newMessage) => {
            console.log("Message received from socket:", newMessage);
            // Add message only if it's part of the currently selected chat
            // Check if selectedChat exists and the sender is the selected user
            if (selectedChat && newMessage.sender._id === selectedChat._id) {
                console.log("Adding received message to current chat.");
                setMessages((prevMessages) => [...prevMessages, newMessage]);
                // TODO: Scroll to bottom
            } else {
                console.log("Received message is not for the currently selected chat.");
                // Optional: Show a notification for messages from other chats
            }
        });
        console.log("receiveMessage listener updated for selectedChat:", selectedChat?._id);
    }
    // This effect depends on selectedChat to correctly scope the listener
   }, [selectedChat]);


  // Effect to Fetch Users List
  useEffect(() => {
    if (isAuthenticated && token) {
      const fetchUsers = async () => {
        setUsersLoading(true);
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!response.ok) throw new Error("Failed to fetch users");
          const data = await response.json();
          setUsersList(data || []);
        } catch (error) {
          console.error("Error fetching users:", error);
        } finally {
          setUsersLoading(false);
        }
      };
      fetchUsers();
    } else {
      setUsersList([]); // Clear list if not authenticated
    }
  }, [isAuthenticated, token]); // Re-fetch if auth state changes

  // Function to Handle Chat Selection
  const handleSelectChat = async (selectedUser) => {
    if (selectedChat?._id === selectedUser._id) return; // Avoid re-selecting same user

    console.log("Selected chat with:", selectedUser.username);
    setSelectedChat(selectedUser);
    setMessages([]); // Clear previous messages
    setMessagesLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/messages/${selectedUser._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch message history");
      const history = await response.json();
      setMessages(history || []);
    } catch (error) {
      console.error("Error fetching message history:", error);
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  // Function to Handle Sending Message
  const handleSendMessage = (e) => {
    e.preventDefault();
    const messageContent = currentMessage.trim();

    if (!selectedChat) {
      console.warn("Cannot send message: No chat selected.");
      return;
    }
    const receiverId = selectedChat._id;

    if (!socketInstance || !isConnected || !messageContent || !receiverId || !user) {
      console.warn("Cannot send message. Check state.", { isConnected, messageContent, receiverId, userExists: !!user });
      return;
    }

    const messageData = { receiverId, content: messageContent };
    socketInstance.emit("sendMessage", messageData);

    const optimisticMessage = {
      _id: `temp-${Date.now()}-${Math.random()}`,
      sender: { _id: user._id, username: user.username },
      receiver: receiverId,
      content: messageContent,
      createdAt: new Date().toISOString(),
    };
    setMessages((prevMessages) => [...prevMessages, optimisticMessage]);
    // TODO: Scroll to bottom

    setCurrentMessage("");
  };

  // Function to Handle Logout
  const handleLogout = () => {
    if (socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
      setIsConnected(false);
    }
    logout();
  };

  // --- Render Logic ---
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><p>Loading authentication...</p></div>;
  }

  if (!isAuthenticated) {
    // Redirect is handled by the effect, return null to avoid render flicker
    return null;
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-gray-800 text-white p-4 flex justify-between items-center shadow-md">
        <h1 className="text-xl font-bold">Whispr Chat</h1>
        <div className="flex items-center">
          <span className={`mr-2 h-3 w-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} title={isConnected ? 'Connected' : 'Disconnected'}></span>
          <span className="mr-4">Welcome, {user?.username || "User"}!</span>
          <Button variant="destructive" size="sm" onClick={handleLogout}>Logout</Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 grid grid-cols-1 md:grid-cols-4 gap-4 overflow-hidden">
        {/* Sidebar (Users List) */}
        <aside className="col-span-1 bg-gray-100 p-3 rounded-lg shadow flex flex-col overflow-y-auto">
          <h2 className="font-semibold mb-3 text-lg border-b pb-2">Users</h2>
          <div className="flex-1 space-y-1">
            {usersLoading ? (
              <p className="text-sm text-gray-500">Loading users...</p>
            ) : usersList.length > 0 ? (
              usersList.map((u) => (
                <div
                  key={u._id}
                  onClick={() => handleSelectChat(u)}
                  className={`p-2 rounded cursor-pointer hover:bg-gray-200 ${selectedChat?._id === u._id ? 'bg-indigo-100 font-semibold' : ''}`}
                >
                  {u.username}
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No other users found.</p>
            )}
          </div>
        </aside>

        {/* Chat Window Area */}
        <section className="col-span-1 md:col-span-3 bg-white p-4 rounded-lg shadow flex flex-col overflow-hidden">
          {/* Chat Header */}
          <div className="border-b pb-2 mb-4">
             <h2 className="font-semibold text-lg">
                {selectedChat ? `Chat with ${selectedChat.username}` : "Select a user to chat"}
             </h2>
          </div>

          {/* Message Display Area */}
          <div className="flex-1 overflow-y-auto mb-4 pr-2 space-y-4">
            {messagesLoading ? (
                <p className="text-sm text-gray-400 text-center pt-4">Loading messages...</p>
            ) : selectedChat ? (
                messages.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center pt-4">No messages yet. Say hello!</p>
                ) : (
                    messages.map((msg) => (
                        <div key={msg._id} className={`flex ${msg.sender._id === user?._id ? 'justify-end' : 'justify-start'}`}>
                            <div className={`p-3 rounded-lg max-w-[70%] shadow-sm ${msg.sender._id === user?._id ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                               <p className="text-sm">{msg.content}</p>
                               <p className="text-xs opacity-70 mt-1 text-right">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                        </div>
                    ))
                )
            ) : (
                <p className="text-sm text-gray-400 text-center pt-4">Select a user from the list to start chatting.</p>
            )}
            {/* TODO: Add ref and scroll-to-bottom logic */}
          </div>

          {/* Message Input Area */}
          <form onSubmit={handleSendMessage} className="mt-auto flex gap-2 border-t pt-4">
            <Input
              type="text"
              placeholder={isConnected ? (selectedChat ? "Type your message..." : "Select a chat") : "Connecting..."}
              className="flex-1 focus:ring-1 focus:ring-indigo-500"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              disabled={!isConnected || !selectedChat} // Input enabled only if connected and a chat is selected
            />
            <Button type="submit"
              disabled={!isConnected || !currentMessage.trim() || !selectedChat} // Button enabled only if connected, message exists, and chat selected
            >
              Send
            </Button>
          </form>
        </section>
      </main>
    </div>
  );
};

export default ChatPage;
