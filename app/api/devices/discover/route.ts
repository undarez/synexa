import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import { discoverAllDevices, type DiscoveryOptions } from "@/app/lib/devices/discovery";

/**
 * Découvre les devices WiFi/Bluetooth disponibles
 * GET /api/devices/discover?type=WIFI&timeout=10000
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    
    const searchParams = request.nextUrl.searchParams;
    const connectionType = searchParams.get("type") as "WIFI" | "BLUETOOTH" | "BOTH" | null;
    const timeout = searchParams.get("timeout")
      ? parseInt(searchParams.get("timeout")!, 10)
      : undefined;
    const deviceType = searchParams.get("deviceType") as
      | "LIGHT"
      | "THERMOSTAT"
      | "MEDIA"
      | "OUTLET"
      | "SENSOR"
      | "OTHER"
      | null;

    const options: DiscoveryOptions = {
      timeout,
      connectionType: connectionType || "BOTH",
      filter: deviceType ? { type: deviceType } : undefined,
    };

    const devices = await discoverAllDevices(options);

    return NextResponse.json({
      success: true,
      devices,
      count: devices.length,
    });
  } catch (error) {
    console.error("[GET /api/devices/discover]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erreur lors de la découverte",
      },
      { status: 400 }
    );
  }
}

/**
 * Lance une découverte manuelle
 * POST /api/devices/discover
 * Body: { connectionType?: "WIFI" | "BLUETOOTH" | "BOTH", timeout?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    
    const body = await request.json();
    const options: DiscoveryOptions = {
      timeout: body.timeout || 10000,
      connectionType: body.connectionType || "BOTH",
      filter: body.filter,
    };

    const devices = await discoverAllDevices(options);

    return NextResponse.json({
      success: true,
      devices,
      count: devices.length,
    });
  } catch (error) {
    console.error("[POST /api/devices/discover]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erreur lors de la découverte",
      },
      { status: 400 }
    );
  }
}

