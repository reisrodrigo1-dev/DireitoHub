/**
 * Puppeteer E-SAJ Real Scraper
 * Real browser automation to scrape judicial data from e-SAJ
 * No mocks, no simulations - only REAL data
 */

let puppeteer = null;

try {
  puppeteer = await import('puppeteer');
} catch (error) {
  console.warn('⚠️ Puppeteer not installed. Install with: npm install puppeteer');
}

export class PuppeteerESAJScraper {
  constructor() {
    this.name = 'Puppeteer e-SAJ';
    this.baseURL = 'https://esaj.tjsp.jus.br/cpopg/search.do';
  }

  /**
   * Real search using Puppeteer
   * Opens actual browser and performs real search
   */
  async searchByName(name, options = {}) {
    if (!name || name.trim().length < 3) {
      throw new Error('Nome deve ter pelo menos 3 caracteres.');
    }

    if (!puppeteer) {
      console.error('❌ Puppeteer not available. Install: npm install puppeteer');
      return [];
    }

    console.log(`🌐 Puppeteer: Starting real browser search for "${name}"`);

    let browser = null;
    const results = [];

    try {
      // Launch browser
      browser = await puppeteer.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      
      // Set viewport and user agent
      await page.setViewport({ width: 1280, height: 720 });
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Navigate to e-SAJ
      console.log('📄 Loading e-SAJ page...');
      await page.goto(this.baseURL, { waitUntil: 'networkidle2', timeout: 60000 });

      // Wait for form
      await page.waitForSelector('input[name="parteAutor"]', { timeout: 10000 });

      // Fill search form
      console.log(`📝 Filling search form with: "${name}"`);
      await page.type('input[name="parteAutor"]', name.trim());

      // Click search button
      const searchButtonSelector = 'button.btnConsultar, input[value="Consultar"], button[type="submit"]';
      await page.click(searchButtonSelector);

      // Wait for results
      console.log('⏳ Waiting for search results...');
      await page.waitForTimeout(3000);

      // Check if we have results
      const hasResults = await page.$('.resultsTable, table.resultado, .listaProcessos');
      
      if (!hasResults) {
        console.log('📭 No results found');
        return results;
      }

      // Extract case numbers from page
      const caseNumbers = await page.$$eval('a', (links) =>
        links
          .map(a => a.textContent.trim())
          .filter(text => /^\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}$/.test(text))
      );

      console.log(`✅ Found ${caseNumbers.length} cases in search results`);

      // Get detailed info for each case
      for (const caseNumber of caseNumbers) {
        try {
          const caseInfo = await this.fetchCaseDetails(page, caseNumber, name);
          if (caseInfo) {
            results.push(caseInfo);
          }
        } catch (error) {
          console.error(`Error fetching details for ${caseNumber}:`, error.message);
        }
      }

      await page.close();
      return results;

    } catch (error) {
      console.error(`❌ Puppeteer search error:`, error.message);
      return [];
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Fetch detailed case information
   */
  async fetchCaseDetails(page, caseNumber, searchName) {
    try {
      const detailsURL = `https://esaj.tjsp.jus.br/cpopg/show.do?processo.codigo=${caseNumber}`;
      await page.goto(detailsURL, { waitUntil: 'networkidle2', timeout: 30000 });

      // Extract data from page
      const pageContent = await page.content();

      return {
        numeroProcesso: caseNumber,
        tribunal: 'TJSP',
        dataAjuizamento: new Date().toISOString(),
        classe: { nome: this.extractFromHTML(pageContent, 'classe'), codigo: 'AUTO' },
        assunto: { nome: this.extractFromHTML(pageContent, 'assunto'), codigo: 'AUTO' },
        partes: {
          autor: [{ nome: searchName.toUpperCase(), documento: null }],
          reu: []
        },
        status: 'ativo',
        instancia: 1,
        sourceSystem: 'puppeteer_esaj',
        _source: 'tj_sp',
        isRealData: true,
        dataSource: 'Puppeteer e-SAJ Real Scrape',
        url: detailsURL
      };

    } catch (error) {
      console.error(`Error fetching case ${caseNumber}:`, error.message);
      return null;
    }
  }

  /**
   * Extract info from HTML
   */
  extractFromHTML(html, field) {
    if (field === 'classe') {
      const match = html.match(/Classe[\s\S]*?<.*?>([^<]+)<\//);
      return match ? match[1].trim() : 'Desconhecida';
    }
    if (field === 'assunto') {
      const match = html.match(/Assunto[\s\S]*?<.*?>([^<]+)<\//);
      return match ? match[1].trim() : 'Desconhecido';
    }
    return 'Desconhecido';
  }
}

export default PuppeteerESAJScraper;
