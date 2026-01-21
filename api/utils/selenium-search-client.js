/**
 * Selenium Judicial Search Client
 * Uses Selenium for automated browser-based search
 * Bypasses bot detection by simulating real user behavior
 * Requires: npm install selenium-webdriver
 */

let webdriver = null;
let Browser = null;

try {
  webdriver = await import('selenium-webdriver');
  Browser = webdriver.Builder;
} catch (error) {
  console.warn('⚠️ Selenium not installed. Install with: npm install selenium-webdriver chromedriver');
}

export class SeleniumSearchClient {
  constructor() {
    this.name = 'Selenium Browser';
    this.baseDelay = 1000;
    this.driver = null;
  }

  /**
   * Search cases by name using Selenium
   * Opens real browser and performs search like a user would
   */
  async searchByName(name, options = {}) {
    if (!name || name.trim().length < 3) {
      throw new Error('Nome deve ter pelo menos 3 caracteres.');
    }

    if (!webdriver) {
      console.warn('⚠️ Selenium not available. Skipping browser search.');
      return [];
    }

    console.log(`🌐 Selenium Browser: Starting for "${name}"`);

    const results = [];

    try {
      // Initialize browser
      await this.initializeBrowser();

      // Perform search
      const searchResults = await this.performSeleniumSearch(name, options);
      results.push(...searchResults);

      console.log(`✅ Selenium: Found ${results.length} cases`);
      return results;

    } catch (error) {
      console.error(`❌ Selenium error:`, error.message);
      return [];
    } finally {
      // Always close browser
      await this.closeBrowser();
    }
  }

  /**
   * Initialize Selenium WebDriver
   */
  async initializeBrowser() {
    try {
      if (this.driver) return;

      console.log('🔧 Initializing Selenium WebDriver...');

      const options = new (webdriver.chrome.Options || {})();
      options.addArguments('--headless'); // Run in background
      options.addArguments('--disable-blink-features=AutomationControlled');
      options.excludeSwitch('enable-automation');
      options.setUserPreferences({ 'credentials_enable_service': false });

      this.driver = new Browser()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();

      await this.driver.manage().setTimeouts({ implicit: 5000 });

      console.log('✅ WebDriver initialized');

    } catch (error) {
      console.error('Error initializing WebDriver:', error.message);
      throw error;
    }
  }

  /**
   * Close browser
   */
  async closeBrowser() {
    try {
      if (this.driver) {
        await this.driver.quit();
        this.driver = null;
        console.log('✅ Browser closed');
      }
    } catch (error) {
      console.error('Error closing browser:', error.message);
    }
  }

  /**
   * Perform search using Selenium
   */
  async performSeleniumSearch(name, options) {
    const results = [];

    try {
      console.log('🔍 Performing Selenium search in e-SAJ...');

      // Navigate to e-SAJ
      await this.driver.get('https://esaj.tjsp.jus.br/cpopg/search.do');

      // Wait for page to load
      await this.delay(2000);

      // Fill search form - search by name (parteAutor)
      const authorInput = await this.driver.findElement(webdriver.By.name('parteAutor'));
      await authorInput.clear();
      await authorInput.sendKeys(name.trim());

      // Select search type
      const searchType = await this.driver.findElement(webdriver.By.name('tipoNumero'));
      await searchType.click();
      await this.delay(500);

      // Click search button
      const searchButton = await this.driver.findElement(webdriver.By.className('btnConsultar'));
      await searchButton.click();

      // Wait for results
      await this.delay(3000);

      // Parse results from page
      const pageResults = await this.parseSeleniumResults(name);
      results.push(...pageResults);

      return results;

    } catch (error) {
      console.error('Error performing Selenium search:', error.message);
      return [];
    }
  }

  /**
   * Parse results from current page using Selenium
   */
  async parseSeleniumResults(searchName) {
    const results = [];

    try {
      // Get page HTML
      const html = await this.driver.getPageSource();

      // Find case numbers
      const casePattern = /(\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4})/g;
      const matches = html.match(casePattern);

      if (!matches) {
        return results;
      }

      const uniqueCases = [...new Set(matches)];

      for (const caseNumber of uniqueCases) {
        try {
          const caseInfo = {
            numeroProcesso: caseNumber,
            tribunal: 'TJSP',
            dataAjuizamento: new Date().toISOString(),
            classe: { nome: 'Desconhecida', codigo: 'AUTO' },
            assunto: { nome: 'Desconhecido', codigo: 'AUTO' },
            partes: {
              autor: [{ nome: searchName.toUpperCase(), documento: null }],
              reu: []
            },
            status: 'ativo',
            instancia: 1,
            sourceSystem: 'selenium_browser',
            _source: 'tj_sp',
            isRealData: true,
            dataSource: 'Selenium Browser Search',
            url: `https://esaj.tjsp.jus.br/cpopg/show.do?processo.codigo=${caseNumber}`
          };

          results.push(caseInfo);
        } catch (error) {
          console.error('Error extracting case:', error.message);
        }
      }

      return results;

    } catch (error) {
      console.error('Error parsing results:', error.message);
      return [];
    }
  }

  /**
   * Delay helper
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default SeleniumSearchClient;
