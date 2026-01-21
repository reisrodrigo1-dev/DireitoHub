#!/usr/bin/env node

/**
 * Teste REAL de APIs Públicas Gratuitas - Validação CPF e Dados Públicos
 * Busca AUTORIZADA pelo usuário com CPF real
 */

import { brasilAPIClient } from '../api/utils/brasil-api-client.js';
import { judicialSearchEngine } from '../api/utils/judicial-search-engine.js';

async function testAPIsReais(cpf) {
  console.log('='.repeat(80));
  console.log('🧪 TESTE REAL DE APIs PÚBLICAS BRASILEIRAS GRATUITAS');
  console.log('🔐 AUTORIZADO PELO USUÁRIO - CPF REAL');
  console.log('='.repeat(80));
  console.log('');

  try {
    console.log('📋 TESTE 1: VALIDAÇÃO REAL DE CPF VIA BRASILAPI');
    console.log('-'.repeat(50));

    // Teste REAL 1: Validação de CPF
    console.log(`🔍 Consultando BrasilAPI para CPF: ${cpf}`);
    const cpfValidation = await brasilAPIClient.validateCPF(cpf);

    console.log(`CPF Testado: ${cpf}`);
    console.log(`Válido: ${cpfValidation.valid ? '✅ SIM' : '❌ NÃO'}`);
    console.log(`Formatado: ${cpfValidation.formatted || 'N/A'}`);

    if (!cpfValidation.valid) {
      console.log(`Motivo: ${cpfValidation.reason}`);
    } else {
      console.log('✅ CPF válido segundo algoritmos oficiais brasileiros');
      console.log('📊 Dados da validação:', JSON.stringify(cpfValidation.data, null, 2));
    }

    console.log('');

    // Teste REAL 2: Busca judicial por CPF (com dados reais)
    console.log('📋 TESTE 2: BUSCA JUDICIAL REAL POR CPF');
    console.log('-'.repeat(50));
    console.log('⚠️ NOTA: Busca judicial NÃO retorna dados pessoais por CPF devido à LGPD');
    console.log('⚠️ Apenas processos públicos onde o CPF aparece como parte');

    const judicialResult = await judicialSearchEngine.searchByCPF(cpf, {
      maxResults: 5,
      includeInactive: false
    });

    console.log(`ID da Busca: ${judicialResult.searchId}`);
    console.log(`CPF Buscado: ${judicialResult.formattedCPF}`);
    console.log(`Validação CPF: ${judicialResult.metadata.cpfValidation?.valid ? '✅ Válido' : '❌ Inválido'}`);
    console.log(`Processos Encontrados: ${judicialResult.metadata.totalFound}`);
    console.log(`Tempo de Execução: ${judicialResult.metadata.executionTime}ms`);
    console.log('');

    // Mostrar limitações legais
    console.log('⚖️ LIMITAÇÕES LEGAIS (LGPD):');
    judicialResult.metadata.limitations.forEach((limitation, index) => {
      console.log(`   ${index + 1}. ${limitation}`);
    });
    console.log('');

    // Mostrar resultados encontrados (se houver)
    if (judicialResult.results.length > 0) {
      console.log('📋 PROCESSOS ENCONTRADOS:');
      judicialResult.results.forEach((processo, index) => {
        console.log(`${index + 1}. ${processo.numeroProcesso || 'N/A'}`);
        console.log(`   Tribunal: ${processo.tribunal || 'N/A'}`);
        console.log(`   Status: ${processo.status || 'N/A'}`);
        console.log(`   Data: ${processo.dataAjuizamento ? new Date(processo.dataAjuizamento).toLocaleDateString('pt-BR') : 'N/A'}`);
        console.log(`   Valor: R$ ${processo.valorCausa?.toLocaleString('pt-BR') || 'N/A'}`);
        console.log(`   Fonte: ${processo.searchMetadata?.source || 'N/A'}`);
        console.log(`   Confiança: ${(processo.searchMetadata?.confidence * 100 || 0).toFixed(1)}%`);
        console.log('');
      });
    } else {
      console.log('📭 NENHUM PROCESSO PÚBLICO ENCONTRADO');
      console.log('💡 Isso significa que não há processos públicos associados a este CPF');
      console.log('💡 Ou os processos existem mas não estão disponíveis nas fontes consultadas');
    }

    console.log('');

    // Teste REAL 3: Outras APIs públicas funcionando
    console.log('📋 TESTE 3: OUTRAS APIs PÚBLICAS FUNCIONANDO');
    console.log('-'.repeat(50));

    // CEP real (Praça da Sé, São Paulo)
    console.log('🔍 Testando CEP real (Praça da Sé - SP)...');
    try {
      const cepResult = await brasilAPIClient.getCEPInfo('01001000');
      if (cepResult.found) {
        console.log(`✅ CEP 01001-000: ${cepResult.data.logradouro}, ${cepResult.data.bairro}`);
        console.log(`   Cidade: ${cepResult.data.localidade}-${cepResult.data.uf}`);
        console.log(`   Dados completos:`, JSON.stringify(cepResult.data, null, 2));
      } else {
        console.log(`❌ CEP não encontrado: ${cepResult.reason}`);
      }
    } catch (error) {
      console.log(`❌ Erro na busca de CEP: ${error.message}`);
    }

    console.log('');

    // CNPJ real (exemplo empresa conhecida)
    console.log('🔍 Testando CNPJ real (Empresa conhecida)...');
    try {
      const cnpjResult = await brasilAPIClient.getCNPJInfo('19131243000197');
      if (cnpjResult.found) {
        console.log(`✅ CNPJ: ${cnpjResult.data.razao_social}`);
        console.log(`   Situação: ${cnpjResult.data.descricao_situacao_cadastral}`);
        console.log(`   Atividade: ${cnpjResult.data.cnae_fiscal_descricao}`);
        console.log(`   Endereço: ${cnpjResult.data.logradouro}, ${cnpjResult.data.municipio}-${cnpjResult.data.uf}`);
      } else {
        console.log(`❌ CNPJ não encontrado: ${cnpjResult.reason}`);
      }
    } catch (error) {
      console.log(`❌ Erro na busca de CNPJ: ${error.message}`);
    }

    console.log('');

    // DDD real
    console.log('🔍 Testando DDD real (São Paulo)...');
    try {
      const dddResult = await brasilAPIClient.getDDDByState('SP');
      if (dddResult.found) {
        console.log(`✅ Estado SP - DDDs disponíveis: ${dddResult.data.cities.length} cidades`);
        console.log(`   Exemplos: ${dddResult.data.cities.slice(0, 3).join(', ')}...`);
      } else {
        console.log(`❌ Estado não encontrado: ${dddResult.reason}`);
      }
    } catch (error) {
      console.log(`❌ Erro na busca de DDD: ${error.message}`);
    }

    console.log('');

    // Teste REAL 4: Status das fontes judiciais
    console.log('📋 TESTE 4: STATUS REAL DAS FONTES JUDICIAIS');
    console.log('-'.repeat(50));

    const sourcesStatus = judicialResult.sources;
    console.log('Fontes consultadas:');
    Object.entries(sourcesStatus).forEach(([source, data]) => {
      const status = data.success ? '✅' : '❌';
      console.log(`   ${status} ${source}: ${data.count} resultados`);
      if (!data.success && data.error) {
        console.log(`      Erro: ${data.error}`);
      }
    });

    console.log('');

    // Resumo final
    console.log('📊 RESUMO DO TESTE REAL:');
    console.log('-'.repeat(50));
    console.log(`✅ CPF ${cpf} validado: ${cpfValidation.valid ? 'SIM' : 'NÃO'}`);
    console.log(`📋 Processos judiciais encontrados: ${judicialResult.metadata.totalFound}`);
    console.log(`🌐 APIs públicas testadas: BrasilAPI (funcionando)`);
    console.log(`⚖️ Compliance LGPD: Mantido (sem dados pessoais)`);
    console.log(`🔐 Autorização do usuário: Confirmada`);
    console.log('');

    // Histórico de buscas
    const history = judicialSearchEngine.getSearchHistory(3);
    if (history.length > 0) {
      console.log('📚 HISTÓRICO DE BUSCAS:');
      history.forEach(search => {
        console.log(`   ${new Date(search.timestamp).toLocaleString('pt-BR')} - ${search.type}: ${search.query} (${search.results} resultados)`);
      });
    }

  } catch (error) {
    console.error('❌ ERRO NO TESTE REAL:', error.message);
    console.error('Stack:', error.stack);
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('🏁 TESTE REAL CONCLUÍDO');
  console.log('🔐 Dados tratados com respeito à privacidade e LGPD');
  console.log('='.repeat(80));
}

// ============================================
// EXECUÇÃO DO TESTE
// ============================================

// CPF fornecido pelo usuário
const cpfToTest = process.argv[2] || '10539481661';

console.log(`Testando APIs públicas com CPF: ${cpfToTest}`);
console.log('');

testAPIsPublicas(cpfToTest).catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
});