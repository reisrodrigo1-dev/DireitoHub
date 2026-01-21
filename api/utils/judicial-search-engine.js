/**
 * Busca por CPF - Sistema de Pesquisa Judicial por Documento
 * Demonstra como buscar processos relacionados a um CPF específico
 */

import { judicialDataManager } from './judicial-sources-registry.js';
import { normalizeProceso } from './normalize-judicial-data.js';
import { brasilAPIClient } from './brasil-api-client.js';

export class JudicialSearchEngine {
  constructor() {
    this.searchHistory = [];
    this.maxHistorySize = 100;
  }

  /**
   * Busca processos relacionados a um CPF
   * Nota: Tribunais brasileiros não permitem busca direta por CPF por questões de privacidade
   * Esta implementação demonstra como seria feita a busca usando múltiplas fontes
   */
  async searchByCPF(cpf, options = {}) {
    console.log(`🔍 Iniciando busca por CPF: ${this.formatCPF(cpf)}`);

    const searchId = `cpf_${Date.now()}_${cpf}`;
    const startTime = Date.now();

    const searchResult = {
      searchId,
      searchType: 'cpf',
      query: cpf,
      formattedCPF: this.formatCPF(cpf),
      timestamp: new Date().toISOString(),
      sources: {},
      results: [],
      metadata: {
        totalFound: 0,
        sourcesSearched: [],
        executionTime: 0,
        cpfValidation: null,
        limitations: [
          'Busca direta por CPF não é permitida por tribunais (LGPD)',
          'Esta demonstração usa busca por nome associado ao CPF',
          'Resultado simulado para fins educacionais',
          'APIs públicas brasileiras não fornecem dados pessoais por CPF'
        ]
      }
    };

    try {
      // Validação do CPF via BrasilAPI (gratuita)
      console.log(`🔍 Validando CPF ${this.formatCPF(cpf)} via BrasilAPI...`);
      const cpfValidation = await brasilAPIClient.validateCPF(cpf);

      searchResult.metadata.cpfValidation = cpfValidation;

      if (!cpfValidation.valid) {
        console.warn(`⚠️ CPF ${this.formatCPF(cpf)} não passou na validação: ${cpfValidation.reason}`);
        searchResult.metadata.limitations.push(`CPF inválido: ${cpfValidation.reason}`);
      } else {
        console.log(`✅ CPF ${cpfValidation.formatted} validado com sucesso`);
      }

      // Estratégia 1: Busca simulada por nome associado ao CPF
      // (Na prática, seria necessário ter uma base de nomes associados a CPFs)
      const mockResults = await this.simulateCPFSearch(cpf, options);

      searchResult.results = mockResults;
      searchResult.metadata.totalFound = mockResults.length;
      searchResult.metadata.executionTime = Date.now() - startTime;

      // Registrar na busca histórica
      this.searchHistory.push({
        id: searchId,
        type: 'cpf',
        query: cpf,
        results: mockResults.length,
        timestamp: searchResult.timestamp
      });

      console.log(`✅ Busca por CPF concluída: ${mockResults.length} resultados encontrados`);
      return searchResult;

    } catch (error) {
      console.error(`❌ Erro na busca por CPF:`, error.message);

      searchResult.error = error.message;
      searchResult.metadata.executionTime = Date.now() - startTime;

      return searchResult;
    }
  }

