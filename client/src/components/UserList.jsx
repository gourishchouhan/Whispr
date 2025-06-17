// src/components/UserList.jsx
"use client";

import React from "react";

const UserList = ({
  usersList,
  handleSelectChat,
  selectedChat,
  unreadMessages,
  onlineUsers, // <-- New prop for online status
}) => {
  return (
    <div className="flex-1 space-y-1 p-2">
      {usersList.length > 0 ? (
        usersList.map((u) => {
          const isOnline = onlineUsers.includes(u._id);
          return (
            <div
              key={u._id}
              onClick={() => handleSelectChat(u)}
              className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-gray-200 ${
                selectedChat?._id === u._id
                  ? "bg-indigo-100 font-semibold"
                  : ""
              }`}
            >
              <div className="flex items-center">
                <span
                  className={`h-2.5 w-2.5 rounded-full mr-2 ${
                    isOnline ? "bg-green-500" : "bg-gray-400"
                  }`}
                  title={isOnline ? "Online" : "Offline"}
                ></span>
                <span>{u.username}</span>
              </div>
              {unreadMessages[u._id] > 0 && (
                <span className="bg-indigo-600 text-white text-xs font-bold rounded-full px-2 py-1">
                  {unreadMessages[u._id]}
                </span>
              )}
            </div>
          );
        })
      ) : (
        <p className="text-sm text-gray-500 p-2">No other users found.</p>
      )}
    </div>
  );
};

export default UserList;