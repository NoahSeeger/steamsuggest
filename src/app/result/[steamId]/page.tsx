"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

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
  profileurl: string;
  personastate: number;
  gameextrainfo: string | null;
  gameid: string | null;
  primaryclanid: string;
  communityvisibilitystate: number;
  commentpermission: number;
  last_online: string;
  account_created: string;
  current_status: string;
  current_game: string | null;
  profile_visibility: string;
}

interface OwnedGame {
  appid: number;
  name: string;
  playtime_forever: number;
  img_icon_url: string;
  has_community_visible_stats: boolean;
  playtime_windows_forever: number;
  playtime_mac_forever: number;
  playtime_linux_forever: number;
  rtime_last_played: string | null;
  gameDetails?: GameDetails;
}

interface ApiCall {
  endpoint: string;
  timestamp: string;
  status: "success" | "error";
  response?: any;
  error?: string;
}

interface ApiResponses {
  wishlist: any;
  profile: any;
  games: any;
  apiCalls: ApiCall[];
}

interface FilterState {
  searchTerm: string;
  categories: string[];
  platforms: {
    windows: boolean;
    mac: boolean;
    linux: boolean;
  };
  priceRange: {
    min: number | null;
    max: number | null;
  };
  sortBy: {
    key: string;
    direction: "asc" | "desc";
  };
  showOnlyDiscounted: boolean;
  genres: string[];
}

interface SortOption {
  key: string;
  label: string;
  type: "string" | "number" | "date";
}

interface GameStats {
  genres: { [key: string]: number };
  categories: { [key: string]: number };
  publishers: { [key: string]: number };
  developers: { [key: string]: number };
  totalPlaytime: number;
  averagePlaytime: number;
  totalGames: number;
  topGames: Array<{
    name: string;
    playtime: number;
    appid: number;
  }>;
}

const SORT_OPTIONS: SortOption[] = [
  { key: "name", label: "Name", type: "string" },
  { key: "price", label: "Price", type: "number" },
  { key: "date_added", label: "Date Added", type: "date" },
  { key: "recommendations", label: "Recommendations", type: "number" },
  { key: "priority", label: "Priority", type: "number" },
];

