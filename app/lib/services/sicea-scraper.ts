/**
 * Service de scraping sécurisé pour le portail SICEA avec Playwright
 * Récupère automatiquement les données de consommation électrique
 * 
 * Utilise Playwright pour gérer ASP.NET WebForms et les sessions
 * 
 * NOTE: Playwright nécessite un serveur dédié (non disponible sur Vercel serverless).
 * Pour utiliser le scraping, il faut soit:
 * - Utiliser un service externe (Browserless, ScrapingBee, etc.)
 * - Exécuter le scraping sur un serveur dédié avec Docker
 * - Utiliser une API SICEA si disponible
 */

import { logger } from "../logger";
import { calculateEnergyCost } from "./enedis-api";

// Playwright est optionnel (non disponible sur Vercel serverless)
let playwright: any = null;
try {
  // Essayer d'importer playwright (peut échouer sur Vercel)
  playwright = require("playwright");
} catch (error) {
  logger.warn("Playwright non disponible (normal sur Vercel serverless)");
}

export interface SiceaConsumptionData {
  date: string;
  consumption: number; // kWh
  cost?: number; // €
  peakHours?: number; // kWh heures pleines
  offPeakHours?: number; // kWh heures creuses
  maxPower?: number; // kW puissance max
  halfHourlyData?: Array<{
    time: string;
    consumption: number; // kWh pour cette période de 30 min
  }>;
}

export interface SiceaMeterInfo {
  prm?: string;
  meterNumber?: string;
  peakIndex?: number; // Index HEURE PLEINE
  offPeakIndex?: number; // Index HEURE CREUSE
  peakIndexDate?: string;
  offPeakIndexDate?: string;
  subscribedPower?: number; // kVA
  maxPower?: number; // kVA
  maxPowerDate?: string;
}

export interface SiceaScrapingResult {
  success: boolean;
  data?: SiceaConsumptionData[];
  meterInfo?: SiceaMeterInfo;
  error?: string;
  metadata?: {
    scrapedAt: Date;
    period: { start: Date; end: Date };
    totalRecords: number;
  };
}

/**
 * Scrape les données de consommation depuis le portail SICEA avec Playwright
 * Gère ASP.NET WebForms et les sessions de manière robuste
 * 
 * @param username - Nom d'utilisateur SICEA
 * @param password - Mot de passe SICEA
 * @param prm - Point de Référence de Mesure (PRM) - optionnel mais recommandé
 * @param startDate - Date de début
 * @param endDate - Date de fin
 * @returns Données de consommation
 */
