import { NextResponse } from "next/server";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, retries = 3, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      const contentType = response.headers.get("content-type");

      if (!contentType?.includes("application/json")) {
        throw new Error("Invalid response type");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (i === retries - 1) throw error;
      await delay(delayMs * (i + 1)); // Exponential backoff
    }
  }
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

    if (!data || !data[appId] || !data[appId].success) {
      return NextResponse.json(
        {
          error: "Failed to fetch game details",
          appId,
          response: data,
        },
        { status: 404 }
      );
    }

    const gameData = data[appId].data;

    // Transform the data to match our interface
    const transformedData = {
      name: gameData.name,
      short_description: gameData.short_description,
      header_image: gameData.header_image,
      categories: gameData.categories?.map((cat: any) => cat.description) || [],
      genres: gameData.genres?.map((genre: any) => genre.description) || [],
      release_date: gameData.release_date || { coming_soon: false, date: "" },
      developers: gameData.developers || [],
      publishers: gameData.publishers || [],
      price_overview: gameData.price_overview
        ? {
            currency: gameData.price_overview.currency,
            initial: gameData.price_overview.initial,
            final: gameData.price_overview.final,
            discount_percent: gameData.price_overview.discount_percent,
            formatted_final: (gameData.price_overview.final / 100).toFixed(2),
            formatted_initial: (gameData.price_overview.initial / 100).toFixed(
              2
            ),
          }
        : null,
      platforms: {
        windows: gameData.platforms?.windows || false,
        mac: gameData.platforms?.mac || false,
        linux: gameData.platforms?.linux || false,
      },
      metacritic: gameData.metacritic || { score: 0 },
      recommendations: gameData.recommendations || { total: 0 },
      screenshots: gameData.screenshots || [],
      movies: gameData.movies || [],
    };

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error("Error fetching game details:", error);
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
