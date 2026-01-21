import { judicialSearchEngine } from './api/utils/judicial-search-engine.js';

console.log('🚀 Teste de extração DETALHADA de processos\n');

async function testDetailedExtraction() {
  try {
    const name = 'rodrigo munhoz reis';

    console.log(`🔍 Testando extração DETALHADA para: "${name}"\n`);

    // Primeiro teste: busca básica
    console.log('📊 FAZENDO BUSCA BÁSICA...');
    console.log('─'.repeat(50));

    const basicResult = await judicialSearchEngine.searchByName(name);

    console.log(`✅ Busca básica: ${basicResult.metadata?.totalFound || 0} processos encontrados`);
    console.log(`⏱️  Tempo: ${basicResult.metadata?.executionTime || 0}ms\n`);

    if (basicResult.results && basicResult.results.length > 0) {
      console.log('📋 PROCESSOS BÁSICOS ENCONTRADOS:');
      basicResult.results.forEach((proc, i) => {
        console.log(`\n[${i + 1}] ${proc.numeroProcesso}`);
        console.log(`   Classe: ${proc.classe?.nome || 'N/A'}`);
        console.log(`   Assunto: ${proc.assunto?.nome || 'N/A'}`);
        console.log(`   Vara: ${proc.vara || 'N/A'}`);
        console.log(`   URL: ${proc.url ? '✅ Disponível' : '❌ Não disponível'}`);
      });

      console.log('\n🔍 AGORA EXTRAINDO DETALHES COMPLETOS...');
      console.log('─'.repeat(50));
      console.log('⚠️  ATENÇÃO: Isso pode levar mais tempo pois acessa cada processo individualmente\n');

      // Busca detalhada
      const detailedResult = await judicialSearchEngine.searchByName(name, { detailed: true });

      console.log(`✅ Busca detalhada: ${detailedResult.results?.length || 0} processos com detalhes`);
      console.log(`⏱️  Tempo adicional necessário para detalhes\n`);

      // Mostrar detalhes completos
      detailedResult.results.forEach((proc, i) => {
        console.log(`\n📄 PROCESSO ${i + 1} - DETALHES COMPLETOS:`);
        console.log('═'.repeat(60));
        console.log(`Número: ${proc.numeroProcesso}`);
        console.log(`Classe: ${proc.classe || 'N/A'}`);
        console.log(`Assunto: ${proc.assunto || 'N/A'}`);
        console.log(`Foro: ${proc.foro || 'N/A'}`);
        console.log(`Vara: ${proc.vara || 'N/A'}`);
        console.log(`Juiz: ${proc.juiz || 'N/A'}`);
        console.log(`Data Ajuizamento: ${proc.dataAjuizamento || 'N/A'}`);
        console.log(`Valor Causa: ${proc.valorCausa || 'N/A'}`);

        if (proc.partes && proc.partes.length > 0) {
          console.log(`\n👥 PARTES ENVOLVIDAS (${proc.partes.length}):`);
          proc.partes.forEach((parte, j) => {
            console.log(`   ${j + 1}. ${parte.tipo}: ${parte.nome}`);
          });
        }

        if (proc.movimentacoes && proc.movimentacoes.length > 0) {
          console.log(`\n📋 ÚLTIMAS MOVIMENTAÇÕES (${proc.movimentacoes.length}):`);
          proc.movimentacoes.slice(0, 3).forEach((mov, j) => {
            console.log(`   ${j + 1}. ${mov.data || 'Data N/A'}: ${mov.descricao.substring(0, 100)}...`);
          });
        }

        if (proc.decisoes && proc.decisoes.length > 0) {
          console.log(`\n⚖️ DECISÕES (${proc.decisoes.length}):`);
          proc.decisoes.slice(0, 2).forEach((dec, j) => {
            console.log(`   ${j + 1}. ${dec.tipo}: ${dec.conteudo.substring(0, 150)}...`);
          });
        }

        if (proc.documentos && proc.documentos.length > 0) {
          console.log(`\n📎 DOCUMENTOS DISPONÍVEIS (${proc.documentos.length}):`);
          proc.documentos.slice(0, 3).forEach((doc, j) => {
            console.log(`   ${j + 1}. ${doc.nome}`);
          });
        }

        console.log(`\n🔗 URL Completa: ${proc.url}`);
        console.log(`📅 Extraído em: ${proc.extractedAt}`);
        console.log(`✅ Detalhes extraídos: ${proc.detailedExtracted ? 'SIM' : 'NÃO'}`);
      });

      return {
        success: true,
        basicCount: basicResult.metadata?.totalFound || 0,
        detailedCount: detailedResult.results?.length || 0,
        detailedExtracted: detailedResult.results?.filter(r => r.detailedExtracted).length || 0,
        sampleDetailed: detailedResult.results?.[0]
      };

    } else {
      console.log('❌ Nenhum processo encontrado na busca básica');
      return { success: false, message: 'Nenhum processo encontrado' };
    }

  } catch (error) {
    console.error('\n❌ ERRO no teste detalhado:', error.message);
    return { success: false, error: error.message };
  }
}

testDetailedExtraction().then(result => {
  console.log('\n' + '='.repeat(70));
  console.log('TESTE DE EXTRAÇÃO DETALHADA CONCLUÍDO');
  console.log('='.repeat(70));

  if (result.success) {
    console.log(`✅ SUCESSO:`);
    console.log(`   - Busca básica: ${result.basicCount} processos`);
    console.log(`   - Com detalhes: ${result.detailedCount} processos`);
    console.log(`   - Detalhes extraídos: ${result.detailedExtracted} processos`);
    console.log(`\n💡 RESUMO: Após encontrar os processos, o sistema consegue acessar`);
    console.log(`   cada link individual e extrair informações completas incluindo:`);
    console.log(`   partes envolvidas, movimentações, decisões e documentos.`);
  } else {
    console.log(`❌ FALHA: ${result.message || result.error}`);
  }

  console.log('\n📋 Exemplo de dados detalhados extraídos:');
  if (result.sampleDetailed) {
    console.log(JSON.stringify({
      numeroProcesso: result.sampleDetailed.numeroProcesso,
      classe: result.sampleDetailed.classe,
      assunto: result.sampleDetailed.assunto,
      partesCount: result.sampleDetailed.partes?.length || 0,
      movimentacoesCount: result.sampleDetailed.movimentacoes?.length || 0,
      decisoesCount: result.sampleDetailed.decisoes?.length || 0,
      documentosCount: result.sampleDetailed.documentos?.length || 0
    }, null, 2));
  }
});