export async function scrapeSiceaConsumption(
  username: string,
  password: string,
  prm?: string,
  startDate?: Date,
  endDate?: Date
): Promise<SiceaScrapingResult> {
  // Vérifier si Playwright est disponible
  if (!playwright) {
    logger.warn("Scraping SICEA désactivé: Playwright non disponible (Vercel serverless)");
    return {
      success: false,
      error: "Scraping non disponible sur cette plateforme. Utilisez un serveur dédié ou un service externe.",
    };
  }

  // Vérifier si les navigateurs Playwright sont installés
  try {
    // Tenter de lancer Chromium pour vérifier l'installation
    const browser = await playwright.chromium.launch({ headless: true });
    await browser.close();
  } catch (error: any) {
    if (error?.message?.includes("Executable doesn't exist") || error?.message?.includes("playwright install")) {
      logger.error("Navigateurs Playwright non installés. Exécutez: npx playwright install chromium");
      return {
        success: false,
        error: "Navigateurs Playwright non installés. Exécutez 'npx playwright install chromium' pour installer les navigateurs.",
      };
    }
    // Autre erreur, on continue quand même
  }

  // Dates par défaut (30 derniers jours si non spécifiées)
  const end = endDate || new Date();
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  let browser: any = null;

  try {
    logger.info("Démarrage scraping SICEA avec Playwright", {
      username: username.substring(0, 3) + "***", // Masquer pour les logs
      hasPRM: !!prm,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });

    // Lancer Playwright en mode headless (Chromium recommandé pour ASP.NET)
    browser = await playwright.chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled", // Éviter la détection
      ],
    });

    // Créer un contexte avec gestion des cookies et sessions
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });

    const page = await context.newPage();

    // Configurer les timeouts
    page.setDefaultTimeout(30000); // 30 secondes
    page.setDefaultNavigationTimeout(30000);

    // Aller sur le portail SICEA (SICAE Aisne)
    // URL de connexion : https://espaceclient.sicae-aisne.fr/sc/Login.aspx
    // Mise à jour: URL corrigée pour SICAE Aisne
    const siceaUrl = process.env.SICEA_PORTAL_URL || "https://espaceclient.sicae-aisne.fr/sc/Login.aspx";
    
    // Log pour debug
    logger.info("URL SICEA utilisée", { url: siceaUrl, fromEnv: !!process.env.SICEA_PORTAL_URL });
    
    try {
      await page.goto(siceaUrl, {
        waitUntil: "networkidle",
        timeout: 30000,
      });
    } catch (navigationError: any) {
      // Si erreur de navigation (DNS, réseau, etc.), retourner une erreur claire
      if (navigationError?.message?.includes("ERR_NAME_NOT_RESOLVED") || 
          navigationError?.message?.includes("net::ERR")) {
        throw new Error(`Impossible d'accéder au portail SICEA (${siceaUrl}). Vérifiez votre connexion internet et que l'URL est correcte.`);
      }
      throw navigationError;
    }

    // Attendre le chargement de la page (ASP.NET peut prendre du temps)
    await page.waitForLoadState("domcontentloaded");

    // Attendre le formulaire de connexion (ASP.NET WebForms)
    // Pour SICAE Aisne : https://espaceclient.sicae-aisne.fr/sc/Login.aspx
    await page.waitForSelector(
      'input[type="text"], input[type="email"], input[name*="Identifiant"], input[id*="Identifiant"], input[id*="username"], input[id*="login"], input[name="username"], input[name="login"]',
      { timeout: 15000 }
    );

    // Remplir le formulaire de connexion avec délais naturels
    // SICAE Aisne utilise "Identifiant" comme label
    const usernameSelectors = [
      'input[name*="Identifiant"]',
      'input[id*="Identifiant"]',
      'input[type="email"]',
      'input[type="text"]',
      'input[name="username"]',
      'input[name="login"]',
      'input[id*="username"]',
      'input[id*="login"]',
    ];
    
    const passwordSelectors = [
      'input[type="password"]',
      'input[name*="password"]',
      'input[id*="password"]',
      'input[name="password"]',
    ];

    // Trouver et remplir le champ username
    for (const selector of usernameSelectors) {
      const input = await page.$(selector);
      if (input) {
        await input.fill(username, { timeout: 5000 });
        break;
      }
    }

    // Trouver et remplir le champ password
    for (const selector of passwordSelectors) {
      const input = await page.$(selector);
      if (input) {
        await input.fill(password, { timeout: 5000 });
        break;
      }
    }

    // Si PRM est fourni, chercher et remplir le champ PRM
    if (prm) {
      const prmSelectors = [
        'input[name*="prm"]',
        'input[id*="prm"]',
        'input[name*="PRM"]',
        'input[id*="PRM"]',
        'input[placeholder*="PRM"]',
      ];
      
      for (const selector of prmSelectors) {
        const input = await page.$(selector);
        if (input) {
          await input.fill(prm, { timeout: 5000 });
          break;
        }
      }
    }

    // Soumettre le formulaire (ASP.NET peut utiliser __doPostBack)
    // Pour SICAE Aisne, chercher le bouton de connexion
    const submitSelectors = [
      'input[type="submit"]',
      'button[type="submit"]',
      'button:has-text("Connexion")',
      'button:has-text("Se connecter")',
      'input[value*="Connexion"]',
      'input[value*="Se connecter"]',
      'a[href*="javascript:__doPostBack"]',
    ];

    let submitted = false;
    for (const selector of submitSelectors) {
      const button = await page.$(selector);
      if (button) {
        await button.click();
        submitted = true;
        break;
      }
    }

    if (!submitted) {
      // Fallback: appuyer sur Enter
      await page.keyboard.press("Enter");
    }

    // Attendre la navigation (ASP.NET peut faire plusieurs redirections)
    await page.waitForLoadState("networkidle", { timeout: 20000 });
    
    // Attendre un peu pour que les ViewStates ASP.NET se chargent
    await page.waitForTimeout(2000);

    // Vérifier si la connexion a réussi
    // Pour SICAE Aisne, après connexion on arrive sur /sc/Site.aspx
    const currentUrl = page.url();
    if (currentUrl.includes("Login.aspx") || currentUrl.includes("login") || currentUrl.includes("connexion")) {
      // Vérifier s'il y a un message d'erreur
      const errorMessage = await page.textContent('.error, .alert-danger, [class*="error"]').catch(() => null);
      throw new Error(`Échec de la connexion au portail SICEA${errorMessage ? `: ${errorMessage}` : ""}`);
    }

    logger.info("Connexion SICEA réussie", { url: currentUrl });

    // Naviguer vers la page de consommation
    // Chercher les liens/menus vers la consommation
    const consumptionLinks = [
      'a[href*="consommation"]',
      'a[href*="consumption"]',
      'a:has-text("Consommation")',
      'a:has-text("Mes données")',
      'a:has-text("Relevés")',
    ];

    let consumptionPage = page;
    for (const linkSelector of consumptionLinks) {
      const link = await page.$(linkSelector);
      if (link) {
        await link.click();
        await page.waitForLoadState("networkidle", { timeout: 15000 });
        await page.waitForTimeout(1000); // Attendre le chargement ASP.NET
        break;
      }
    }

    // Si pas de lien trouvé, essayer d'aller directement sur l'URL de consommation
    if (page.url() === currentUrl) {
      const consumptionUrls = [
        `${currentUrl}/consommation`,
        `${currentUrl}/Consommation`,
        `${currentUrl}/mes-donnees`,
        `${currentUrl}/releves`,
      ];
      
      for (const url of consumptionUrls) {
        try {
          await page.goto(url, { waitUntil: "networkidle", timeout: 10000 });
          await page.waitForTimeout(1000);
          if (!page.url().includes("login") && !page.url().includes("connexion")) {
            break;
          }
        } catch (e) {
          continue;
        }
      }
    }

    // Extraire les données de consommation avec Playwright
    // Playwright evaluate ne peut recevoir qu'un seul argument, donc on passe un objet
    const consumptionData = await page.evaluate(({ start, end }: { start: string; end: string }) => {
      const data: SiceaConsumptionData[] = [];
      const startDate = new Date(start);
      const endDate = new Date(end);

      // Chercher les tableaux de consommation (ASP.NET GridView, etc.)
      const tables = document.querySelectorAll("table, .consumption-table, .data-table, .GridView, table[id*='grid']");
      
      tables.forEach((table) => {
        const rows = table.querySelectorAll("tr");
        rows.forEach((row, index) => {
          if (index === 0) return; // Skip header

          const cells = row.querySelectorAll("td, th");
          if (cells.length >= 2) {
            const dateText = cells[0]?.textContent?.trim() || "";
            const consumptionText = cells[1]?.textContent?.trim() || "";
            const costText = cells[2]?.textContent?.trim() || "";

            if (dateText && consumptionText) {
              // Parser la date (formats français courants)
              let date: Date | null = null;
              const dateFormats = [
                /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
                /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
                /(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
              ];

              for (const format of dateFormats) {
                const match = dateText.match(format);
                if (match) {
                  if (format === dateFormats[0]) {
                    date = new Date(`${match[3]}-${match[2]}-${match[1]}`);
                  } else {
                    date = new Date(match[0]);
                  }
                  break;
                }
              }

              if (!date) {
                date = new Date(dateText);
              }

              const consumption = parseFloat(consumptionText.replace(/[^\d.,]/g, "").replace(",", "."));
              // Calculer le coût avec les tarifs réglementés français
              // Si un coût est fourni par SICEA, on le vérifie, sinon on le calcule
              let cost: number;
              if (costText) {
                const parsedCost = parseFloat(costText.replace(/[^\d.,]/g, "").replace(",", "."));
                // Vérifier si le coût est réaliste (sinon recalculer avec les tarifs réglementés)
                const expectedCost = calculateEnergyCost(consumption, undefined, undefined, 9);
                if (!isNaN(parsedCost) && Math.abs(parsedCost - expectedCost) / expectedCost < 0.5) {
                  cost = parsedCost;
                } else {
                  cost = expectedCost;
                }
              } else {
                cost = calculateEnergyCost(consumption, undefined, undefined, 9);
              }

              if (!isNaN(consumption) && !isNaN(date.getTime()) && date >= startDate && date <= endDate) {
                data.push({
                  date: date.toISOString().split("T")[0],
                  consumption,
                  cost,
                });
              }
            }
          }
        });
      });

      // Chercher dans les scripts (données JSON injectées par ASP.NET)
      const scripts = document.querySelectorAll("script");
      scripts.forEach((script) => {
        const content = script.textContent || "";
        if (content.includes("consumption") || content.includes("consommation") || content.includes("data")) {
          try {
            // Extraire les données JSON
            const jsonMatches = content.match(/\{[\s\S]{0,5000}"consumption"[\s\S]{0,5000}\}/g);
            if (jsonMatches) {
              jsonMatches.forEach((match) => {
                try {
                  const jsonData = JSON.parse(match);
                  if (Array.isArray(jsonData)) {
                    jsonData.forEach((item: any) => {
                      if (item.date && item.consumption) {
                        const itemDate = new Date(item.date);
                        if (itemDate >= startDate && itemDate <= endDate) {
                          data.push({
                            date: itemDate.toISOString().split("T")[0],
                            consumption: parseFloat(item.consumption),
                            cost: item.cost ? parseFloat(item.cost) : undefined,
                          });
                        }
                      }
                    });
                  }
                } catch (e) {
                  // Ignorer les erreurs de parsing
                }
              });
            }
          } catch (e) {
            // Ignorer les erreurs
          }
        }
      });

      // Extraire les informations du compteur (index, puissance, etc.)
      const meterInfo: any = {};
      
      // Chercher les index HEURE PLEINE et HEURE CREUSE
      const indexElements = document.querySelectorAll('[class*="index"], [id*="index"], [class*="Index"], [id*="Index"]');
      indexElements.forEach((el) => {
        const text = el.textContent || "";
        if (text.includes("HEURE PLEINE") || text.includes("Heure Pleine") || text.includes("HP")) {
          const match = text.match(/(\d{9,})/);
          if (match) {
            meterInfo.peakIndex = parseInt(match[1]);
            const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);
            if (dateMatch) {
              meterInfo.peakIndexDate = dateMatch[1];
            }
          }
        }
        if (text.includes("HEURE CREUSE") || text.includes("Heure Creuse") || text.includes("HC")) {
          const match = text.match(/(\d{9,})/);
          if (match) {
            meterInfo.offPeakIndex = parseInt(match[1]);
            const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);
            if (dateMatch) {
              meterInfo.offPeakIndexDate = dateMatch[1];
            }
          }
        }
      });
      
      // Chercher la puissance souscrite et maximum
      const powerElements = document.querySelectorAll('[class*="puissance"], [id*="puissance"], [class*="power"], [id*="power"]');
      powerElements.forEach((el) => {
        const text = el.textContent || "";
        if (text.includes("souscrite") || text.includes("Souscrite")) {
          const match = text.match(/(\d+(?:[.,]\d+)?)\s*kVA/i);
          if (match) {
            meterInfo.subscribedPower = parseFloat(match[1].replace(",", "."));
          }
        }
        if (text.includes("maximum") || text.includes("Maximum") || text.includes("max")) {
          const match = text.match(/(\d+(?:[.,]\d+)?)\s*kVA/i);
          if (match) {
            meterInfo.maxPower = parseFloat(match[1].replace(",", "."));
            const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);
            if (dateMatch) {
              meterInfo.maxPowerDate = dateMatch[1];
            }
          }
        }
      });
      
      // Chercher PRM et numéro de compteur
      const prmMatch = document.body.textContent?.match(/PRM\s*(\d{14})/i);
      if (prmMatch) {
        meterInfo.prm = prmMatch[1];
      }
      
      const meterMatch = document.body.textContent?.match(/COMPTEUR\s*(\d{12})/i);
      if (meterMatch) {
        meterInfo.meterNumber = meterMatch[1];
      }

      return { data, meterInfo };
    }, { start: start.toISOString(), end: end.toISOString() });

    // Extraire les données et les infos du compteur
    const extractedData = consumptionData.data || [];
    const meterInfo = consumptionData.meterInfo || {};

    // Si aucune donnée trouvée, essayer d'exporter en CSV
    if (extractedData.length === 0) {
      logger.warn("Aucune donnée trouvée dans les tableaux, tentative export CSV");
      
      // Chercher un bouton d'export CSV
      const csvSelectors = [
        'button:has-text("Exporter")',
        'a:has-text("CSV")',
        'button[data-export="csv"]',
        'a[href*="export"]',
      ];
      
      for (const selector of csvSelectors) {
        const csvButton = await page.$(selector);
        if (csvButton) {
          // Télécharger le CSV (à implémenter si nécessaire)
          logger.info("Bouton d'export CSV trouvé mais non implémenté");
          break;
        }
      }
    }

    await context.close();
    await browser.close();
    browser = null;

    logger.info("Scraping SICEA terminé", {
      recordsFound: extractedData.length,
      hasMeterInfo: !!meterInfo && Object.keys(meterInfo).length > 0,
    });

    return {
      success: true,
      data: extractedData,
      meterInfo: Object.keys(meterInfo).length > 0 ? meterInfo : undefined,
      metadata: {
        scrapedAt: new Date(),
        period: { start, end },
        totalRecords: extractedData.length,
      },
    };
  } catch (error) {
    logger.error("Erreur scraping SICEA", error);

    if (browser) {
      await browser.close();
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue lors du scraping",
    };
  }
}

