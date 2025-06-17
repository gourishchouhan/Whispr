"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { io } from "socket.io-client";
import UserSearch from "@/components/UserSearch";
import UserList from "@/components/UserList";
import {
  Send,
  Smile,
  Paperclip,
  MoreVertical,
  Phone,
  Video,
  Search,
  ArrowLeft,
  Users,
  Settings,
  Bell,
} from "lucide-react";

const ChatPage = () => {
  const { user, token, logout, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  // --- State Management ---
  const [isConnected, setIsConnected] = useState(false);
  const [currentMessage, setCurrentMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState({});
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);

  // UI States
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [theme, setTheme] = useState("light");
  const [notificationPermission, setNotificationPermission] = useState(
    "default"
  );

  // --- Refs ---
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // --- Effects ---

  // --- FIX: This is the new, robust protection logic ---
  useEffect(() => {
    // Don't do anything while the auth state is still being determined.
    if (loading) {
      return;
    }
    // Once loading is false, if the user is not authenticated, redirect them.
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, loading, router]);

  // Auto-scrolling for new messages
  useEffect(() => {
    if (!loading && isAuthenticated) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, isAuthenticated]);

  // Check for notification permission on initial load
  useEffect(() => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Main effect for Socket.IO connection management
  useEffect(() => {
    // Only run this effect if the user is authenticated and loading is complete
    if (isAuthenticated && !loading) {
      if (!socketRef.current) {
        const socketUrl =
          process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";
        socketRef.current = io(socketUrl, { auth: { token } });

        socketRef.current.on("connect", () => setIsConnected(true));
        socketRef.current.on("disconnect", () => setIsConnected(false));
        socketRef.current.on("updateOnlineUsers", (userIds) =>
          setOnlineUsers(userIds)
        );
        socketRef.current.on(
          "userTyping",
          ({ userId, username, isTyping }) => {
            setTypingUsers((prev) => {
              if (isTyping) {
                return prev.some((u) => u.userId === userId)
                  ? prev
                  : [...prev, { userId, username }];
              } else {
                return prev.filter((user) => user.userId !== userId);
              }
            });
          }
        );
      }
    }

    // Cleanup on component unmount or when auth status changes
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, loading, token]);

  // Effect for handling incoming messages
  useEffect(() => {
    const socket = socketRef.current;
    if (socket) {
      const handleReceiveMessage = (newMessage) => {
        if (selectedChat && newMessage.sender._id === selectedChat._id) {
          setMessages((prev) => {
            const exists = prev.some((msg) => msg._id === newMessage._id);
            if (exists) return prev;
            return [...prev, newMessage];
          });
          playNotificationSound();
        } else {
          const senderId = newMessage.sender._id;
          setUnreadMessages((prev) => ({
            ...prev,
            [senderId]: (prev[senderId] || 0) + 1,
          }));
          showBrowserNotification(newMessage);
        }
      };
      socket.on("receiveMessage", handleReceiveMessage);
      return () => {
        socket.off("receiveMessage", handleReceiveMessage);
      };
    }
  }, [selectedChat]);

  // Effect for fetching the initial user list
  useEffect(() => {
    if (isAuthenticated && token) {
      const fetchUsers = async () => {
        setUsersLoading(true);
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/users/search`,
            { headers: { Authorization: `Bearer ${token}` } }
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

  // --- All your handlers and utility functions remain the same ---
  // (handleSelectChat, handleSendMessage, etc.)
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
    setMessages([]);
    setMessagesLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/messages/${selectedUser._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const history = await response.json();
      setMessages(history || []);
    } catch (error) {
      console.error("Error fetching message history:", error);
    } finally {
      setMessagesLoading(false);
    }

    setTimeout(() => messageInputRef.current?.focus(), 100);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    const messageContent = currentMessage.trim();
    if (!socketRef.current || !isConnected || !messageContent || !selectedChat)
      return;

    socketRef.current.emit("sendMessage", {
      receiverId: selectedChat._id,
      content: messageContent,
    });

    const optimisticMessage = {
      _id: `temp-${Date.now()}`,
      sender: { _id: user._id, username: user.username },
      receiver: selectedChat._id,
      content: messageContent,
      createdAt: new Date().toISOString(),
      status: "sending",
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setCurrentMessage("");

    if (isTyping) {
      socketRef.current.emit("stopTyping", { receiverId: selectedChat._id });
      setIsTyping(false);
    }
  };

  const handleInputChange = (e) => {
    setCurrentMessage(e.target.value);
    const socket = socketRef.current;

    if (!isTyping && selectedChat && socket) {
      setIsTyping(true);
      socket.emit("startTyping", { receiverId: selectedChat._id });
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping && selectedChat && socket) {
        socket.emit("stopTyping", { receiverId: selectedChat._id });
        setIsTyping(false);
      }
    }, 2000);
  };

  const handleLogout = () => {
    if (socketRef.current) socketRef.current.disconnect();
    logout();
  };

  const handleRequestNotification = async () => {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  const playNotificationSound = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (!audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 800;
    oscillator.type = "sine";
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
  };

  const showBrowserNotification = (message) => {
    if (notificationPermission === "granted") {
      new Notification(`New message from ${message.sender.username}`, {
        body: message.content,
        icon: "/chat-icon.png",
      });
    }
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // --- FIX: This is the new, robust three-stage render logic ---

  // 1. While the AuthProvider is checking localStorage, show a full-page spinner.
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // 2. After loading, if the user is not authenticated, render nothing.
  //    The protection useEffect above will handle the redirection.
  if (!isAuthenticated) {
    return null;
  }

  // 3. Only when loading is complete AND the user is authenticated, render the page.
  return (
    <div
      className={`flex flex-col h-screen ${
        theme === "dark" ? "dark bg-gray-900" : "bg-gray-50"
      }`}
    >
      {/* All your existing JSX for the chat page goes here. */}
      {/* It will only be rendered when it's safe to do so. */}
      <header className="bg-white dark:bg-gray-800 text-gray-800 dark:text-white p-4 flex justify-between items-center shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden mr-2"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Users className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Whispr
          </h1>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div
              className={`h-2 w-2 rounded-full mr-2 ${
                isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
              }`}
              title={isConnected ? "Connected" : "Disconnected"}
            />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {isConnected ? "Online" : "Connecting..."}
            </span>
          </div>

          {notificationPermission === "default" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRequestNotification}
              title="Enable Notifications"
            >
              <Bell className="h-4 w-4" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            title="Toggle Theme"
          >
            <Settings className="h-4 w-4" />
          </Button>

          <Button variant="outline" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <aside
          className={`${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } fixed md:relative md:translate-x-0 z-30 w-80 md:w-80 bg-white dark:bg-gray-800 transition-transform duration-300 ease-in-out flex flex-col h-full border-r border-gray-200 dark:border-gray-700`}
        >
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-lg text-gray-800 dark:text-white">
                Messages
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => setIsSidebarOpen(false)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
            <UserSearch onSelectChat={handleSelectChat} />
          </div>

          <div className="flex-1 overflow-y-auto">
            {usersLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
              </div>
            ) : (
              <UserList
                usersList={usersList}
                handleSelectChat={handleSelectChat}
                selectedChat={selectedChat}
                unreadMessages={unreadMessages}
                onlineUsers={onlineUsers}
              />
            )}
          </div>
        </aside>

        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <section className="flex-1 flex flex-col bg-white dark:bg-gray-900">
          {selectedChat ? (
            <>
              <header className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {selectedChat.username.charAt(0).toUpperCase()}
                      </div>
                      {onlineUsers.includes(selectedChat._id) && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                      )}
                    </div>
                    <div className="ml-3">
                      <h3 className="font-semibold text-gray-800 dark:text-white">
                        {selectedChat.username}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {onlineUsers.includes(selectedChat._id)
                          ? "Online"
                          : "Offline"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Video className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-gray-50 dark:bg-gray-900">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                      <p>
                        No messages yet. Say hello to {selectedChat.username}!
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((msg) => (
                      <div
                        key={msg._id}
                        className={`flex ${
                          msg.sender._id === user?._id
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`p-3 rounded-2xl max-w-[70%] ${
                            msg.sender._id === user?._id
                              ? "bg-indigo-500 text-white rounded-br-md"
                              : "bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-bl-md shadow-sm"
                          } ${
                            msg.status === "sending" ? "opacity-70" : ""
                          }`}
                        >
                          <p className="text-sm leading-relaxed">
                            {msg.content}
                          </p>
                          <p
                            className={`text-xs mt-1 text-right ${
                              msg.sender._id === user?._id
                                ? "text-indigo-100"
                                : "text-gray-500 dark:text-gray-400"
                            }`}
                          >
                            {formatMessageTime(msg.createdAt)}
                            {msg.status === "sending" && (
                              <span className="ml-1">⏳</span>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                    {typingUsers.some(
                      (u) => u.userId === selectedChat._id
                    ) && (
                      <div className="flex justify-start">
                        <div className="bg-gray-200 dark:bg-gray-700 rounded-2xl px-4 py-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div
                              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                              style={{ animationDelay: "0.1s" }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                              style={{ animationDelay: "0.2s" }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <form
                  onSubmit={handleSendMessage}
                  className="flex items-center space-x-3"
                >
                  <Input
                    ref={messageInputRef}
                    type="text"
                    placeholder="Type a message..."
                    value={currentMessage}
                    onChange={handleInputChange}
                    disabled={!isConnected}
                    className="flex-1 pr-10 py-3 rounded-2xl border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  <Button
                    type="submit"
                    disabled={!isConnected || !currentMessage.trim()}
                    className="rounded-full w-12 h-12 flex items-center justify-center bg-indigo-500 hover:bg-indigo-600"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <h3 className="text-xl font-semibold mb-2">
                  Welcome, {user?.username}!
                </h3>
                <p>Select a user from the sidebar to start chatting.</p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default ChatPage;