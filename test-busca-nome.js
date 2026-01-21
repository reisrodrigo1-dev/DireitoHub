#!/usr/bin/env node

/**
 * Teste REAL de Busca Judicial por Nome
 * Demonstra busca por nome em fontes judiciais brasileiras
 */

import { judicialSearchEngine } from './api/utils/judicial-search-engine.js';

async function testBuscaPorNome(nome) {
  console.log('='.repeat(80));
  console.log('🧪 TESTE REAL DE BUSCA JUDICIAL POR NOME');
  console.log(`👤 Nome: ${nome.toUpperCase()}`);
  console.log('='.repeat(80));
  console.log('');

  try {
    console.log('🔍 INICIANDO BUSCA POR NOME...');
    console.log('-'.repeat(50));

    // Busca REAL por nome
    const searchResult = await judicialSearchEngine.searchByName(nome, {
      maxResults: 10,
      includeInactive: false
    });

    console.log(`✅ BUSCA CONCLUÍDA`);
    console.log(`ID da Busca: ${searchResult.searchId}`);
    console.log(`Tipo: ${searchResult.searchType}`);
    console.log(`Nome Buscado: "${searchResult.query}"`);
    console.log(`Data/Hora: ${new Date(searchResult.timestamp).toLocaleString('pt-BR')}`);
    console.log(`Tempo de Execução: ${searchResult.metadata.executionTime}ms`);
    console.log(`Total Encontrado: ${searchResult.metadata.totalFound}`);
    console.log('');

    // Status das fontes
    console.log('📊 FONTES CONSULTADAS:');
    Object.entries(searchResult.sources).forEach(([source, data]) => {
      const status = data.success ? '✅' : '❌';
      console.log(`   ${status} ${source}: ${data.count} resultados`);
      if (!data.success && data.error) {
        console.log(`      Erro: ${data.error}`);
      }
    });
    console.log('');

    // Limitações
    if (searchResult.metadata.limitations.length > 0) {
      console.log('⚠️ INFORMAÇÕES IMPORTANTES:');
      searchResult.metadata.limitations.forEach((limitation, index) => {
        console.log(`   ${index + 1}. ${limitation}`);
      });
      console.log('');
    }

    // Resultados
    if (searchResult.results.length > 0) {
      console.log('📋 PROCESSOS ENCONTRADOS:');
      console.log('-'.repeat(50));

      searchResult.results.forEach((processo, index) => {
        console.log(`${index + 1}. PROCESSO: ${processo.numeroProcesso || 'N/A'}`);
        console.log(`   Tribunal: ${processo.tribunal || 'N/A'}`);
        console.log(`   Status: ${processo.status || 'N/A'}`);
        console.log(`   Classe: ${processo.classe?.nome || 'N/A'}`);
        console.log(`   Data Ajuizamento: ${processo.dataAjuizamento ? new Date(processo.dataAjuizamento).toLocaleDateString('pt-BR') : 'N/A'}`);
        console.log(`   Valor da Causa: R$ ${processo.valorCausa?.toLocaleString('pt-BR') || 'N/A'}`);

        if (processo.partes?.autor?.length > 0) {
          console.log(`   Autor(es): ${processo.partes.autor.map(p => p.nome).join(', ')}`);
        }
        if (processo.partes?.reu?.length > 0) {
          console.log(`   Réu(s): ${processo.partes.reu.map(p => p.nome).join(', ')}`);
        }

        console.log(`   Instância: ${processo.instancia || 'N/A'}`);
        console.log(`   Último Movimento: ${processo.ultimoMovimento?.nome || 'N/A'}`);

        if (processo.ultimoMovimento?.data) {
          console.log(`   Data Último Movimento: ${new Date(processo.ultimoMovimento.data).toLocaleDateString('pt-BR')}`);
        }

        console.log(`   Fonte: ${processo.searchMetadata?.source || processo.sourceSystem || 'N/A'}`);
        console.log(`   Confiança: ${(processo.searchMetadata?.confidence * 100 || 0).toFixed(1)}%`);

        if (processo.searchMetadata?.notes) {
          console.log(`   Nota: ${processo.searchMetadata.notes}`);
        }

        console.log('');
      });
    } else {
      console.log('📭 NENHUM PROCESSO ENCONTRADO');
      console.log('');
      console.log('💡 Possíveis razões:');
      console.log('   • O nome não possui processos ativos nas fontes consultadas');
      console.log('   • Os processos podem estar em tribunais não integrados');
      console.log('   • Dados podem estar indisponíveis temporariamente');
      console.log('   • Limitações de acesso às bases de dados públicas');
      console.log('');
    }

    // Estatísticas adicionais
    console.log('📈 ESTATÍSTICAS DA BUSCA:');
    console.log('-'.repeat(50));
    console.log(`• Fontes consultadas: ${Object.keys(searchResult.sources).length}`);
    console.log(`• Fontes com sucesso: ${Object.values(searchResult.sources).filter(s => s.success).length}`);
    console.log(`• Total de processos retornados: ${searchResult.metadata.totalFound}`);
    console.log(`• Tempo médio por fonte: ~${Math.round(searchResult.metadata.executionTime / Math.max(Object.keys(searchResult.sources).length, 1))}ms`);
    console.log('');

    // Histórico de buscas
    const history = judicialSearchEngine.getSearchHistory(5);
    if (history.length > 0) {
      console.log('📚 ÚLTIMAS BUSCAS REALIZADAS:');
      history.forEach(search => {
        console.log(`   ${new Date(search.timestamp).toLocaleString('pt-BR')} - ${search.type}: "${search.query}" (${search.results} resultados)`);
      });
      console.log('');
    }

  } catch (error) {
    console.error('❌ ERRO NA BUSCA POR NOME:', error.message);
    console.error('Stack trace:', error.stack);
  }

  console.log('='.repeat(80));
  console.log('🏁 TESTE DE BUSCA POR NOME CONCLUÍDO');
  console.log('🔍 Busca realizada em fontes judiciais públicas brasileiras');
  console.log('='.repeat(80));
}

// ============================================
// EXECUÇÃO DO TESTE
// ============================================

// Nome fornecido pelo usuário
const nomeToSearch = process.argv[2] || 'rodrigo munhoz reis';

console.log(`Testando busca judicial por nome: "${nomeToSearch}"`);
console.log('');

testBuscaPorNome(nomeToSearch).catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
});