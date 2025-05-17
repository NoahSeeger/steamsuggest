"use client";

import { useState } from "react";
import Image from "next/image";

interface WishlistItem {
  appid: number;
  priority: number;
  date_added: string;
}

interface Profile {
  steamid: string;
  personaname: string;
  avatar: string;
  realname: string;
  country: string;
  timecreated: number;
  lastlogoff: number;
}

interface OwnedGame {
  appid: number;
  name: string;
  playtime_forever: number;
  img_icon_url: string;
  has_community_visible_stats: boolean;
}

export default function Home() {
  const [steamId, setSteamId] = useState("");
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ownedGames, setOwnedGames] = useState<OwnedGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"wishlist" | "games">("wishlist");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Fetch wishlist
      const wishlistResponse = await fetch(`/api/steam?steamId=${steamId}`);
      const wishlistData = await wishlistResponse.json();

      if (!wishlistResponse.ok) {
        throw new Error(wishlistData.error || "Failed to fetch wishlist");
      }

      setWishlist(wishlistData.wishlist || []);

      // Fetch profile and owned games
      const profileResponse = await fetch(
        `/api/steam/profile?steamId=${steamId}`
      );
      const profileData = await profileResponse.json();

      if (!profileResponse.ok) {
        throw new Error(profileData.error || "Failed to fetch profile");
      }

      setProfile(profileData.profile);
      setOwnedGames(profileData.ownedGames);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Steam Profile Viewer
          </h1>
          <p className="text-lg text-gray-600">
            View your Steam profile, wishlist, and game library
          </p>
        </div>

        <form onSubmit={handleSubmit} className="max-w-xl mx-auto mb-12">
          <div className="flex gap-4">
            <input
              type="text"
              defaultValue="76561198240690266"
              value={steamId}
              onChange={(e) => setSteamId(e.target.value)}
              placeholder="Enter Steam ID (e.g., 76561198xxxxxxxxx)"
              className="flex-1 p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors font-medium"
            >
              {loading ? "Loading..." : "Search"}
            </button>
          </div>
        </form>

        {error && (
          <div className="max-w-xl mx-auto p-4 mb-8 text-red-700 bg-red-100 rounded-lg">
            {error}
          </div>
        )}

        {profile && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24">
                <Image
                  src={profile.avatar}
                  alt={profile.personaname}
                  fill
                  className="rounded-full"
                />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {profile.personaname}
                </h2>
                {profile.realname && (
                  <p className="text-gray-600">Real name: {profile.realname}</p>
                )}
                {profile.country && (
                  <p className="text-gray-600">Country: {profile.country}</p>
                )}
                <p className="text-gray-600">
                  Member since:{" "}
                  {new Date(profile.timecreated * 1000).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {wishlist.length > 0 && (
          <div className="mb-8">
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setActiveTab("wishlist")}
                className={`px-4 py-2 rounded-lg font-medium ${
                  activeTab === "wishlist"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Wishlist ({wishlist.length})
              </button>
              <button
                onClick={() => setActiveTab("games")}
                className={`px-4 py-2 rounded-lg font-medium ${
                  activeTab === "games"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Owned Games ({ownedGames.length})
              </button>
            </div>

            {activeTab === "wishlist" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlist.map((item) => (
                  <div
                    key={item.appid}
                    className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-gray-800">
                        App ID: {item.appid}
                      </h3>
                      <span className="text-sm text-gray-500">
                        Priority: {item.priority}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-4">
                      Added: {item.date_added}
                    </p>
                    <a
                      href={`https://store.steampowered.com/app/${item.appid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View on Steam →
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ownedGames.map((game) => (
                  <div
                    key={game.appid}
                    className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      {game.img_icon_url && (
                        <div className="relative w-16 h-16 flex-shrink-0">
                          <Image
                            src={`https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`}
                            alt={game.name}
                            fill
                            className="rounded"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800 mb-1">
                          {game.name}
                        </h3>
                        <p className="text-gray-600">
                          Playtime: {game.playtime_forever} hours
                        </p>
                        <a
                          href={`https://store.steampowered.com/app/${game.appid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 font-medium text-sm mt-2 inline-block"
                        >
                          View on Steam →
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