  /**
   * Simula busca por CPF usando dados existentes
   * NOTA: Esta versão faz buscas REAIS nas fontes disponíveis
   * Como o usuário autorizou, tentamos buscas reais (dentro dos limites legais)
   */
  async simulateCPFSearch(cpf, options) {
    const results = [];

    // BUSCA REAL: Tentar consultar fontes judiciais reais
    console.log(`🔍 Fazendo busca REAL por CPF ${this.formatCPF(cpf)}...`);
    console.log(`⚠️ Lembrando: Tribunais NÃO permitem busca direta por CPF por LGPD`);
    console.log(`💡 Usando estratégia alternativa: busca por processos recentes e filtragem`);

    try {
      // Estratégia REAL 1: Buscar processos recentes de todas as fontes
      // e verificar se o CPF aparece (embora improvável devido à LGPD)
      const sourcesToSearch = ['datajud', 'tj_sp']; // JusBrasil bloqueado por anti-bot

      for (const sourceKey of sourcesToSearch) {
        if (!judicialDataManager.sources[sourceKey]?.enabled) {
          console.log(`⏭️ Fonte ${sourceKey} desabilitada, pulando...`);
          continue;
        }

        console.log(`📡 Consultando ${sourceKey} para busca relacionada ao CPF...`);

        try {
          // Busca REAL: Tentar buscar processos recentes
          // NOTA: Tribunais não retornam CPF diretamente, então isso será limitado
          const searchResults = await judicialDataManager.fetchFromAllSources({
            type: 'recent', // Busca processos recentes como alternativa
            query: '',
            maxResults: 10,
            includeInactive: false
          });

          // Filtrar resultados (na prática, tribunais não retornam CPF)
          for (const result of searchResults) {
            if (result.success && result.data) {
              for (const processo of result.data) {
                const normalized = normalizeProceso({
                  ...processo,
                  _source: sourceKey,
                  _searchType: 'cpf',
                  _searchQuery: cpf,
                  _note: 'Busca real realizada, mas tribunais não retornam CPF por LGPD'
                });

                results.push({
                  ...normalized,
                  searchMetadata: {
                    searchType: 'cpf',
                    originalQuery: cpf,
                    source: sourceKey,
                    confidence: this.calculateCPFConfidence(processo, cpf),
                    notes: [
                      'Busca REAL realizada nas fontes judiciais',
                      'Tribunais NÃO retornam dados pessoais por CPF (LGPD)',
                      'Este resultado é de processo público não relacionado ao CPF',
                      'Demonstração de como o sistema funcionaria com dados reais'
                    ].join('. ')
                  }
                });
              }
            }
          }

          console.log(`✅ ${sourceKey}: ${searchResults.reduce((sum, r) => sum + (r.data?.length || 0), 0)} processos encontrados`);

        } catch (error) {
          console.warn(`⚠️ Erro ao consultar ${sourceKey}:`, error.message);
          // Continua com outras fontes mesmo se uma falhar
        }
      }

      // Se não encontrou nada, adicionar nota explicativa
      if (results.length === 0) {
        console.log(`📭 Nenhuma processo público encontrado relacionado ao CPF ${this.formatCPF(cpf)}`);
        console.log(`💡 Isso é NORMAL - tribunais protegem dados pessoais por LGPD`);
      }

    } catch (error) {
      console.error('Erro na busca real por CPF:', error.message);
      console.log('🔄 Fallback: Usando dados de exemplo para demonstração...');

      // Fallback para dados de exemplo apenas se tudo falhar
      results.push(this.createExampleProcesso(cpf, 'fallback_demo'));
    }

    return results;
  }

  /**
   * Gera resultados simulados para demonstração
   * IMPORTANTE: Na prática, isso nunca seria feito sem autorização legal
   */
  async generateMockCPFResults(cpf, sourceKey, options) {
    const mockResults = [];

    // Simulação educacional - NUNCA fazer isso em produção sem autorização
    // Aqui apenas demonstramos como o sistema funcionaria

    if (sourceKey === 'datajud') {
      // Simular alguns processos que "poderiam" estar relacionados
      mockResults.push({
        numeroProcesso: `0001234-56.2024.8.26.0000`,
        tribunal: 'TJSP',
        dataAjuizamento: '2024-01-15T00:00:00.000Z',
        classe: { nome: 'Procedimento Comum Cível', codigo: '1' },
        assunto: { nome: 'Obrigação de Fazer / Não Fazer', codigo: '1234' },
        partes: {
          autor: [{ nome: 'JOÃO SILVA', documento: cpf }], // Simulado
          reu: [{ nome: 'EMPRESA XYZ LTDA', documento: null }]
        },
        status: 'ativo',
        instancia: 1,
        valorCausa: 15000.00,
        ultimoMovimento: {
          data: '2024-01-20T00:00:00.000Z',
          nome: 'Distribuído por Sorteio',
          codigo: '26'
        },
        sourceSystem: 'datajud',
        _source: 'datajud'
      });
    }

    if (sourceKey === 'tj_sp') {
      // Simular processo do TJSP
      mockResults.push({
        numeroProcesso: `1056789-12.2023.8.26.0100`,
        tribunal: 'TJSP',
        dataAjuizamento: '2023-06-10T00:00:00.000Z',
        classe: { nome: 'Ação de Cobrança', codigo: '2' },
        assunto: { nome: 'Contrato de Prestação de Serviços', codigo: '5678' },
        partes: {
          autor: [{ nome: 'MARIA SANTOS', documento: cpf }], // Simulado
          reu: [{ nome: 'BANCO ABC S.A.', documento: null }]
        },
        status: 'ativo',
        instancia: 1,
        valorCausa: 25000.00,
        ultimoMovimento: {
          data: '2023-08-15T00:00:00.000Z',
          nome: 'Citado',
          codigo: '42'
        },
        sourceSystem: 'tjsp_direct',
        _source: 'tj_sp'
      });
    }

    return mockResults;
  }

  /**
   * Calcula "confiança" genérica do resultado
   */
  calculateConfidence(caseData) {
    // Base confidence for name-based searches
    let confidence = 0.6; // Base 60% for name searches

    // Higher confidence for official sources
    if (caseData.sourceSystem === 'datajud') confidence += 0.2;
    if (caseData.sourceSystem === 'tjsp_direct') confidence += 0.15;

    // Lower confidence for web scraping sources
    if (caseData._source === 'jusbrasil') confidence -= 0.2;

    // Recent cases have higher confidence
    const caseDate = new Date(caseData.dataAjuizamento);
    const now = new Date();
    const daysSince = (now - caseDate) / (1000 * 60 * 60 * 24);
    if (daysSince < 365) confidence += 0.1; // Recent cases

    return Math.min(confidence, 1.0);
  }

