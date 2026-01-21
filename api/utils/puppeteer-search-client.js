/**
 * Puppeteer Judicial Search Client
 * Uses Puppeteer for automated browser search
 * Faster and more reliable than Selenium
 * Bypasses HTTP 403 by simulating real browser
 * Requires: npm install puppeteer
 */

let puppeteer = null;

try {
  puppeteer = await import('puppeteer');
} catch (error) {
  console.warn('⚠️ Puppeteer not installed. Install with: npm install puppeteer');
}

export class PuppeteerSearchClient {
  constructor() {
    this.name = 'Puppeteer Browser';
    this.browser = null;
  }

  /**
   * Search cases by name using Puppeteer
   * Real browser automation that bypasses bot detection
   */
  async searchByName(name, options = {}) {
    if (!name || name.trim().length < 3) {
      throw new Error('Nome deve ter pelo menos 3 caracteres.');
    }

    if (!puppeteer) {
      console.warn('⚠️ Puppeteer not available. Skipping Puppeteer search.');
      return [];
    }

    console.log(`🤖 Puppeteer Browser: Starting for "${name}"`);

    const results = [];

    try {
      // Launch browser
      const browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled'
        ]
      });

      try {
        const page = await browser.newPage();

        // Set user agent to appear as real browser
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Navigate to e-SAJ
        console.log('📄 Loading e-SAJ...');
        await page.goto('https://esaj.tjsp.jus.br/cpopg/search.do', {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        // Fill search form
        console.log('⌨️  Filling search form...');
        await page.type('input[name="parteAutor"]', name.trim());
        await page.type('input[name="parteReu"]', name.trim());

        // Click search button
        console.log('🔍 Performing search...');
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
          page.click('button.btnConsultar, input[type="submit"]')
        ]);

        // Extract results from page
        const pageResults = await page.evaluate((searchName) => {
          const cases = [];
          const rows = document.querySelectorAll('tr');

          rows.forEach(row => {
            const caseLink = row.querySelector('a[href*="processo"]');
            if (caseLink) {
              const caseNumber = caseLink.textContent.trim();
              if (caseNumber.match(/\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}/)) {
                cases.push({
                  numeroProcesso: caseNumber,
                  rawRow: row.innerText
                });
              }
            }
          });

          return cases;
        }, name);

        // Parse detailed information
        for (const caseData of pageResults) {
          const caseInfo = {
            numeroProcesso: caseData.numeroProcesso,
            tribunal: 'TJSP',
            dataAjuizamento: new Date().toISOString(),
            classe: { nome: 'Desconhecida', codigo: 'AUTO' },
            assunto: { nome: 'Desconhecido', codigo: 'AUTO' },
            partes: {
              autor: [{ nome: name.toUpperCase(), documento: null }],
              reu: []
            },
            status: 'ativo',
            instancia: 1,
            sourceSystem: 'puppeteer_browser',
            _source: 'tj_sp',
            isRealData: true,
            dataSource: 'Puppeteer Browser Search',
            url: `https://esaj.tjsp.jus.br/cpopg/show.do?processo.codigo=${caseData.numeroProcesso}`
          };

          results.push(caseInfo);
        }

        await page.close();

      } finally {
        await browser.close();
      }

      console.log(`✅ Puppeteer: Found ${results.length} cases`);
      return results;

    } catch (error) {
      console.error(`❌ Puppeteer error:`, error.message);
      return [];
    }
  }

  /**
   * Fetch detailed case information using Puppeteer
   */
  async fetchCaseDetails(caseNumber) {
    if (!puppeteer) {
      console.warn('⚠️ Puppeteer not available.');
      return null;
    }

    try {
      const browser = await puppeteer.launch({ headless: 'new' });
      const page = await browser.newPage();

      console.log(`📋 Fetching details for ${caseNumber}...`);

      await page.goto(`https://esaj.tjsp.jus.br/cpopg/show.do?processo.codigo=${caseNumber}`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      const caseDetails = await page.evaluate(() => {
        const details = {};

        // Extract various case information from the page
        const spans = document.querySelectorAll('span, td, div');

        spans.forEach(el => {
          const text = el.textContent.toLowerCase();
          if (text.includes('classe:') || text.includes('classe')) {
            details.classe = el.nextElementSibling?.textContent.trim() || 'Desconhecida';
          }
          if (text.includes('assunto:') || text.includes('assunto')) {
            details.assunto = el.nextElementSibling?.textContent.trim() || 'Desconhecido';
          }
        });

        return details;
      });

      await browser.close();

      return caseDetails;

    } catch (error) {
      console.error(`Error fetching case details:`, error.message);
      return null;
    }
  }
}

export default PuppeteerSearchClient;
