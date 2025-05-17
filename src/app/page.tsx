"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
// import Image from "next/image"; // Import Image if you want to add images to the right side

export default function Home() {
  const [steamId, setSteamId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let finalSteamId = steamId;

      // Check if input is a Steam ID (17 digits)
      if (!/^\d{17}$/.test(steamId)) {
        // If not a Steam ID, try to resolve it as a username
        const resolveResponse = await fetch(
          `/api/steam/resolve?username=${encodeURIComponent(steamId)}`
        );
        const resolveData = await resolveResponse.json();

        if (!resolveResponse.ok) {
          throw new Error(
            resolveData.error || "Could not resolve username to Steam ID"
          );
        }

        finalSteamId = resolveData.steamId;
      }

      // Navigate to results page with the resolved Steam ID
      router.push(`/result/${finalSteamId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-200 flex items-center justify-center p-4">
      {/* Add font-sans for a general sans-serif font stack (often includes Helvetica). */}
      {/* For a specific Helvetica font, configure it in tailwind.config.js and apply the class. */}
      <div className="relative bg-white rounded-xl shadow-2xl overflow-hidden w-full h-[90vh] md:h-[95vh] grid grid-cols-1 md:grid-cols-2 font-sans">
        {/* Left Column (Form) */}
        <div className="p-8 md:p-12 flex flex-col justify-center">
          <div className="mb-8">
            {/* Add your brand logo here if you have one */}
            {/* <Image src="/logo.svg" alt="Brand Logo" width={40} height={40} /> */}
            <div className="w-10 h-10 bg-blue-600 rounded-lg mb-4" />{" "}
            {/* Placeholder Logo */}
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              Get Started
            </h2>
            <p className="text-gray-600 text-sm">
              Enter a Steam ID or username to view profile details.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="steamId"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Steam ID or Username
              </label>
              <input
                type="text"
                id="steamId"
                value={steamId}
                onChange={(e) => setSteamId(e.target.value)}
                placeholder="e.g., 76561198xxxxxxxxx or butchassup"
                className="w-full p-3 border text-gray-700 border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors font-medium"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Loading...
                </div>
              ) : (
                "View Profile"
              )}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3 text-red-700 bg-red-100 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="mt-6 text-center text-sm text-gray-600">
            Don&apos;t know your Steam ID?{" "}
            <a
              href="https://steamid.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Find it here
            </a>
          </div>
        </div>

        {/* Right Column (Branding/Marketing) */}
        <div className="relative bg-gradient-to-br from-blue-700 to-blue-900 p-8 md:p-12 text-white flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-4">
              Analyze Your Steam Presence
            </h2>
            <p className="text-lg text-gray-300 mb-8">
              Get insights into your profile, wishlist, and game library.
            </p>
            {/* You could add graphics or other visual elements here */}
            {/* For example, a simplified representation of game cards or charts */}
            <div className="flex justify-center items-center gap-4">
              <div className="w-16 h-24 bg-white/10 rounded-lg" />
              <div className="w-20 h-28 bg-white/20 rounded-lg" />
              <div className="w-16 h-24 bg-white/10 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
