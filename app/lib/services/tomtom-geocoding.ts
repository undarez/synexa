/**
 * Services TomTom - Geocoding et Search
 * Utilise les APIs TomTom pour la recherche d'adresses et de lieux
 */

const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY;

/**
 * Geocoding - Convertit une adresse en coordonnées
 */
export async function geocodeAddress(address: string): Promise<{
  lat: number;
  lng: number;
  formattedAddress: string;
} | null> {
  if (!TOMTOM_API_KEY) {
    console.warn("[TomTom Geocoding] TOMTOM_API_KEY non configurée");
    return null;
  }

  try {
    const url = new URL("https://api.tomtom.com/search/2/geocode/" + encodeURIComponent(address) + ".json");
    url.searchParams.append("key", TOMTOM_API_KEY);
    url.searchParams.append("limit", "1");
    url.searchParams.append("countrySet", "FR");

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`TomTom Geocoding API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      return {
        lat: result.position.lat,
        lng: result.position.lon,
        formattedAddress: result.address.freeformAddress || address,
      };
    }

    return null;
  } catch (error) {
    console.error("[TomTom Geocoding] Erreur:", error);
    return null;
  }
}

/**
 * Reverse Geocoding - Convertit des coordonnées en adresse
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{
  address: string;
  streetName?: string;
  municipality?: string;
} | null> {
  if (!TOMTOM_API_KEY) {
    return null;
  }

  try {
    const url = new URL(`https://api.tomtom.com/search/2/reverseGeocode/${lat},${lng}.json`);
    url.searchParams.append("key", TOMTOM_API_KEY);

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`TomTom Reverse Geocoding API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.addresses && data.addresses.length > 0) {
      const address = data.addresses[0].address;
      return {
        address: address.freeformAddress || `${address.streetName || ""}, ${address.municipality || ""}`,
        streetName: address.streetName,
        municipality: address.municipality,
      };
    }

    return null;
  } catch (error) {
    console.error("[TomTom Reverse Geocoding] Erreur:", error);
    return null;
  }
}

/**
 * Search - Recherche de lieux (POI, restaurants, etc.)
 */
export async function searchPlaces(
  query: string,
  lat?: number,
  lng?: number,
  category?: string
): Promise<Array<{
  name: string;
  lat: number;
  lng: number;
  address: string;
  category?: string;
}>> {
  if (!TOMTOM_API_KEY) {
    return [];
  }

  try {
    const url = new URL("https://api.tomtom.com/search/2/search/" + encodeURIComponent(query) + ".json");
    url.searchParams.append("key", TOMTOM_API_KEY);
    url.searchParams.append("limit", "10");
    url.searchParams.append("countrySet", "FR");
    
    if (lat && lng) {
      url.searchParams.append("lat", lat.toString());
      url.searchParams.append("lon", lng.toString());
      url.searchParams.append("radius", "10000"); // 10km
    }
    
    if (category) {
      url.searchParams.append("categorySet", category);
    }

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`TomTom Search API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.results) {
      return data.results.map((result: any) => ({
        name: result.poi?.name || result.address?.freeformAddress || query,
        lat: result.position.lat,
        lng: result.position.lon,
        address: result.address?.freeformAddress || "",
        category: result.poi?.categorySet?.[0]?.id,
      }));
    }

    return [];
  } catch (error) {
    console.error("[TomTom Search] Erreur:", error);
    return [];
  }
}

/**
 * Batch Search - Recherche en lot
 */
export async function batchSearch(
  queries: string[]
): Promise<Array<{
  query: string;
  results: Array<{
    name: string;
    lat: number;
    lng: number;
    address: string;
  }>;
}>> {
  if (!TOMTOM_API_KEY || queries.length === 0) {
    return [];
  }

  // TomTom Batch Search API
  // Note: Cette API peut avoir des limites différentes
  try {
    const batchRequests = queries.map((query, index) => ({
      query: query,
      limit: 5,
    }));

    const url = new URL("https://api.tomtom.com/search/2/batch/search.json");
    url.searchParams.append("key", TOMTOM_API_KEY);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        batchItems: batchRequests,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`TomTom Batch Search API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.batchItems) {
      return data.batchItems.map((item: any, index: number) => ({
        query: queries[index],
        results: item.results?.map((result: any) => ({
          name: result.poi?.name || result.address?.freeformAddress || queries[index],
          lat: result.position.lat,
          lng: result.position.lon,
          address: result.address?.freeformAddress || "",
        })) || [],
      }));
    }

    return [];
  } catch (error) {
    console.error("[TomTom Batch Search] Erreur:", error);
    // Fallback: recherche séquentielle
    const results = await Promise.all(
      queries.map(async (query) => ({
        query,
        results: await searchPlaces(query),
      }))
    );
    return results;
  }
}

