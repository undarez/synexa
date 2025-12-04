/**
 * Pare-feu applicatif pour protéger les API Synexa
 * Filtrage IP, rate limiting, blocage des requêtes suspectes
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "../logger";

// Cache en mémoire pour le rate limiting (à remplacer par Redis en production)
const rateLimitCache = new Map<string, { count: number; resetAt: number }>();

// Liste des IPs bloquées (en production, utiliser Redis ou une base de données)
const blockedIPs = new Set<string>();

// Liste des IPs autorisées (optionnel, pour whitelist)
const allowedIPs = new Set<string>();

export interface FirewallConfig {
  enabled: boolean;
  rateLimit?: {
    windowMs: number; // Fenêtre de temps en ms
    maxRequests: number; // Nombre max de requêtes
  };
  blockSuspiciousRequests?: boolean;
  allowedIPs?: string[];
  blockedIPs?: string[];
}

const defaultConfig: FirewallConfig = {
  enabled: true,
  rateLimit: {
    windowMs: 60000, // 1 minute
    maxRequests: 100, // 100 requêtes par minute
  },
  blockSuspiciousRequests: true,
};

/**
 * Extrait l'adresse IP de la requête
 */
function getClientIP(request: NextRequest): string {
  // Vérifier les headers de proxy (X-Forwarded-For, X-Real-IP)
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  // Fallback (ne devrait jamais arriver en production avec un reverse proxy)
  return "unknown";
}

/**
 * Vérifie si une IP est bloquée
 */
function isIPBlocked(ip: string): boolean {
  return blockedIPs.has(ip);
}

/**
 * Vérifie si une IP est autorisée (whitelist)
 */
function isIPAllowed(ip: string, config: FirewallConfig): boolean {
  if (config.allowedIPs && config.allowedIPs.length > 0) {
    return config.allowedIPs.includes(ip);
  }
  return true; // Pas de whitelist = toutes les IPs sont autorisées
}

/**
 * Vérifie le rate limiting
 */
function checkRateLimit(ip: string, config: FirewallConfig): boolean {
  if (!config.rateLimit) {
    return true; // Pas de rate limiting configuré
  }

  const now = Date.now();
  const key = ip;
  const cached = rateLimitCache.get(key);

  if (!cached || now > cached.resetAt) {
    // Nouvelle fenêtre
    rateLimitCache.set(key, {
      count: 1,
      resetAt: now + config.rateLimit.windowMs,
    });
    return true;
  }

  if (cached.count >= config.rateLimit.maxRequests) {
    // Limite dépassée
    logger.warn("Rate limit dépassé", { ip, count: cached.count });
    return false;
  }

  // Incrémenter le compteur
  cached.count++;
  rateLimitCache.set(key, cached);
  return true;
}

/**
 * Détecte les requêtes suspectes
 */
function isSuspiciousRequest(request: NextRequest): boolean {
  const userAgent = request.headers.get("user-agent") || "";
  const path = request.nextUrl.pathname;

  // User agent suspect ou vide
  if (!userAgent || userAgent.length < 10) {
    return true;
  }

  // Patterns suspects dans l'URL
  const suspiciousPatterns = [
    /\.\./, // Path traversal
    /<script/i, // Injection XSS
    /union.*select/i, // SQL injection
    /eval\(/i, // Code injection
    /javascript:/i, // JavaScript injection
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(path) || pattern.test(request.url)) {
      return true;
    }
  }

  // Headers suspects
  const contentType = request.headers.get("content-type");
  if (contentType && !contentType.match(/^(application\/json|application\/x-www-form-urlencoded|multipart\/form-data|text\/plain)/)) {
    // Content-Type suspect pour une API
    return true;
  }

  return false;
}

/**
 * Bloque une IP
 */
export function blockIP(ip: string, reason?: string): void {
  blockedIPs.add(ip);
  logger.warn("IP bloquée", { ip, reason });
}

/**
 * Débloque une IP
 */
export function unblockIP(ip: string): void {
  blockedIPs.delete(ip);
  logger.info("IP débloquée", { ip });
}

/**
 * Middleware de pare-feu pour protéger les routes API
 */
export function firewallMiddleware(config: FirewallConfig = defaultConfig) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    if (!config.enabled) {
      return null; // Pare-feu désactivé
    }

    const ip = getClientIP(request);

    // Vérifier la whitelist
    if (!isIPAllowed(ip, config)) {
      logger.warn("IP non autorisée", { ip, path: request.nextUrl.pathname });
      return NextResponse.json(
        { error: "Accès refusé" },
        { status: 403 }
      );
    }

    // Vérifier si l'IP est bloquée
    if (isIPBlocked(ip)) {
      logger.warn("IP bloquée", { ip, path: request.nextUrl.pathname });
      return NextResponse.json(
        { error: "Accès refusé" },
        { status: 403 }
      );
    }

    // Vérifier le rate limiting
    if (!checkRateLimit(ip, config)) {
      blockIP(ip, "Rate limit dépassé");
      return NextResponse.json(
        { error: "Trop de requêtes. Veuillez réessayer plus tard." },
        { status: 429 }
      );
    }

    // Détecter les requêtes suspectes
    if (config.blockSuspiciousRequests && isSuspiciousRequest(request)) {
      logger.warn("Requête suspecte détectée", {
        ip,
        path: request.nextUrl.pathname,
        userAgent: request.headers.get("user-agent"),
      });
      blockIP(ip, "Requête suspecte");
      return NextResponse.json(
        { error: "Requête suspecte détectée" },
        { status: 400 }
      );
    }

    // Requête autorisée
    return null;
  };
}

/**
 * Nettoie le cache de rate limiting (à appeler périodiquement)
 */
export function cleanRateLimitCache(): void {
  const now = Date.now();
  for (const [key, value] of rateLimitCache.entries()) {
    if (now > value.resetAt) {
      rateLimitCache.delete(key);
    }
  }
}

// Nettoyer le cache toutes les 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanRateLimitCache, 5 * 60 * 1000);
}

