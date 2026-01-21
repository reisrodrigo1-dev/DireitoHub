import { default as EsajRealScraper } from './api/utils/esaj-puppeteer-scraper.js';

console.log('🔧 Teste direto do scraper\n');

async function directScraperTest() {
  try {
    console.log('🚀 Criando scraper...');
    const scraper = new EsajRealScraper();

    console.log('🔍 Fazendo busca básica...');
    const result = await scraper.searchByName('rodrigo munhoz reis');

    console.log('📊 RESULTADO:');
    console.log('Tipo:', typeof result);
    console.log('É array?', Array.isArray(result));
    console.log('Comprimento:', result?.length || 'N/A');

    if (result && result.length > 0) {
      console.log('Primeiro item:', JSON.stringify(result[0], null, 2));
    }

    return result;

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error('Stack:', error.stack);
  }
}

directScraperTest();