export default function ResultPage({
  params,
}: {
  params: Promise<{ steamId: string }>;
}) {
  const resolvedParams = use(params);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ownedGames, setOwnedGames] = useState<OwnedGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<
    "wishlist" | "games" | "debug" | "summary"
  >("wishlist");
  const [showFilters, setShowFilters] = useState(false);
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: "",
    categories: [],
    platforms: {
      windows: false,
      mac: false,
      linux: false,
    },
    priceRange: {
      min: null,
      max: null,
    },
    sortBy: {
      key: "name",
      direction: "asc",
    },
    showOnlyDiscounted: false,
    genres: [],
  });
  const [apiResponses, setApiResponses] = useState<ApiResponses>({
    wishlist: null,
    profile: null,
    games: null,
    apiCalls: [],
  });
  const router = useRouter();
  const [hideErrors, setHideErrors] = useState(true);
  const [hideScuffed, setHideScuffed] = useState(true);
  const [gameStats, setGameStats] = useState<GameStats | null>(null);

  const addApiCall = (call: ApiCall) => {
    setApiResponses((prev) => ({
      ...prev,
      apiCalls: [...prev.apiCalls, call],
    }));
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");

      try {
        // Fetch wishlist
        const wishlistResponse = await fetch(
          `/api/steam?steamId=${resolvedParams.steamId}`
        );
        const wishlistData = await wishlistResponse.json();

        addApiCall({
          endpoint: `/api/steam?steamId=${resolvedParams.steamId}`,
          timestamp: new Date().toISOString(),
          status: wishlistResponse.ok ? "success" : "error",
          response: wishlistData,
          error: !wishlistResponse.ok ? wishlistData.error : undefined,
        });

        if (!wishlistResponse.ok) {
          throw new Error(wishlistData.error || "Failed to fetch wishlist");
        }

        const fetchedWishlist = wishlistData.wishlist || [];
        setWishlist(fetchedWishlist);
        setApiResponses((prev) => ({ ...prev, wishlist: wishlistData }));

        // Fetch profile and owned games
        const profileResponse = await fetch(
          `/api/steam/profile?steamId=${resolvedParams.steamId}`
        );
        const profileData = await profileResponse.json();

        addApiCall({
          endpoint: `/api/steam/profile?steamId=${resolvedParams.steamId}`,
          timestamp: new Date().toISOString(),
          status: profileResponse.ok ? "success" : "error",
          response: profileData,
          error: !profileResponse.ok ? profileData.error : undefined,
        });

        if (!profileResponse.ok) {
          throw new Error(profileData.error || "Failed to fetch profile");
        }

        setProfile(profileData.profile);
        const fetchedOwnedGames = profileData.ownedGames || [];
        setOwnedGames(fetchedOwnedGames);
        setApiResponses((prev) => ({ ...prev, profile: profileData }));

        // Fetch details for wishlist items
        const wishlistWithDetailsPromises = fetchedWishlist.map(
          async (item: WishlistItem) => {
            try {
              const gameResponse = await fetch(
                `/api/steam/game?appId=${item.appid}`
              );
              const gameData = await gameResponse.json();

              addApiCall({
                endpoint: `/api/steam/game?appId=${item.appid}`,
                timestamp: new Date().toISOString(),
                status: gameResponse.ok ? "success" : "error",
                response: gameData,
                error: !gameResponse.ok ? gameData.error : undefined,
              });

              if (!gameResponse.ok) {
                console.warn(
                  `Failed to fetch details for wishlist game ${item.appid}`
                );
                return item;
              }

              return { ...item, gameDetails: gameData };
            } catch (error) {
              console.error(
                `Error fetching details for wishlist game ${item.appid}:`,
                error
              );
              addApiCall({
                endpoint: `/api/steam/game?appId=${item.appid}`,
                timestamp: new Date().toISOString(),
                status: "error",
                error: error instanceof Error ? error.message : "Unknown error",
              });
              return item;
            }
          }
        );

        // Fetch details for owned games
        const ownedGamesWithDetailsPromises = fetchedOwnedGames.map(
          async (game: OwnedGame) => {
            try {
              const gameResponse = await fetch(
                `/api/steam/game?appId=${game.appid}`
              );
              const gameData = await gameResponse.json();

              addApiCall({
                endpoint: `/api/steam/game?appId=${game.appid}`,
                timestamp: new Date().toISOString(),
                status: gameResponse.ok ? "success" : "error",
                response: gameData,
                error: !gameResponse.ok ? gameData.error : undefined,
              });

              if (!gameResponse.ok) {
                console.warn(
                  `Failed to fetch details for owned game ${game.appid}`
                );
                return game;
              }

              return { ...game, gameDetails: gameData };
            } catch (error) {
              console.error(
                `Error fetching details for owned game ${game.appid}:`,
                error
              );
              addApiCall({
                endpoint: `/api/steam/game?appId=${game.appid}`,
                timestamp: new Date().toISOString(),
                status: "error",
                error: error instanceof Error ? error.message : "Unknown error",
              });
              return game;
            }
          }
        );

        // Update state with details as they are fetched
        const [resolvedWishlistWithDetails, resolvedOwnedGamesWithDetails] =
          await Promise.all([
            Promise.all(wishlistWithDetailsPromises),
            Promise.all(ownedGamesWithDetailsPromises),
          ]);

        setWishlist(resolvedWishlistWithDetails);
        setOwnedGames(resolvedOwnedGamesWithDetails);
      } catch (err) {
        console.error("Error in fetchData effect:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [resolvedParams.steamId]);

  useEffect(() => {
    // Extract unique categories and genres from games with details (both wishlist and owned)
    const categories = new Set<string>();
    const genres = new Set<string>();

    // Collect from wishlist
    wishlist.forEach((item) => {
      item.gameDetails?.categories?.forEach((cat: { description: string }) => {
        if (cat.description) {
          categories.add(cat.description);
        }
      });
      item.gameDetails?.genres?.forEach((genre: { description: string }) => {
        if (genre.description) {
          genres.add(genre.description);
        }
      });
    });

    // Collect from owned games (only if gameDetails are available)
    ownedGames.forEach((game) => {
      game.gameDetails?.categories?.forEach((cat: { description: string }) => {
        if (cat.description) {
          categories.add(cat.description);
        }
      });
      game.gameDetails?.genres?.forEach((genre: { description: string }) => {
        if (genre.description) {
          genres.add(genre.description);
        }
      });
    });

    setAvailableCategories(Array.from(categories).sort());
    setAvailableGenres(Array.from(genres).sort());
  }, [wishlist, ownedGames]);

  useEffect(() => {
    // Calculate game statistics when owned games are loaded
    if (ownedGames.length > 0) {
      const stats: GameStats = {
        genres: {},
        categories: {},
        publishers: {},
        developers: {},
        totalPlaytime: 0,
        averagePlaytime: 0,
        totalGames: ownedGames.length,
        topGames: [],
      };

      ownedGames.forEach((game) => {
        // Only process games that have successfully fetched details
        if (game.gameDetails) {
          // Count genres
          game.gameDetails.genres?.forEach((genre: { description: string }) => {
            if (genre.description) {
              stats.genres[genre.description] =
                (stats.genres[genre.description] || 0) + 1;
            }
          });

          // Count categories
          game.gameDetails.categories?.forEach(
            (category: { description: string }) => {
              if (category.description) {
                stats.categories[category.description] =
                  (stats.categories[category.description] || 0) + 1;
              }
            }
          );

          // Count publishers
          game.gameDetails.publishers?.forEach((publisher: string) => {
            if (publisher) {
              stats.publishers[publisher] =
                (stats.publishers[publisher] || 0) + 1;
            }
          });

          // Count developers
          game.gameDetails.developers?.forEach((developer: string) => {
            if (developer) {
              stats.developers[developer] =
                (stats.developers[developer] || 0) + 1;
            }
          });

          // Add to total playtime
          stats.totalPlaytime += game.playtime_forever || 0;
        }
      });

      // Calculate average playtime
      stats.averagePlaytime =
        stats.totalGames > 0 ? stats.totalPlaytime / stats.totalGames : 0;

      // Get top 5 games by playtime
      stats.topGames = ownedGames
        .filter((game) => game.playtime_forever > 0 && game.gameDetails?.name)
        .sort((a, b) => (b.playtime_forever || 0) - (a.playtime_forever || 0))
        .slice(0, 5)
        .map((game) => ({
          name: game.gameDetails?.name || game.name,
          playtime: game.playtime_forever,
          appid: game.appid,
        }));

      setGameStats(stats);
    } else {
      // Reset stats if no owned games
      setGameStats(null);
    }
  }, [ownedGames]);

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleCategoryToggle = (category: string) => {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  };

  const handleGenreToggle = (genre: string) => {
    setFilters((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...prev.genres, genre],
    }));
  };

  const handlePlatformToggle = (platform: keyof FilterState["platforms"]) => {
    setFilters((prev) => ({
      ...prev,
      platforms: {
        ...prev.platforms,
        [platform]: !prev.platforms[platform],
      },
    }));
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: "",
      categories: [],
      platforms: {
        windows: false,
        mac: false,
        linux: false,
      },
      priceRange: {
        min: null,
        max: null,
      },
      sortBy: {
        key: "name",
        direction: "asc",
      },
      showOnlyDiscounted: false,
      genres: [],
    });
  };

  const getFilteredData = (data: any[]) => {
    return data.filter((item) => {
      // Hide scuffed entries if enabled
      if (hideScuffed && (!item.gameDetails || !item.gameDetails.name)) {
        return false;
      }

      // Search term filter - search name, genres, categories
      const searchLower = filters.searchTerm.toLowerCase();
      const matchesSearch =
        !filters.searchTerm ||
        item.gameDetails?.name?.toLowerCase().includes(searchLower) ||
        item.gameDetails?.genres?.some((g: { description: string }) =>
          g.description.toLowerCase().includes(searchLower)
        ) ||
        item.gameDetails?.categories?.some((c: { description: string }) =>
          c.description.toLowerCase().includes(searchLower)
        );

      // Category filter
      const matchesCategories =
        filters.categories.length === 0 ||
        item.gameDetails?.categories?.some((c: { description: string }) =>
          filters.categories.includes(c.description)
        ) ||
        false; // Ensure boolean return

      // Genre filter
      const matchesGenres =
        filters.genres.length === 0 ||
        item.gameDetails?.genres?.some((g: { description: string }) =>
          filters.genres.includes(g.description)
        ) ||
        false; // Ensure boolean return

      // Platform filter - show games that have ALL selected platforms
      const selectedPlatforms = Object.entries(filters.platforms)
        .filter(([_, selected]) => selected)
        .map(([platform]) => platform);

      const matchesPlatforms =
        selectedPlatforms.length === 0 ||
        (item.gameDetails?.platforms?.platforms &&
          selectedPlatforms.every(
            (platform) =>
              item.gameDetails?.platforms?.platforms[
                platform as keyof typeof item.gameDetails.platforms
              ]
          ));

      // Price range filter
      const price = item.gameDetails?.price_overview?.final || 0;
      const matchesPrice =
        (!filters.priceRange.min || price >= filters.priceRange.min) &&
        (!filters.priceRange.max || price <= filters.priceRange.max);

      // Discount filter
      const matchesDiscount =
        !filters.showOnlyDiscounted ||
        (item.gameDetails?.price_overview?.discount_percent || 0) > 0;

      return (
        matchesSearch &&
        matchesCategories &&
        matchesGenres && // Include genre filter
        matchesPlatforms &&
        matchesPrice &&
        matchesDiscount
      );
    });
  };

  const getSortedData = (data: any[]) => {
    return [...data].sort((a, b) => {
      const sortOption = SORT_OPTIONS.find(
        (opt) => opt.key === filters.sortBy.key
      );
      if (!sortOption) return 0;

      let aValue, bValue;

      // Add checks for gameDetails before accessing properties
      const aDetails = a.gameDetails;
      const bDetails = b.gameDetails;

      switch (sortOption.key) {
        case "price":
          aValue = aDetails?.price_overview?.final || 0;
          bValue = bDetails?.price_overview?.final || 0;
          break;
        case "date_added":
          // date_added only exists on wishlist items, handle owned games
          aValue = a.date_added ? new Date(a.date_added).getTime() : 0; // Treat owned games with no date as 0
          bValue = b.date_added ? new Date(b.date_added).getTime() : 0;
          break;
        case "recommendations":
          aValue = aDetails?.recommendations?.total || 0;
          bValue = bDetails?.recommendations?.total || 0;
          break;
        case "name":
          aValue = aDetails?.name || a.name || "";
          bValue = bDetails?.name || b.name || "";
          break;
        case "priority":
          // priority only exists on wishlist items
          aValue = a.priority || 0;
          bValue = b.priority || 0;
          break;
        default:
          // Fallback for other keys, with gameDetails check
          aValue = aDetails?.[sortOption.key] || a[sortOption.key];
          bValue = bDetails?.[sortOption.key] || b[sortOption.key];
      }

      // Ensure values are comparable, especially for potentially undefined results
      if (aValue == null || bValue == null) return 0; // Handle null/undefined gracefully

      if (sortOption.type === "string") {
        return filters.sortBy.direction === "asc"
          ? String(aValue).localeCompare(String(bValue))
          : String(bValue).localeCompare(String(aValue));
      }

      return filters.sortBy.direction === "asc"
        ? Number(aValue) - Number(bValue)
        : Number(bValue) - Number(aValue);
    });
  };

  const getTopItems = (items: { [key: string]: number }, count: number = 3) => {
    return Object.entries(items)
      .filter(([, count]) => count > 0) // Only include items with count > 0
      .sort(([, a], [, b]) => b - a)
      .slice(0, count)
      .map(([name, count]) => ({ name, count }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">
            Loading Steam Profile...
          </h2>
          <p className="text-gray-600 mt-2">This may take a few moments</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-xl mx-auto p-8 bg-white rounded-lg shadow-lg text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Steam Profile</h1>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Back to Search
          </button>
        </div>

        {profile && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex items-start gap-6">
              <div className="relative w-24 h-24">
                <Image
                  src={profile.avatar}
                  alt={profile.personaname}
                  fill
                  className="rounded-full"
                />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {profile.personaname}
                    </h2>
                    <p className="text-gray-600">Steam ID: {profile.steamid}</p>
                    {profile.realname && (
                      <p className="text-gray-600">
                        Real name: {profile.realname}
                      </p>
                    )}
                  </div>
                  <a
                    href={profile.profileurl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View Steam Profile
                  </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <p className="text-gray-600">
                      <span className="font-medium">Status:</span>{" "}
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-sm ${
                          profile.current_status === "Online"
                            ? "bg-green-100 text-green-800"
                            : profile.current_status === "Offline"
                            ? "bg-gray-100 text-gray-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {profile.current_status}
                        {profile.current_game &&
                          ` - Playing ${profile.current_game}`}
                      </span>
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium">Profile Visibility:</span>{" "}
                      {profile.profile_visibility}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium">Last Online:</span>{" "}
                      {new Date(profile.last_online).toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-gray-600">
                      <span className="font-medium">Country:</span>{" "}
                      {profile.country || "Not specified"}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium">Member Since:</span>{" "}
                      {new Date(profile.account_created).toLocaleDateString()}
                    </p>
                    {profile.primaryclanid && (
                      <p className="text-gray-600">
                        <span className="font-medium">Primary Group:</span>{" "}
                        <a
                          href={`https://steamcommunity.com/gid/${profile.primaryclanid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          View Group
                        </a>
                      </p>
                    )}
                  </div>
                </div>
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
                onClick={() => setActiveTab("summary")}
                className={`px-4 py-2 rounded-lg font-medium ${
                  activeTab === "summary"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Summary
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

            <div className="mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={filters.searchTerm}
                    onChange={(e) =>
                      handleFilterChange("searchTerm", e.target.value)
                    }
                    placeholder="Search games..."
                    className="w-full p-2 pl-10 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <svg
                    className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                  {showFilters ? "Hide Filters" : "Show Filters"}
                  {showFilters ? (
                    <ChevronUpIcon className="h-5 w-5" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5" />
                  )}
                </button>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2"
                >
                  Clear Filters
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              {showFilters && (
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Categories */}
                    <div className="space-y-4">
                      <h3 className="font-medium text-lg">Categories</h3>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {availableCategories.map((category) => (
                          <label
                            key={category}
                            className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={filters.categories.includes(category)}
                              onChange={() => handleCategoryToggle(category)}
                              className="rounded text-blue-600 h-4 w-4"
                            />
                            <span className="text-sm">{category}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Genres */}
                    <div className="space-y-4">
                      <h3 className="font-medium text-lg">Genres</h3>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {availableGenres.map((genre) => (
                          <label
                            key={genre}
                            className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={filters.genres.includes(genre)}
                              onChange={() => handleGenreToggle(genre)}
                              className="rounded text-blue-600 h-4 w-4"
                            />
                            <span className="text-sm">{genre}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Platforms */}
                    <div className="space-y-4">
                      <h3 className="font-medium text-lg">Platforms</h3>
                      <div className="space-y-2">
                        {Object.entries(filters.platforms).map(
                          ([platform, checked]) => (
                            <label
                              key={platform}
                              className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  handlePlatformToggle(
                                    platform as keyof FilterState["platforms"]
                                  )
                                }
                                className="rounded text-blue-600 h-4 w-4"
                              />
                              <span className="text-sm capitalize">
                                {platform}
                              </span>
                            </label>
                          )
                        )}
                      </div>
                    </div>

                    {/* Price Range */}
                    <div className="space-y-4">
                      <h3 className="font-medium text-lg">Price Range</h3>
                      <div className="flex items-center space-x-2">
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-gray-500">
                            $
                          </span>
                          <input
                            type="number"
                            placeholder="Min"
                            value={filters.priceRange.min || ""}
                            onChange={(e) =>
                              handleFilterChange("priceRange", {
                                ...filters.priceRange,
                                min: e.target.value
                                  ? Number(e.target.value)
                                  : null,
                              })
                            }
                            className="w-32 pl-7 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <span className="text-gray-500">-</span>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-gray-500">
                            $
                          </span>
                          <input
                            type="number"
                            placeholder="Max"
                            value={filters.priceRange.max || ""}
                            onChange={(e) =>
                              handleFilterChange("priceRange", {
                                ...filters.priceRange,
                                max: e.target.value
                                  ? Number(e.target.value)
                                  : null,
                              })
                            }
                            className="w-32 pl-7 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sort Options */}
                    <div className="space-y-4">
                      <h3 className="font-medium text-lg">Sort By</h3>
                      <div className="flex items-center space-x-2">
                        <select
                          value={filters.sortBy.key}
                          onChange={(e) =>
                            handleFilterChange("sortBy", {
                              ...filters.sortBy,
                              key: e.target.value,
                            })
                          }
                          className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {SORT_OPTIONS.map((option) => (
                            <option key={option.key} value={option.key}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() =>
                            handleFilterChange("sortBy", {
                              ...filters.sortBy,
                              direction:
                                filters.sortBy.direction === "asc"
                                  ? "desc"
                                  : "asc",
                            })
                          }
                          className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                          title={`Sort ${
                            filters.sortBy.direction === "asc"
                              ? "Descending"
                              : "Ascending"
                          }`}
                        >
                          {filters.sortBy.direction === "asc" ? (
                            <ChevronUpIcon className="h-5 w-5" />
                          ) : (
                            <ChevronDownIcon className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Discount Filter */}
                    <div className="space-y-4">
                      <h3 className="font-medium text-lg">Other Filters</h3>
                      <div className="space-y-2">
                        <label className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filters.showOnlyDiscounted}
                            onChange={(e) =>
                              handleFilterChange(
                                "showOnlyDiscounted",
                                e.target.checked
                              )
                            }
                            className="rounded text-blue-600 h-4 w-4"
                          />
                          <span className="text-sm">
                            Show only discounted games
                          </span>
                        </label>
                        <label className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                          <input
                            type="checkbox"
                            checked={hideScuffed}
                            onChange={(e) => setHideScuffed(e.target.checked)}
                            className="rounded text-blue-600 h-4 w-4"
                          />
                          <span className="text-sm">
                            Hide incomplete entries
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {activeTab === "summary" && gameStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Top Genres */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold mb-4">Top Genres</h3>
                  <div className="space-y-3">
                    {getTopItems(gameStats.genres, 5).map((genre, index) => (
                      <div
                        key={genre.name}
                        className="flex justify-between items-center"
                      >
                        <span className="text-gray-700">
                          {index + 1}. {genre.name}
                        </span>
                        <span className="text-gray-500">
                          {genre.count} games
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Categories */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold mb-4">Top Categories</h3>
                  <div className="space-y-3">
                    {getTopItems(gameStats.categories, 5).map(
                      (category, index) => (
                        <div
                          key={category.name}
                          className="flex justify-between items-center"
                        >
                          <span className="text-gray-700">
                            {index + 1}. {category.name}
                          </span>
                          <span className="text-gray-500">
                            {category.count} games
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Top Publishers */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold mb-4">Top Publishers</h3>
                  <div className="space-y-3">
                    {getTopItems(gameStats.publishers, 5).map(
                      (publisher, index) => (
                        <div
                          key={publisher.name}
                          className="flex justify-between items-center"
                        >
                          <span className="text-gray-700">
                            {index + 1}. {publisher.name}
                          </span>
                          <span className="text-gray-500">
                            {publisher.count} games
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Top Developers */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold mb-4">Top Developers</h3>
                  <div className="space-y-3">
                    {getTopItems(gameStats.developers, 5).map(
                      (developer, index) => (
                        <div
                          key={developer.name}
                          className="flex justify-between items-center"
                        >
                          <span className="text-gray-700">
                            {index + 1}. {developer.name}
                          </span>
                          <span className="text-gray-500">
                            {developer.count} games
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Playtime Stats */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold mb-4">
                    Playtime Statistics
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Total Playtime</span>
                      <span className="text-gray-500">
                        {Math.round(gameStats.totalPlaytime)} hours
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Average Playtime</span>
                      <span className="text-gray-500">
                        {Math.round(gameStats.averagePlaytime)} hours
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Total Games</span>
                      <span className="text-gray-500">
                        {gameStats.totalGames}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Most Played Games */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold mb-4">Most Played Games</h3>
                  <div className="space-y-3">
                    {gameStats.topGames.map((game, index) => (
                      <div
                        key={game.appid}
                        className="flex justify-between items-center"
                      >
                        <span className="text-gray-700">
                          {index + 1}. {game.name}
                        </span>
                        <span className="text-gray-500">
                          {game.playtime} hours
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "wishlist" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getSortedData(getFilteredData(wishlist)).map((item) => (
                  <div
                    key={item.appid}
                    className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
                  >
                    {item.gameDetails?.header_image && (
                      <div className="relative h-48 w-full">
                        <Image
                          src={item.gameDetails.header_image}
                          alt={item.gameDetails.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-gray-900">
                          {item.gameDetails?.name || `App ID: ${item.appid}`}
                        </h3>
                        {item.gameDetails?.price_overview && (
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">
                              {item.gameDetails.price_overview.formatted_final}
                            </div>
                            {item.gameDetails.price_overview.discount_percent >
                              0 && (
                              <div className="text-sm text-green-600">
                                -
                                {
                                  item.gameDetails.price_overview
                                    .discount_percent
                                }
                                %
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        {item.gameDetails?.short_description && (
                          <p className="text-gray-600 text-sm line-clamp-2">
                            {item.gameDetails.short_description}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-2">
                          {item.gameDetails?.platforms?.windows && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              Windows
                            </span>
                          )}
                          {item.gameDetails?.platforms?.mac && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              Mac
                            </span>
                          )}
                          {item.gameDetails?.platforms?.linux && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              Linux
                            </span>
                          )}
                        </div>

                        <div className="space-y-2">
                          {item.gameDetails?.genres &&
                            item.gameDetails.genres.length > 0 && (
                              <div className="text-sm">
                                <span className="font-medium text-gray-700">
                                  Genres:
                                </span>{" "}
                                {item.gameDetails.genres
                                  .map(
                                    (genre: { description: string }) =>
                                      genre.description
                                  )
                                  .join(", ")}
                              </div>
                            )}
                          {item.gameDetails?.categories &&
                            item.gameDetails.categories.length > 0 && (
                              <div className="text-sm">
                                <span className="font-medium text-gray-700">
                                  Categories:
                                </span>{" "}
                                {item.gameDetails.categories
                                  .map(
                                    (category: { description: string }) =>
                                      category.description
                                  )
                                  .join(", ")}
                              </div>
                            )}
                          {item.gameDetails?.developers &&
                            item.gameDetails.developers.length > 0 && (
                              <div className="text-sm">
                                <span className="font-medium text-gray-700">
                                  Developers:
                                </span>{" "}
                                {item.gameDetails.developers.join(", ")}
                              </div>
                            )}
                          {item.gameDetails?.publishers &&
                            item.gameDetails.publishers.length > 0 && (
                              <div className="text-sm">
                                <span className="font-medium text-gray-700">
                                  Publishers:
                                </span>{" "}
                                {item.gameDetails.publishers.join(", ")}
                              </div>
                            )}
                        </div>

                        <div className="flex justify-between items-center text-sm text-gray-500">
                          <div>
                            Added:{" "}
                            {new Date(item.date_added).toLocaleDateString()}
                          </div>
                          {item.gameDetails?.recommendations?.total > 0 && (
                            <div>
                              {item.gameDetails.recommendations.total.toLocaleString()}{" "}
                              recommendations
                            </div>
                          )}
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                          <a
                            href={`https://store.steampowered.com/app/${item.appid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            View on Steam
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "games" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getSortedData(getFilteredData(ownedGames)).map((game) => (
                  <div
                    key={game.appid}
                    className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
                  >
                    {game.gameDetails?.header_image && (
                      <div className="relative h-48 w-full">
                        <Image
                          src={game.gameDetails.header_image}
                          alt={game.gameDetails.name || game.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-gray-900">
                          {game.gameDetails?.name || game.name}
                        </h3>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">
                            {game.playtime_forever} hours
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {game.gameDetails?.short_description && (
                          <p className="text-gray-600 text-sm line-clamp-2">
                            {game.gameDetails.short_description}
                          </p>
                        )}

                        {game.gameDetails?.platforms && (
                          <div className="flex flex-wrap gap-2">
                            {game.gameDetails?.platforms?.windows && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                Windows
                              </span>
                            )}
                            {game.gameDetails?.platforms?.mac && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                Mac
                              </span>
                            )}
                            {game.gameDetails?.platforms?.linux && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                Linux
                              </span>
                            )}
                          </div>
                        )}

                        {game.gameDetails && (
                          <div className="space-y-2">
                            {game.gameDetails?.genres &&
                              game.gameDetails.genres.length > 0 && (
                                <div className="text-sm">
                                  <span className="font-medium text-gray-700">
                                    Genres:
                                  </span>{" "}
                                  {game.gameDetails.genres
                                    .map(
                                      (genre: { description: string }) =>
                                        genre.description
                                    )
                                    .join(", ")}
                                </div>
                              )}
                            {game.gameDetails?.categories &&
                              game.gameDetails.categories.length > 0 && (
                                <div className="text-sm">
                                  <span className="font-medium text-gray-700">
                                    Categories:
                                  </span>{" "}
                                  {game.gameDetails.categories
                                    .map(
                                      (category: { description: string }) =>
                                        category.description
                                    )
                                    .join(", ")}
                                </div>
                              )}
                            {game.gameDetails?.developers &&
                              game.gameDetails.developers.length > 0 && (
                                <div className="text-sm">
                                  <span className="font-medium text-gray-700">
                                    Developers:
                                  </span>{" "}
                                  {game.gameDetails.developers.join(", ")}
                                </div>
                              )}
                            {game.gameDetails?.publishers &&
                              game.gameDetails.publishers.length > 0 && (
                                <div className="text-sm">
                                  <span className="font-medium text-gray-700">
                                    Publishers:
                                  </span>{" "}
                                  {game.gameDetails.publishers.join(", ")}
                                </div>
                              )}
                          </div>
                        )}

                        <div className="flex justify-between items-center text-sm text-gray-500">
                          {game.gameDetails?.recommendations?.total > 0 && (
                            <div>
                              {game.gameDetails.recommendations.total.toLocaleString()}{" "}
                              recommendations
                            </div>
                          )}
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                          <a
                            href={`https://store.steampowered.com/app/${game.appid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            View on Steam
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "debug" && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">API Calls</h3>
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-gray-600">
                        Cache Status:{" "}
                        {
                          apiResponses.apiCalls.filter(
                            (call) => call.status === "success"
                          ).length
                        }{" "}
                        / {apiResponses.apiCalls.length} successful
                      </div>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={hideErrors}
                          onChange={(e) => setHideErrors(e.target.checked)}
                          className="rounded text-blue-600 h-4 w-4"
                        />
                        <span className="text-sm text-gray-600">
                          Hide error entries
                        </span>
                      </label>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {apiResponses.apiCalls
                      .filter(
                        (call) => !hideErrors || call.status === "success"
                      )
                      .map((call, callIndex) => (
                        <div key={callIndex} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="font-medium">
                                {call.endpoint}
                              </span>
                              <span
                                className={`ml-2 px-2 py-1 rounded text-sm ${
                                  call.status === "success"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {call.status}
                              </span>
                            </div>
                            <span className="text-sm text-gray-500">
                              {new Date(call.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          {call.error && (
                            <div className="text-red-600 mb-2">
                              {call.error}
                            </div>
                          )}
                          <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-48 text-sm">
                            {JSON.stringify(call.response, null, 2)}
                          </pre>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