  /**
   * Formata CPF para exibição
   */
  formatCPF(cpf) {
    const cleanCPF = cpf.replace(/\D/g, '');
    if (cleanCPF.length === 11) {
      return `${cleanCPF.slice(0, 3)}.${cleanCPF.slice(3, 6)}.${cleanCPF.slice(6, 9)}-${cleanCPF.slice(9)}`;
    }
    return cpf;
  }

  /**
   * Valida formato do CPF
   */
  validateCPF(cpf) {
    const cleanCPF = cpf.replace(/\D/g, '');
    return cleanCPF.length === 11 && /^\d{11}$/.test(cleanCPF);
  }

  /**
   * Busca processos por nome - PUPPETEER REAL
   * Acessa e-SAJ com browser real, preenche formulário, extrai dados
   * 100% REAL - SEM MOCKS OU SIMULAÇÕES
   */
  async searchByName(name, options = {}) {
    const searchId = `name_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      if (!name || name.trim().length < 3) {
        throw new Error('Nome deve ter pelo menos 3 caracteres.');
      }

      console.log(`\n${'='.repeat(80)}`);
      console.log(`🔍 BUSCA JUDICIAL REAL POR NOME: "${name}"`);
      console.log(`${'='.repeat(80)}\n`);

      // Importar scraper real do Puppeteer
      const { default: EsajRealScraper } = await import('./esaj-puppeteer-scraper.js');
      const scraper = new EsajRealScraper();

      // Executar busca REAL no e-SAJ
      const realResults = await scraper.searchByName(name, options);

      // Resultado final com dados REAIS
      const result = {
        searchId,
        searchType: 'name',
        query: name.trim(),
        timestamp: new Date().toISOString(),
        metadata: {
          executionTime: Date.now() - startTime,
          totalFound: realResults.length,
          searchMode: 'PUPPETEER REAL (100% sem mocks)',
          browserUsed: 'Puppeteer',
          limitations: [
            'Busca REAL no e-SAJ TJSP usando navegador real',
            'Resultados são dados públicos dos tribunais',
            'Extração automática de processos da página',
            'Sem nenhuma simulação ou mock de dados'
          ]
        },
        sources: {
          esaj_real: {
            count: realResults.length,
            success: true,
            error: null
          }
        },
        results: realResults.map(processo => ({
          ...processo,
          searchMetadata: {
            source: 'esaj_tjsp',
            confidence: this.calculateConfidence(processo),
            searchType: 'name',
            originalQuery: name.trim(),
            isReal: true,
            note: 'Dados extraídos REALMENTE do e-SAJ TJSP usando Puppeteer'
          }
        }))
      };

      // Adiciona ao histórico
      this.addToHistory(result);

      console.log(`${'='.repeat(80)}`);
      console.log(`✅ BUSCA CONCLUÍDA: ${result.metadata.totalFound} processos encontrados`);
      console.log(`⏱️  Tempo total: ${result.metadata.executionTime}ms`);
      console.log(`${'='.repeat(80)}\n`);

      return result;

    } catch (error) {
      console.error('\n❌ Erro na busca:', error.message);

      const errorResult = {
        searchId,
        searchType: 'name',
        query: name.trim(),
        timestamp: new Date().toISOString(),
        metadata: {
          executionTime: Date.now() - startTime,
          totalFound: 0,
          error: error.message,
          searchMode: 'PUPPETEER REAL',
          limitations: [
            'Erro ao acessar e-SAJ',
            'Verifique sua conexão com a internet',
            'e-SAJ pode estar temporariamente indisponível',
            'Confirme que Puppeteer está instalado: npm install puppeteer'
          ]
        },
        sources: {},
        results: []
      };

      this.addToHistory(errorResult);
      throw error;
    }
  }

  /**
   * Busca por número do processo
   */
  async searchByProcessNumber(processNumber, options = {}) {
    console.log(`🔍 Buscando processo: ${processNumber}`);

    // Busca direta por número - totalmente permitida
    return {
      searchType: 'process_number',
      query: processNumber,
      results: [],
      metadata: {
        note: 'Busca por número do processo é totalmente permitida',
        limitations: []
      }
    };
  }

  /**
   * Obtém histórico de buscas
   */
  getSearchHistory(limit = 10) {
    return this.searchHistory.slice(-limit);
  }

  /**
   * Adiciona busca ao histórico
   */
  addToHistory(searchResult) {
    this.searchHistory.unshift({
      id: searchResult.searchId,
      type: searchResult.searchType,
      query: searchResult.query,
      timestamp: searchResult.timestamp,
      results: searchResult.metadata.totalFound,
      executionTime: searchResult.metadata.executionTime
    });

    // Mantém tamanho máximo do histórico
    if (this.searchHistory.length > this.maxHistorySize) {
      this.searchHistory = this.searchHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * Limpa histórico de buscas
   */
  clearSearchHistory() {
    this.searchHistory = [];
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const judicialSearchEngine = new JudicialSearchEngine();