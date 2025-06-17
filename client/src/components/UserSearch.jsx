// src/components/UserSearch.jsx
"use client";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

export default function UserSearch({ onSelectChat }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useAuth();

  // Debounce effect to prevent API calls on every keystroke
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/users/search?q=${searchTerm}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const data = await res.json();
        setResults(data);
      } catch (error) {
        console.error("Failed to search users:", error);
      } finally {
        setIsLoading(false);
      }
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, token]);

  const handleStartChat = (user) => {
    onSelectChat(user);
    setSearchTerm(""); // Clear search after selection
    setResults([]);
  };

  return (
    <div>
      <Input
        placeholder="Search for users..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      {isLoading && <p>Searching...</p>}
      <ul className="mt-2">
        {results.map((user) => (
          <li
            key={user._id}
            className="flex justify-between items-center p-2"
          >
            <span>{user.username}</span>
            <Button onClick={() => handleStartChat(user)}>Chat</Button>
          </li>
        ))}
      </ul>
    </div>
  );
}