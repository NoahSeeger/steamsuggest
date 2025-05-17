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
}

interface OwnedGame {
  appid: number;
  name: string;
  playtime_forever: number;
  img_icon_url: string;
  has_community_visible_stats: boolean;
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
}

interface SortOption {
  key: string;
  label: string;
  type: "string" | "number" | "date";
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
  const [activeTab, setActiveTab] = useState<"wishlist" | "games" | "debug">(
    "wishlist"
  );
  const [showFilters, setShowFilters] = useState(false);
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
  });
  const [apiResponses, setApiResponses] = useState<ApiResponses>({
    wishlist: null,
    profile: null,
    games: null,
    apiCalls: [],
  });
  const router = useRouter();

  const addApiCall = (call: ApiCall) => {
    setApiResponses((prev) => ({
      ...prev,
      apiCalls: [...prev.apiCalls, call],
    }));
  };

  useEffect(() => {
    const fetchData = async () => {
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

        setWishlist(wishlistData.wishlist || []);
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
        setOwnedGames(profileData.ownedGames);
        setApiResponses((prev) => ({ ...prev, profile: profileData }));

        // Fetch game details for wishlist items
        const wishlistWithDetails = await Promise.all(
          wishlistData.wishlist.map(async (item: WishlistItem) => {
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

              return { ...item, gameDetails: gameData };
            } catch (error) {
              console.error(
                `Failed to fetch details for game ${item.appid}:`,
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
          })
        );

        // Fetch game details for owned games
        const ownedGamesWithDetails = await Promise.all(
          profileData.ownedGames.map(async (game: OwnedGame) => {
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

              return { ...game, gameDetails: gameData };
            } catch (error) {
              console.error(
                `Failed to fetch details for game ${game.appid}:`,
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
          })
        );

        setWishlist(wishlistWithDetails);
        setOwnedGames(ownedGamesWithDetails);
        setApiResponses((prev) => ({ ...prev, games: wishlistWithDetails }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [resolvedParams.steamId]);

  useEffect(() => {
    // Extract unique categories from wishlist
    const categories = new Set<string>();
    wishlist.forEach((item) => {
      item.gameDetails?.categories?.forEach((cat: { description: string }) =>
        categories.add(cat.description)
      );
    });
    setAvailableCategories(Array.from(categories).sort());
  }, [wishlist]);

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
    });
  };

  const getFilteredData = (data: any[]) => {
    return data.filter((item) => {
      // Search term filter
      const searchLower = filters.searchTerm.toLowerCase();
      const matchesSearch =
        !filters.searchTerm ||
        item.gameDetails?.name?.toLowerCase().includes(searchLower) ||
        item.gameDetails?.genres?.some((g: string) =>
          g.toLowerCase().includes(searchLower)
        ) ||
        item.gameDetails?.categories?.some((c: string) =>
          c.toLowerCase().includes(searchLower)
        );

      // Category filter
      const matchesCategories =
        filters.categories.length === 0 ||
        filters.categories.every((cat) =>
          item.gameDetails?.categories?.includes(cat)
        );

      // Platform filter - show games that have ALL selected platforms
      const selectedPlatforms = Object.entries(filters.platforms)
        .filter(([_, selected]) => selected)
        .map(([platform]) => platform);

      const matchesPlatforms =
        selectedPlatforms.length === 0 ||
        selectedPlatforms.every(
          (platform) =>
            item.gameDetails?.platforms?.[
              platform as keyof typeof item.gameDetails.platforms
            ]
        );

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

      switch (sortOption.key) {
        case "price":
          aValue = a.gameDetails?.price_overview?.final || 0;
          bValue = b.gameDetails?.price_overview?.final || 0;
          break;
        case "date_added":
          aValue = new Date(a.date_added).getTime();
          bValue = new Date(b.date_added).getTime();
          break;
        case "recommendations":
          aValue = a.gameDetails?.recommendations?.total || 0;
          bValue = b.gameDetails?.recommendations?.total || 0;
          break;
        case "name":
          aValue = a.gameDetails?.name || a.name || "";
          bValue = b.gameDetails?.name || b.name || "";
          break;
        case "priority":
          aValue = a.priority || 0;
          bValue = b.priority || 0;
          break;
        default:
          aValue = a[sortOption.key];
          bValue = b[sortOption.key];
      }

      if (aValue === undefined || bValue === undefined) return 0;

      if (sortOption.type === "string") {
        return filters.sortBy.direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return filters.sortBy.direction === "asc"
        ? aValue - bValue
        : bValue - aValue;
    });
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
                    </div>
                  </div>
                </div>
              )}
            </div>

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
                          {item.gameDetails?.genres && (
                            <div className="text-sm">
                              <span className="font-medium text-gray-700">
                                Genres:
                              </span>{" "}
                              {item.gameDetails.genres.join(", ")}
                            </div>
                          )}
                          {item.gameDetails?.categories && (
                            <div className="text-sm">
                              <span className="font-medium text-gray-700">
                                Categories:
                              </span>{" "}
                              {item.gameDetails.categories.join(", ")}
                            </div>
                          )}
                          {item.gameDetails?.developers && (
                            <div className="text-sm">
                              <span className="font-medium text-gray-700">
                                Developers:
                              </span>{" "}
                              {item.gameDetails.developers.join(", ")}
                            </div>
                          )}
                          {item.gameDetails?.publishers && (
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
                          alt={game.gameDetails.name}
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

                        <div className="space-y-2">
                          {game.gameDetails?.genres && (
                            <div className="text-sm">
                              <span className="font-medium text-gray-700">
                                Genres:
                              </span>{" "}
                              {game.gameDetails.genres.join(", ")}
                            </div>
                          )}
                          {game.gameDetails?.categories && (
                            <div className="text-sm">
                              <span className="font-medium text-gray-700">
                                Categories:
                              </span>{" "}
                              {game.gameDetails.categories.join(", ")}
                            </div>
                          )}
                          {game.gameDetails?.developers && (
                            <div className="text-sm">
                              <span className="font-medium text-gray-700">
                                Developers:
                              </span>{" "}
                              {game.gameDetails.developers.join(", ")}
                            </div>
                          )}
                          {game.gameDetails?.publishers && (
                            <div className="text-sm">
                              <span className="font-medium text-gray-700">
                                Publishers:
                              </span>{" "}
                              {game.gameDetails.publishers.join(", ")}
                            </div>
                          )}
                        </div>

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
                  <h3 className="text-lg font-semibold mb-4">API Calls</h3>
                  <div className="space-y-4">
                    {apiResponses.apiCalls.map((call, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-medium">{call.endpoint}</span>
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
                          <div className="text-red-600 mb-2">{call.error}</div>
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
