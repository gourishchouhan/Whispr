// src/app/page.js
import Link from "next/link"; // Keep the Link component import

export default function Home() {
  return (
    // Apply Tailwind classes for layout and styling
    <main className="flex min-h-screen flex-col items-center justify-center p-10">
      <h1 className="text-3xl font-bold mb-4">Welcome to Whispr!</h1>
      <p className="mb-6">Your simple chat application.</p>
      <nav>
        <ul className="space-y-2">
          {" "}
          {/* Use space-y for vertical spacing */}
          <li>
            <Link href="/login" className="text-blue-600 hover:underline">
              Go to Login
            </Link>
          </li>
          <li>
            <Link href="/register" className="text-blue-600 hover:underline">
              Go to Register
            </Link>
          </li>
        </ul>
      </nav>
    </main>
  );
}
