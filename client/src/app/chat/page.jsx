// src/app/chat/page.jsx
"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { io } from "socket.io-client";
import UserSearch from "@/components/UserSearch"; // <-- Part 2: Import UserSearch
import UserList from "@/components/UserList"; // <-- Import UserList

let socketInstance = null;

const ChatPage = () => {
  const { user, token, logout, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);

  const [currentMessage, setCurrentMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState({});
  const [onlineUsers, setOnlineUsers] = useState([]); // <-- Part 3: State for online users

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Effect for Socket Connection and Listeners
  useEffect(() => {
    if (loading) return;

    if (isAuthenticated && token) {
      if (!socketInstance) {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
        const backendUrl = apiUrl.replace("/api", "");
        socketInstance = io(backendUrl, { auth: { token } });

        socketInstance.on("connect", () => setIsConnected(true));
        socketInstance.on("disconnect", () => setIsConnected(false));

        // --- Part 3: Listen for online user updates ---
        socketInstance.on("updateOnlineUsers", (userIds) => {
          console.log("Online users list updated:", userIds);
          setOnlineUsers(userIds);
        });
      }
    } else {
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
      }
      router.push("/login");
    }

    return () => {
      if (socketInstance) {
        socketInstance.off("updateOnlineUsers");
        socketInstance.disconnect();
        socketInstance = null;
      }
    };
  }, [isAuthenticated, token, loading, router]);

  // Effect for handling incoming messages
  useEffect(() => {
    if (socketInstance) {
      socketInstance.off("receiveMessage");
      socketInstance.on("receiveMessage", (newMessage) => {
        if (selectedChat && newMessage.sender._id === selectedChat._id) {
          setMessages((prev) => [...prev, newMessage]);
        } else {
          const senderId = newMessage.sender._id;
          setUnreadMessages((prev) => ({
            ...prev,
            [senderId]: (prev[senderId] || 0) + 1,
          }));
        }
      });
    }
  }, [selectedChat]);

  // Effect to Fetch Default Users List
  useEffect(() => {
    if (isAuthenticated && token) {
      const fetchUsers = async () => {
        setUsersLoading(true);
        try {
          // This now fetches all users for the default list
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/users/search`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
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
    }
  }, [isAuthenticated, token]);

  const handleSelectChat = async (selectedUser) => {
    if (selectedChat?._id === selectedUser._id) return;
    if (unreadMessages[selectedUser._id]) {
      setUnreadMessages((prev) => {
        const newUnread = { ...prev };
        delete newUnread[selectedUser._id];
        return newUnread;
      });
    }
    setSelectedChat(selectedUser);
    setMessagesLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/messages/${selectedUser._id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const history = await response.json();
      setMessages(history || []);
    } catch (error) {
      console.error("Error fetching message history:", error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    const messageContent = currentMessage.trim();
    if (!socketInstance || !isConnected || !messageContent || !selectedChat)
      return;
    const messageData = {
      receiverId: selectedChat._id,
      content: messageContent,
    };
    socketInstance.emit("sendMessage", messageData);
    const optimisticMessage = {
      _id: `temp-${Date.now()}`,
      sender: { _id: user._id, username: user.username },
      receiver: selectedChat._id,
      content: messageContent,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    setCurrentMessage("");
  };

  const handleLogout = () => {
    if (socketInstance) socketInstance.disconnect();
    logout();
  };

  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return null;

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-gray-800 text-white p-4 flex justify-between items-center shadow-md">
        <h1 className="text-xl font-bold">Whispr Chat</h1>
        <div className="flex items-center">
          <span
            className={`mr-2 h-3 w-3 rounded-full ${
              isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
            }`}
            title={isConnected ? "Connected" : "Disconnected"}
          ></span>
          <span className="mr-4">Welcome, {user?.username}!</span>
          <Button variant="destructive" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 grid grid-cols-1 md:grid-cols-4 gap-4 overflow-hidden">
        {/* --- MODIFIED: Sidebar with Search and User List --- */}
        <aside className="col-span-1 bg-gray-100 rounded-lg shadow flex flex-col overflow-y-auto">
          <UserSearch onSelectChat={handleSelectChat} />
          <h2 className="font-semibold text-lg border-b p-3">All Users</h2>
          {usersLoading ? (
            <p className="text-sm text-gray-500 p-2">Loading users...</p>
          ) : (
            <UserList
              usersList={usersList}
              handleSelectChat={handleSelectChat}
              selectedChat={selectedChat}
              unreadMessages={unreadMessages}
              onlineUsers={onlineUsers}
            />
          )}
        </aside>

        {/* Chat Window Area (No changes here) */}
        <section className="col-span-1 md:col-span-3 bg-white p-4 rounded-lg shadow flex flex-col overflow-hidden">
          <div className="border-b pb-2 mb-4">
            <h2 className="font-semibold text-lg">
              {selectedChat
                ? `Chat with ${selectedChat.username}`
                : "Select a user to chat"}
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto mb-4 pr-2 space-y-4">
            {messagesLoading ? (
              <p>Loading messages...</p>
            ) : selectedChat ? (
              messages.length === 0 ? (
                <p>No messages yet. Say hello!</p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg._id}
                    className={`flex ${
                      msg.sender._id === user?._id
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`p-3 rounded-lg max-w-[70%] ${
                        msg.sender._id === user?._id
                          ? "bg-indigo-500 text-white"
                          : "bg-gray-200"
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p className="text-xs opacity-70 mt-1 text-right">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )
            ) : (
              <p>Select a user to start chatting.</p>
            )}
            <div ref={messagesEndRef} />
          </div>
          <form
            onSubmit={handleSendMessage}
            className="mt-auto flex gap-2 border-t pt-4"
          >
            <Input
              type="text"
              placeholder={
                isConnected
                  ? selectedChat
                    ? "Type your message..."
                    : "Select a chat"
                  : "Connecting..."
              }
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              disabled={!isConnected || !selectedChat}
            />
            <Button
              type="submit"
              disabled={
                !isConnected || !currentMessage.trim() || !selectedChat
              }
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