/**
 * Teste la connexion au portail SICEA avec Playwright
 */
export async function testSiceaConnection(
  username: string,
  password: string,
  prm?: string
): Promise<{ success: boolean; error?: string; skipTest?: boolean }> {
  // Vérifier si Playwright est disponible
  if (!playwright) {
    return {
      success: false,
      error: "Playwright non disponible (Vercel serverless)",
      skipTest: true, // Indique qu'on peut skip le test
    };
  }

  let browser: any = null;

  try {
    browser = await playwright.chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    });

    const page = await context.newPage();
    // URL de connexion SICAE Aisne : https://espaceclient.sicae-aisne.fr/sc/Login.aspx
    const siceaUrl = process.env.SICEA_PORTAL_URL || "https://espaceclient.sicae-aisne.fr/sc/Login.aspx";
    
    await page.goto(siceaUrl, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForLoadState("domcontentloaded");

    // Tenter la connexion (SICAE Aisne)
    const usernameSelectors = [
      'input[name*="Identifiant"]',
      'input[id*="Identifiant"]',
      'input[type="email"]',
      'input[type="text"]',
      'input[name="username"]',
      'input[name="login"]',
      'input[id*="username"]',
      'input[id*="login"]',
    ];
    
    const passwordSelectors = [
      'input[type="password"]',
      'input[name*="password"]',
      'input[id*="password"]',
      'input[name="password"]',
    ];

    // Remplir username
    for (const selector of usernameSelectors) {
      const input = await page.$(selector);
      if (input) {
        await input.fill(username);
        break;
      }
    }

    // Remplir password
    for (const selector of passwordSelectors) {
      const input = await page.$(selector);
      if (input) {
        await input.fill(password);
        break;
      }
    }

    // Remplir PRM si fourni
    if (prm) {
      const prmInput = await page.$('input[name*="prm"], input[id*="prm"]');
      if (prmInput) {
        await prmInput.fill(prm);
      }
    }

    // Soumettre (SICAE Aisne)
    const submitButton = await page.$('input[type="submit"], button[type="submit"], input[value*="Connexion"]');
    if (submitButton) {
      await submitButton.click();
    } else {
      await page.keyboard.press("Enter");
    }

    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    // Pour SICAE Aisne, après connexion on arrive sur /sc/Site.aspx
    const isLoggedIn = !currentUrl.includes("Login.aspx") && !currentUrl.includes("login") && !currentUrl.includes("connexion");

    await context.close();
    await browser.close();

    return {
      success: isLoggedIn,
      error: isLoggedIn ? undefined : "Échec de la connexion",
    };
  } catch (error) {
    if (browser) {
      await browser.close();
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

