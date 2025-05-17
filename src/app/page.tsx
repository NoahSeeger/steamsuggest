"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface WishlistItem {
  appid: number;
  priority: number;
  date_added: string;
  gameDetails?: GameDetails;
}

interface GameDetails {
  name: string;
  short_description: string;
  header_image: string;
  categories: Array<{ id: number; description: string }>;
  genres: Array<{ id: string; description: string }>;
  release_date: { coming_soon: boolean; date: string };
  developers: string[];
  publishers: string[];
  price_overview: {
    currency: string;
    initial: number;
    final: number;
    discount_percent: number;
  };
  platforms: {
    windows: boolean;
    mac: boolean;
    linux: boolean;
  };
  metacritic: { score: number };
  recommendations: { total: number };
  screenshots: Array<{ id: number; path_thumbnail: string; path_full: string }>;
  movies: Array<{
    id: number;
    name: string;
    thumbnail: string;
    webm: { 480: string; max: string };
  }>;
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
  gameDetails?: GameDetails;
}

interface ApiResponses {
  wishlist: any;
  profile: any;
  games: any;
}

export default function Home() {
  const [steamId, setSteamId] = useState("");
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ownedGames, setOwnedGames] = useState<OwnedGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"wishlist" | "games" | "debug">(
    "wishlist"
  );
  const [apiResponses, setApiResponses] = useState<ApiResponses>({
    wishlist: null,
    profile: null,
    games: null,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  }>({ key: "name", direction: "asc" });
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

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const getSortedData = (data: any[]) => {
    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === undefined || bValue === undefined) return 0;

      if (typeof aValue === "string") {
        return sortConfig.direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
    });
  };

  const getFilteredData = (data: any[]) => {
    return data.filter((item) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        item.name?.toLowerCase().includes(searchLower) ||
        item.gameDetails?.name?.toLowerCase().includes(searchLower) ||
        item.appid.toString().includes(searchLower)
      );
    });
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
              value={steamId}
              onChange={(e) => setSteamId(e.target.value)}
              placeholder="Enter Steam ID or username (e.g., 76561198xxxxxxxxx or butchassup)"
              className="flex-1 p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors font-medium"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Loading...
                </div>
              ) : (
                "Search"
              )}
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
              <button
                onClick={() => setActiveTab("debug")}
                className={`px-4 py-2 rounded-lg font-medium ${
                  activeTab === "debug"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Debug Info
              </button>
            </div>

            <div className="mb-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search games..."
                className="w-full p-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {activeTab === "wishlist" && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort("name")}
                      >
                        Name{" "}
                        {sortConfig.key === "name" &&
                          (sortConfig.direction === "asc" ? "↑" : "↓")}
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort("priority")}
                      >
                        Priority{" "}
                        {sortConfig.key === "priority" &&
                          (sortConfig.direction === "asc" ? "↑" : "↓")}
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort("date_added")}
                      >
                        Added{" "}
                        {sortConfig.key === "date_added" &&
                          (sortConfig.direction === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getSortedData(getFilteredData(wishlist)).map((item) => (
                      <tr key={item.appid} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {item.gameDetails?.header_image && (
                              <div className="flex-shrink-0 h-10 w-10 relative mr-4">
                                <Image
                                  src={item.gameDetails.header_image}
                                  alt={item.gameDetails.name}
                                  fill
                                  className="rounded"
                                />
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {item.gameDetails?.name ||
                                  `App ID: ${item.appid}`}
                              </div>
                              {item.gameDetails?.genres && (
                                <div className="text-sm text-gray-500">
                                  {item.gameDetails.genres
                                    .map((g: any) => g.description)
                                    .join(", ")}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.priority}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.date_added}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.gameDetails?.price_overview ? (
                            <div>
                              <span className="font-medium">
                                $
                                {(
                                  item.gameDetails.price_overview.final / 100
                                ).toFixed(2)}
                              </span>
                              {item.gameDetails.price_overview
                                .discount_percent > 0 && (
                                <span className="ml-2 text-green-600">
                                  -
                                  {
                                    item.gameDetails.price_overview
                                      .discount_percent
                                  }
                                  %
                                </span>
                              )}
                            </div>
                          ) : (
                            "N/A"
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <a
                            href={`https://store.steampowered.com/app/${item.appid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View on Steam
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "games" && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort("name")}
                      >
                        Name{" "}
                        {sortConfig.key === "name" &&
                          (sortConfig.direction === "asc" ? "↑" : "↓")}
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort("playtime_forever")}
                      >
                        Playtime{" "}
                        {sortConfig.key === "playtime_forever" &&
                          (sortConfig.direction === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Genres
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getSortedData(getFilteredData(ownedGames)).map((game) => (
                      <tr key={game.appid} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {game.img_icon_url && (
                              <div className="flex-shrink-0 h-10 w-10 relative mr-4">
                                <Image
                                  src={`https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`}
                                  alt={game.name}
                                  fill
                                  className="rounded"
                                />
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {game.gameDetails?.name || game.name}
                              </div>
                              {game.gameDetails?.developers && (
                                <div className="text-sm text-gray-500">
                                  {game.gameDetails.developers.join(", ")}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {game.playtime_forever} hours
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {game.gameDetails?.genres
                            ?.map((g: any) => g.description)
                            .join(", ") || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <a
                            href={`https://store.steampowered.com/app/${game.appid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View on Steam
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "debug" && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Wishlist API Response
                  </h3>
                  <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96">
                    {JSON.stringify(apiResponses.wishlist, null, 2)}
                  </pre>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Profile API Response
                  </h3>
                  <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96">
                    {JSON.stringify(apiResponses.profile, null, 2)}
                  </pre>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Games API Response
                  </h3>
                  <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96">
                    {JSON.stringify(apiResponses.games, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
