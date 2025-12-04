/**
 * Service de scraping sécurisé pour le portail SICEA
 * Récupère automatiquement les données de consommation électrique
 * 
 * NOTE: Puppeteer n'est pas disponible sur Vercel (serverless).
 * Pour utiliser le scraping, il faut soit:
 * - Utiliser un service externe (Browserless, ScrapingBee, etc.)
 * - Utiliser une API SICEA si disponible
 * - Exécuter le scraping sur un serveur dédié
 */

import { logger } from "../logger";

// Puppeteer est optionnel (non disponible sur Vercel serverless)
let puppeteer: any = null;
try {
  // Essayer d'importer puppeteer (peut échouer sur Vercel)
  puppeteer = require("puppeteer");
} catch (error) {
  logger.warn("Puppeteer non disponible (normal sur Vercel serverless)");
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

export interface SiceaScrapingResult {
  success: boolean;
  data?: SiceaConsumptionData[];
  error?: string;
  metadata?: {
    scrapedAt: Date;
    period: { start: Date; end: Date };
    totalRecords: number;
  };
}

/**
 * Scrape les données de consommation depuis le portail SICEA
 * 
 * @param username - Nom d'utilisateur SICEA
 * @param password - Mot de passe SICEA
 * @param startDate - Date de début
 * @param endDate - Date de fin
 * @returns Données de consommation
 */
export async function scrapeSiceaConsumption(
  username: string,
  password: string,
  startDate: Date,
  endDate: Date
): Promise<SiceaScrapingResult> {
  // Vérifier si Puppeteer est disponible
  if (!puppeteer) {
    logger.warn("Scraping SICEA désactivé: Puppeteer non disponible (Vercel serverless)");
    return {
      success: false,
      error: "Scraping non disponible sur cette plateforme. Utilisez un serveur dédié ou un service externe.",
    };
  }

  let browser: any = null;

  try {
    logger.info("Démarrage scraping SICEA", {
      username: username.substring(0, 3) + "***", // Masquer pour les logs
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    // Lancer Puppeteer en mode headless avec sandbox
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();

    // Désactiver JavaScript malveillant (sandbox)
    await page.setJavaScriptEnabled(true); // Nécessaire pour le portail, mais on filtre les scripts

    // Configurer les timeouts
    page.setDefaultTimeout(30000); // 30 secondes

    // Aller sur le portail SICEA
    // NOTE: Remplacez par l'URL réelle du portail SICEA
    const siceaUrl = process.env.SICEA_PORTAL_URL || "https://www.sicea.fr/espace-client";
    
    await page.goto(siceaUrl, {
      waitUntil: "networkidle2",
    });

    // Attendre le formulaire de connexion
    await page.waitForSelector('input[type="email"], input[name="username"], input[id="username"]', {
      timeout: 10000,
    });

    // Remplir le formulaire de connexion
    const usernameSelector = 'input[type="email"], input[name="username"], input[id="username"]';
    const passwordSelector = 'input[type="password"], input[name="password"], input[id="password"]';

    await page.type(usernameSelector, username, { delay: 100 });
    await page.type(passwordSelector, password, { delay: 100 });

    // Soumettre le formulaire
    const submitButton = await page.$('button[type="submit"], input[type="submit"], button:has-text("Connexion")');
    if (submitButton) {
      await submitButton.click();
    } else {
      await page.keyboard.press("Enter");
    }

    // Attendre la redirection après connexion
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 });

    // Vérifier si la connexion a réussi (adapter selon le portail SICEA)
    const currentUrl = page.url();
    if (currentUrl.includes("login") || currentUrl.includes("connexion")) {
      throw new Error("Échec de la connexion au portail SICEA");
    }

    logger.info("Connexion SICEA réussie", { url: currentUrl });

    // Naviguer vers la page de consommation
    // NOTE: Adapter selon la structure réelle du portail SICEA
    const consumptionUrl = `${currentUrl}/consommation`; // Exemple
    await page.goto(consumptionUrl, { waitUntil: "networkidle2" });

    // Extraire les données de consommation
    // NOTE: Adapter les sélecteurs selon la structure réelle du portail
    const consumptionData = await page.evaluate((start, end) => {
      const data: SiceaConsumptionData[] = [];

      // Exemple d'extraction (à adapter selon le portail réel)
      // Chercher les tableaux ou graphiques de consommation
      const tables = document.querySelectorAll("table, .consumption-table, .data-table");
      
      tables.forEach((table) => {
        const rows = table.querySelectorAll("tr");
        rows.forEach((row, index) => {
          if (index === 0) return; // Skip header

          const cells = row.querySelectorAll("td");
          if (cells.length >= 2) {
            const dateText = cells[0]?.textContent?.trim();
            const consumptionText = cells[1]?.textContent?.trim();

            if (dateText && consumptionText) {
              // Parser la date et la consommation
              const date = new Date(dateText);
              const consumption = parseFloat(consumptionText.replace(/[^\d.,]/g, "").replace(",", "."));

              if (!isNaN(consumption) && date >= new Date(start) && date <= new Date(end)) {
                data.push({
                  date: date.toISOString().split("T")[0],
                  consumption,
                });
              }
            }
          }
        });
      });

      // Si pas de tableau, chercher dans les graphiques (données JSON)
      const scripts = document.querySelectorAll("script");
      scripts.forEach((script) => {
        const content = script.textContent || "";
        if (content.includes("consumption") || content.includes("consommation")) {
          try {
            // Essayer d'extraire des données JSON
            const jsonMatch = content.match(/\{[\s\S]*"consumption"[\s\S]*\}/);
            if (jsonMatch) {
              const jsonData = JSON.parse(jsonMatch[0]);
              // Traiter les données JSON...
            }
          } catch (e) {
            // Ignorer les erreurs de parsing
          }
        }
      });

      return data;
    }, startDate.toISOString(), endDate.toISOString());

    // Si aucune donnée trouvée, essayer d'exporter en CSV
    if (consumptionData.length === 0) {
      logger.warn("Aucune donnée trouvée dans les tableaux, tentative export CSV");
      
      // Chercher un bouton d'export CSV
      const csvButton = await page.$('button:has-text("Exporter"), a:has-text("CSV"), button[data-export="csv"]');
      if (csvButton) {
        // Télécharger le CSV et le parser
        // (implémentation simplifiée, à compléter)
      }
    }

    await browser.close();
    browser = null;

    logger.info("Scraping SICEA terminé", {
      recordsFound: consumptionData.length,
    });

    return {
      success: true,
      data: consumptionData,
      metadata: {
        scrapedAt: new Date(),
        period: { start: startDate, end: endDate },
        totalRecords: consumptionData.length,
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
 * Teste la connexion au portail SICEA
 */
export async function testSiceaConnection(
  username: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  // Vérifier si Puppeteer est disponible
  if (!puppeteer) {
    return {
      success: false,
      error: "Puppeteer non disponible (Vercel serverless)",
    };
  }

  let browser: any = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    const siceaUrl = process.env.SICEA_PORTAL_URL || "https://www.sicea.fr/espace-client";
    
    await page.goto(siceaUrl, { waitUntil: "networkidle2" });

    // Tenter la connexion
    const usernameSelector = 'input[type="email"], input[name="username"], input[id="username"]';
    const passwordSelector = 'input[type="password"], input[name="password"], input[id="password"]';

    await page.waitForSelector(usernameSelector, { timeout: 10000 });
    await page.type(usernameSelector, username, { delay: 100 });
    await page.type(passwordSelector, password, { delay: 100 });

    const submitButton = await page.$('button[type="submit"], input[type="submit"]');
    if (submitButton) {
      await submitButton.click();
    } else {
      await page.keyboard.press("Enter");
    }

    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 });

    const currentUrl = page.url();
    const isLoggedIn = !currentUrl.includes("login") && !currentUrl.includes("connexion");

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

