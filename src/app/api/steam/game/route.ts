import { NextResponse } from "next/server";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, retries = 3, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      // Use 'force-cache' for fetch to leverage Next.js Data Cache
      // Add revalidate option to refresh cache after a certain period
      const response = await fetch(url, {
        cache: "force-cache",
        next: { revalidate: 86400 },
      }); // Cache for 24 hours
      const contentType = response.headers.get("content-type");

      if (!contentType?.includes("application/json")) {
        // If the response is not JSON, it might be a rate limit page or error.
        // Throw a specific error that can be caught to log the non-JSON response.
        const textResponse = await response.text();
        console.error(`Non-JSON response received from ${url}:`, textResponse);
        throw new Error("Invalid response type from API");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Attempt ${i + 1} failed for ${url}:`, error);
      if (i === retries - 1) {
        console.error(`Max retries reached for ${url}`);
        throw error;
      }
      await delay(delayMs * (i + 1)); // Exponential backoff
    }
  }
  throw new Error("fetchWithRetry failed after multiple retries");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const appId = searchParams.get("appId");

  if (!appId) {
    return NextResponse.json({ error: "App ID is required" }, { status: 400 });
  }

  try {
    const data = await fetchWithRetry(
      `https://store.steampowered.com/api/appdetails?appids=${appId}`
    );

    // Steam API returns an object where keys are appids
    const appData = data?.[appId]?.data;

    if (!data || !data[appId] || !data[appId].success || !appData) {
      console.error("Steam API returned unsuccessful response or no data:", {
        appId,
        response: data,
      });
      return NextResponse.json(
        {
          error: "Failed to fetch game details or game not found",
          appId,
          response: data,
        },
        { status: 404 }
      );
    }

    // Transform the data to match our interface
    const transformedData = {
      name: appData.name,
      short_description: appData.short_description,
      header_image: appData.header_image,
      categories:
        appData.categories?.map((cat: any) => ({
          id: cat.id,
          description: cat.description,
        })) || [],
      genres:
        appData.genres?.map((genre: any) => ({
          id: genre.id,
          description: genre.description,
        })) || [],
      release_date: appData.release_date || { coming_soon: false, date: "" },
      developers: appData.developers || [],
      publishers: appData.publishers || [],
      price_overview: appData.price_overview
        ? {
            currency: appData.price_overview.currency,
            initial: appData.price_overview.initial,
            final: appData.price_overview.final,
            discount_percent: appData.price_overview.discount_percent,
            formatted_final: `$${(appData.price_overview.final / 100).toFixed(
              2
            )}`, // Format price
            formatted_initial: `$${(
              appData.price_overview.initial / 100
            ).toFixed(2)}`, // Format price
          }
        : null,
      platforms: {
        windows: appData.platforms?.windows || false,
        mac: appData.platforms?.mac || false,
        linux: appData.platforms?.linux || false,
      },
      metacritic: appData.metacritic || { score: 0 },
      recommendations: appData.recommendations || { total: 0 },
      screenshots: appData.screenshots || [],
      movies: appData.movies || [],
    };

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error("Error fetching game details in route:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch game details",
        appId,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
