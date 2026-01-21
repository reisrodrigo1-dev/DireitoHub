import { judicialSearchEngine } from './api/utils/judicial-search-engine.js';

console.log('🚀 Teste final da integração completa\n');

async function testIntegration() {
  try {
    console.log('🔍 Buscando por "rodrigo munhoz reis"...\n');

    const result = await judicialSearchEngine.searchByName('rodrigo munhoz reis');

    console.log('📊 RESULTADO DA BUSCA:');
    console.log('─'.repeat(60));
    console.log(`Sucesso: ${result.metadata ? '✅' : '❌'}`);
    console.log(`Total encontrado: ${result.metadata?.totalFound || 0}`);
    console.log(`Tempo de execução: ${result.metadata?.executionTime || 0}ms`);
    console.log(`Fonte: ${result.metadata?.source || 'N/A'}`);
    console.log(`Modo: ${result.metadata?.searchMode || 'N/A'}`);

    if (result.results && result.results.length > 0) {
      console.log('\n📋 PROCESSOS ENCONTRADOS:');
      result.results.forEach((proc, i) => {
        console.log(`\n[${i + 1}] ${proc.numeroProcesso || proc.numero || 'N/A'}`);
        if (proc.classe) console.log(`   Classe: ${proc.classe}`);
        if (proc.assunto) console.log(`   Assunto: ${proc.assunto}`);
        if (proc.dataAjuizamento) console.log(`   Data: ${proc.dataAjuizamento}`);
        if (proc.foro) console.log(`   Foro: ${proc.foro}`);
      });
    } else {
      console.log('\n❌ Nenhum processo encontrado');
    }

    console.log('\n📝 Nota:');
    console.log(result.metadata?.note || 'Sem nota');

    return result;

  } catch (error) {
    console.error('\n❌ ERRO na integração:', error.message);
    return { success: false, error: error.message };
  }
}

testIntegration().then(result => {
  console.log('\n' + '='.repeat(70));
  console.log('TESTE FINAL CONCLUÍDO');
  console.log('='.repeat(70));
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.metadata?.totalFound > 0 ? 0 : 1);
});
