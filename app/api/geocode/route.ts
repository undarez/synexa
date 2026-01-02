import { NextRequest, NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/session";

export async function GET(request: NextRequest) {
  try {
    await requireUser(); // Vérifier que l'utilisateur est authentifié
    
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get("address");
    const reverse = searchParams.get("reverse") === "true";

    if (!address || !address.trim()) {
      return NextResponse.json(
        { error: "Adresse ou coordonnées requises" },
        { status: 400 }
      );
    }

    let url: string;
    
    if (reverse) {
      // Géocodage inverse : coordonnées -> adresse
      const coords = address.trim().split(",");
      if (coords.length !== 2) {
        return NextResponse.json(
          { error: "Format de coordonnées invalide. Utilisez: lat,lng" },
          { status: 400 }
        );
      }
      const lat = parseFloat(coords[0]);
      const lng = parseFloat(coords[1]);
      if (isNaN(lat) || isNaN(lng)) {
        return NextResponse.json(
          { error: "Coordonnées invalides" },
          { status: 400 }
        );
      }
      url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
    } else {
      // Géocodage direct : adresse -> coordonnées
      url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address.trim())}&limit=1&addressdetails=1`;
    }

    // Utiliser l'API de géocodage Nominatim (OpenStreetMap) - gratuit
    // Ajouter un délai pour respecter la politique de rate limiting de Nominatim
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Synexa App (contact@synexa.app)", // User-Agent requis par Nominatim
        "Accept-Language": "fr-FR,fr;q=0.9",
      },
    });

    if (!response.ok) {
      console.error("[GET /geocode] Erreur Nominatim:", response.status, response.statusText);
      return NextResponse.json(
        { error: `Erreur lors du géocodage (${response.status}). Veuillez réessayer plus tard.` },
        { status: 500 }
      );
    }

    const data = await response.json();
    
    if (reverse) {
      // Géocodage inverse
      if (!data || !data.lat || !data.lon) {
        return NextResponse.json(
          { error: "Adresse introuvable pour ces coordonnées." },
          { status: 404 }
        );
      }

      return NextResponse.json({
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lon),
        displayName: data.display_name,
        address: data.address,
      });
    } else {
      // Géocodage direct
      if (!data || data.length === 0) {
        // Essayer une recherche plus large en retirant certains détails
        const simplifiedAddress = address.trim()
          .replace(/\s*,\s*/g, ' ') // Remplacer les virgules par des espaces
          .replace(/\s+/g, ' '); // Normaliser les espaces
        
        if (simplifiedAddress !== address.trim()) {
          // Essayer avec l'adresse simplifiée
          const retryUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(simplifiedAddress)}&limit=1&addressdetails=1`;
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const retryResponse = await fetch(retryUrl, {
            headers: {
              "User-Agent": "Synexa App (contact@synexa.app)",
              "Accept-Language": "fr-FR,fr;q=0.9",
            },
          });
          
          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            if (retryData && retryData.length > 0) {
              const result = retryData[0];
              const lat = parseFloat(result.lat);
              const lng = parseFloat(result.lon);
              
              if (!isNaN(lat) && !isNaN(lng)) {
                return NextResponse.json({
                  lat,
                  lng,
                  displayName: result.display_name,
                  address: result.address,
                });
              }
            }
          }
        }
        
        return NextResponse.json(
          { 
            error: "Adresse introuvable. Essayez de simplifier l'adresse (ex: 'Ploisy, France' ou 'Rue du Terroir, Ploisy') ou vérifiez l'orthographe." 
          },
          { status: 404 }
        );
      }

      const result = data[0];
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);

      if (isNaN(lat) || isNaN(lng)) {
        return NextResponse.json(
          { error: "Coordonnées invalides retournées par le service de géocodage." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        lat,
        lng,
        displayName: result.display_name,
        address: result.address,
      });
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[GET /geocode]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

