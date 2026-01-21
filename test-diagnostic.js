import { judicialSearchEngine } from './api/utils/judicial-search-engine.js';

console.log('🔧 Teste de diagnóstico - verificando retorno do scraper\n');

async function diagnosticTest() {
  try {
    const name = 'rodrigo munhoz reis';

    console.log(`🔍 Testando busca básica para: "${name}"\n`);

    const result = await judicialSearchEngine.searchByName(name);

    console.log('📊 TIPO DO RESULTADO:', typeof result);
    console.log('📊 É ARRAY?', Array.isArray(result));
    console.log('📊 PROPRIEDADES:', Object.keys(result || {}));

    if (result) {
      console.log('📊 METADATA:', result.metadata);
      console.log('📊 RESULTS É ARRAY?', Array.isArray(result.results));
      console.log('📊 TOTAL RESULTS:', result.results?.length || 'N/A');
    }

    return result;

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error('Stack:', error.stack);
  }
}

diagnosticTest();