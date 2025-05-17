"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    <main className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            Steam Profile Viewer
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Discover and analyze your Steam profile, wishlist, and game library
            with detailed insights and statistics.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                value={steamId}
                onChange={(e) => setSteamId(e.target.value)}
                placeholder="Enter Steam ID or username"
                className="flex-1 p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </div>
                ) : (
                  "View Profile"
                )}
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
              {error}
            </div>
          )}

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold mb-2">Profile Analysis</h3>
              <p className="text-gray-400 text-sm">
                Get detailed insights about your Steam profile, including
                account age, status, and more.
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold mb-2">Wishlist Overview</h3>
              <p className="text-gray-400 text-sm">
                Track your wishlist items with price history, discounts, and
                recommendations.
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold mb-2">Game Library Stats</h3>
              <p className="text-gray-400 text-sm">
                Analyze your game collection with detailed statistics and
                playtime insights.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 text-center text-gray-400 text-sm">
          <p>Enter your Steam ID or username to get started</p>
          <p className="mt-2">
            Don't know your Steam ID?{" "}
            <a
              href="https://steamid.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300"
            >
              Find it here
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
