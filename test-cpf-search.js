#!/usr/bin/env node

/**
 * Teste de Busca por CPF
 * Demonstra como o sistema judicial multi-fonte pode buscar processos relacionados a um CPF
 */

import { judicialSearchEngine } from '../utils/judicial-search-engine.js';

async function testCPFBusca(cpf) {
  console.log('='.repeat(60));
  console.log('🧪 TESTE DE BUSCA POR CPF - SISTEMA JUDICIAL MULTI-FONTE');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Validação básica do CPF
    if (!judicialSearchEngine.validateCPF(cpf)) {
      console.log(`❌ CPF inválido: ${cpf}`);
      console.log('Formato esperado: 11 dígitos ou XXX.XXX.XXX-XX');
      return;
    }

    console.log(`🔍 Iniciando busca por CPF: ${judicialSearchEngine.formatCPF(cpf)}`);
    console.log('');

    // Executa a busca
    const searchResult = await judicialSearchEngine.searchByCPF(cpf, {
      maxResults: 5,
      includeInactive: false
    });

    // Exibe resultados
    console.log('📊 RESULTADOS DA BUSCA:');
    console.log('-'.repeat(40));
    console.log(`ID da Busca: ${searchResult.searchId}`);
    console.log(`Tipo: ${searchResult.searchType}`);
    console.log(`CPF Buscado: ${searchResult.formattedCPF}`);
    console.log(`Data/Hora: ${new Date(searchResult.timestamp).toLocaleString('pt-BR')}`);
    console.log(`Tempo de Execução: ${searchResult.metadata.executionTime}ms`);
    console.log(`Total Encontrado: ${searchResult.metadata.totalFound}`);
    console.log('');

    if (searchResult.metadata.limitations.length > 0) {
      console.log('⚠️ LIMITAÇÕES IMPORTANTES:');
      searchResult.metadata.limitations.forEach((limitation, index) => {
        console.log(`   ${index + 1}. ${limitation}`);
      });
      console.log('');
    }

    if (searchResult.results.length > 0) {
      console.log('📋 PROCESSOS ENCONTRADOS:');
      console.log('-'.repeat(40));

      searchResult.results.forEach((processo, index) => {
        console.log(`${index + 1}. PROCESO: ${processo.numeroProcesso}`);
        console.log(`   Tribunal: ${processo.tribunal}`);
        console.log(`   Status: ${processo.status}`);
        console.log(`   Data Ajuizamento: ${new Date(processo.dataAjuizamento).toLocaleDateString('pt-BR')}`);
        console.log(`   Classe: ${processo.classe?.nome || 'Não informado'}`);
        console.log(`   Valor da Causa: R$ ${processo.valorCausa?.toLocaleString('pt-BR') || 'Não informado'}`);

        if (processo.partes?.autor?.length > 0) {
          console.log(`   Autor: ${processo.partes.autor[0].nome}`);
        }
        if (processo.partes?.reu?.length > 0) {
          console.log(`   Réu: ${processo.partes.reu[0].nome}`);
        }

        console.log(`   Fonte: ${processo.searchMetadata?.source || processo.sourceSystem}`);
        console.log(`   Confiança: ${(processo.searchMetadata?.confidence * 100 || 0).toFixed(1)}%`);
        console.log('');
      });
    } else {
      console.log('📭 NENHUM PROCESSO ENCONTRADO');
      console.log('');
      console.log('💡 Possíveis razões:');
      console.log('   • CPF não possui processos ativos');
      console.log('   • Dados não disponíveis nas fontes consultadas');
      console.log('   • Limitações de privacidade (LGPD)');
      console.log('');
    }

    // Estatísticas das fontes
    if (Object.keys(searchResult.sources).length > 0) {
      console.log('🔍 FONTES CONSULTADAS:');
      Object.entries(searchResult.sources).forEach(([sourceKey, sourceData]) => {
        const status = sourceData.success ? '✅' : '❌';
        console.log(`   ${status} ${sourceKey}: ${sourceData.count || 0} resultados`);
      });
      console.log('');
    }

    // Histórico de buscas
    const history = judicialSearchEngine.getSearchHistory(3);
    if (history.length > 0) {
      console.log('📚 ÚLTIMAS BUSCAS:');
      history.forEach(search => {
        console.log(`   ${new Date(search.timestamp).toLocaleString('pt-BR')} - ${search.type}: ${search.query} (${search.results} resultados)`);
      });
      console.log('');
    }

  } catch (error) {
    console.error('❌ ERRO NA BUSCA:', error.message);
    console.error('Stack:', error.stack);
  }

  console.log('='.repeat(60));
  console.log('🏁 TESTE CONCLUÍDO');
  console.log('='.repeat(60));
}

// ============================================
// EXECUÇÃO DO TESTE
// ============================================

// CPF fornecido pelo usuário
const cpfToSearch = process.argv[2] || '10539481661';

console.log(`Testando busca por CPF: ${cpfToSearch}`);
console.log('');

testCPFBusca(cpfToSearch).catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
});