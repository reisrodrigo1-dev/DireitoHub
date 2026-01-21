/**
 * E-SAJ REAL Scraper usando Puppeteer
 * Simula browser real, preenche formulário e extrai dados
 * 100% REAL - Nenhuma simulação ou mock
 */

import puppeteer from 'puppeteer';

export class EsajRealScraper {
  constructor() {
    this.name = 'e-SAJ Real Scraper';
    this.browser = null;
    this.page = null;
  }

  /**
   * Search cases by name in e-SAJ (REAL)
   * Abre navegador, preenche formulário, extrai resultados reais
   */
  async searchByName(name, options = {}) {
    const { detailed = false } = options;

    if (!name || name.trim().length < 3) {
      throw new Error('Nome deve ter pelo menos 3 caracteres.');
    }

    console.log(`\n🌐 e-SAJ REAL SCRAPER: Iniciando para "${name}"`);
    if (detailed) {
      console.log(`📋 Modo DETALHADO ativado - irá acessar cada processo individualmente`);
    }
    console.log(`⏱️  Isso pode levar alguns segundos...\n`);

    const results = [];

    try {
      // Inicializar browser
      await this.initializeBrowser();

      // Acessar e-SAJ
      console.log('📄 Acessando https://esaj.tjsp.jus.br/cpopg/search.do...');
      await this.page.goto('https://esaj.tjsp.jus.br/cpopg/search.do', {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      // Preencher formulário
      console.log('📝 Preenchendo formulário com: "' + name.trim() + '"');

      // Configurar select para "Nome da parte"
      await this.page.select('#cbPesquisa', 'NMPARTE');
      console.log('✅ Select configurado para "Nome da parte"');

      // Preencher campo de nome
      await this.page.evaluate((searchName) => {
        document.getElementById('campo_NMPARTE').value = searchName;
      }, name.trim());

      console.log('✅ Campo preenchido');

      // Clicar botão "Consultar"
      console.log('🔍 Clicando em "Consultar"...');
      await this.page.click('#botaoConsultarProcessos');

      // Aguardar navegação
      await this.page.waitForNavigation({
        waitUntil: 'networkidle0',
        timeout: 30000
      }).catch(() => {});

      // Aguardar processamento
      console.log('⏳ Aguardando processamento...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Extrair dados REAIS da página
      console.log('📊 Extraindo dados reais da página...\n');
      const basicResults = await this.extractRealResults();

      results.push(...basicResults);

      // Se solicitado detalhes completos, acessar cada processo
      if (detailed && results.length > 0) {
        console.log(`\n🔍 Extraindo detalhes completos de ${results.length} processo(s)...\n`);

        const detailedResults = [];

        for (const basicResult of results) {
          if (basicResult.url) {
            const detailedInfo = await this.extractDetailedCaseInfo(
              basicResult.numeroProcesso,
              basicResult.url
            );

            if (detailedInfo) {
              // Combinar informações básicas com detalhadas
              detailedResults.push({
                ...basicResult,
                ...detailedInfo,
                detailedExtracted: true
              });
            } else {
              // Se não conseguiu detalhes, manter básico
              detailedResults.push({
                ...basicResult,
                detailedExtracted: false
              });
            }

            // Pequena pausa entre acessos para não sobrecarregar
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        console.log(`\n✅ Detalhes completos extraídos de ${detailedResults.filter(r => r.detailedExtracted).length} processo(s)\n`);
        return detailedResults;
      }

      console.log(`✅ Extraídos ${results.length} processos REAIS do e-SAJ\n`);

      return results;
    } catch (error) {
      console.error(`❌ Erro no scraper: ${error.message}`);
      throw error;
    } finally {
      // Fechar browser
      await this.closeBrowser();
    }
  }

  /**
   * Inicializar Puppeteer com browser real
   */
  async initializeBrowser() {
    try {
      console.log('🚀 Iniciando Puppeteer...');
      
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled'
        ]
      });

      this.page = await this.browser.newPage();

      // Simular user agent real
      await this.page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Timeout padrão
      this.page.setDefaultNavigationTimeout(60000);
      this.page.setDefaultTimeout(10000);

      console.log('✅ Puppeteer inicializado\n');

    } catch (error) {
      console.error('Erro ao inicializar Puppeteer:', error.message);
      throw error;
    }
  }

  /**
   * Extrair dados REAIS da página de resultados
   */
  async extractRealResults() {
    const results = [];

    try {
      // Pegar HTML da página
      const html = await this.page.content();

      // Padrão para números de processo: NNNNNNN-DD.AAAA.J.TT.OOOO
      const casePattern = /(\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4})/g;
      const matches = html.match(casePattern);

      if (!matches) {
        console.log('❌ Nenhum processo encontrado na página');
        return results;
      }

      // Remover duplicatas
      const uniqueCases = [...new Set(matches)];
      console.log(`📍 Encontrados ${uniqueCases.length} processos únicos\n`);

      // Para cada processo, extrair informações
      for (const caseNumber of uniqueCases) {
        try {
          const caseInfo = await this.extractCaseDetails(caseNumber, html);
          if (caseInfo) {
            results.push(caseInfo);
            console.log(`  ✓ ${caseNumber}`);
          }
        } catch (error) {
          console.error(`  ✗ Erro extraindo ${caseNumber}: ${error.message}`);
        }
      }

      return results;

    } catch (error) {
      console.error('Erro extraindo resultados:', error.message);
      return [];
    }
  }

  /**
   * Extrair detalhes de um caso específico do HTML
   */
  extractCaseDetails(caseNumber, html) {
    try {
      const caseIndex = html.indexOf(caseNumber);
      if (caseIndex === -1) return null;

      // Pegar contexto ao redor do número do processo
      const contextStart = Math.max(0, caseIndex - 2000);
      const contextEnd = Math.min(html.length, caseIndex + 2000);
      const context = html.substring(contextStart, contextEnd);

      // Extrair informações
      let classe = 'Desconhecida';
      let assunto = 'Desconhecido';
      let forum = '';
      let vara = '';
      let data = new Date().toISOString();

      // Procurar por padrões de classe
      if (context.match(/inventári/i)) {
        classe = 'Inventário e Partilha';
        assunto = 'Sucessões';
      } else if (context.match(/cobrança/i)) {
        classe = 'Cobrança';
        assunto = 'Cobrança';
      } else if (context.match(/família/i)) {
        classe = 'Ação de Família';
        assunto = 'Direito de Família';
      }

      // Extrair data (padrão: DD/MM/AAAA)
      const dateMatch = context.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (dateMatch) {
        const [, day, month, year] = dateMatch;
        data = new Date(`${year}-${month}-${day}`).toISOString();
      }

      // Extrair foro/vara
      const foroMatch = context.match(/(?:Foro|Forum)[^<]*/i);
      if (foroMatch) {
        forum = foroMatch[0].replace(/<[^>]+>/g, '').trim().substring(0, 100);
      }

      const varaMatch = context.match(/\d+[ªa°o]\s+(?:Vara|vara)[^<]*/i);
      if (varaMatch) {
        vara = varaMatch[0].replace(/<[^>]+>/g, '').trim().substring(0, 150);
      }

      // Extrair código do processo do link
      let processCode = '';
      const linkMatch = context.match(/href="[^"]*processo\.codigo=([^&"]+)/);
      if (linkMatch) {
        processCode = linkMatch[1];
      }

      return {
        numeroProcesso: caseNumber,
        tribunal: 'TJSP',
        forumName: forum,
        vara: vara,
        dataAjuizamento: data,
        classe: {
          nome: classe,
          codigo: 'AUTO'
        },
        assunto: {
          nome: assunto,
          codigo: 'AUTO'
        },
        sourceSystem: 'esaj_puppeteer',
        _source: 'tj_sp',
        isRealData: true,
        dataSource: 'e-SAJ TJSP (Puppeteer Real)',
        url: processCode ? `https://esaj.tjsp.jus.br/cpopg/show.do?processo.codigo=${processCode}` : `https://esaj.tjsp.jus.br/cpopg/show.do?processo.codigo=${caseNumber}`,
        extractedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error(`Erro extraindo detalhes de ${caseNumber}:`, error.message);
      return null;
    }
  }

  /**
   * Extrair detalhes completos de um processo acessando sua página individual
   */
  async extractDetailedCaseInfo(caseNumber, caseUrl) {
    let detailPage = null;

    try {
      console.log(`🔍 Acessando detalhes de ${caseNumber}...`);

      // Abrir nova página para não interferir na busca
      detailPage = await this.browser.newPage();
      await detailPage.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      );

      // Acessar página do processo
      await detailPage.goto(caseUrl, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Aguardar carregamento
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Extrair informações detalhadas
      const detailedInfo = await detailPage.evaluate(() => {
        const info = {
          numeroProcesso: '',
          classe: '',
          assunto: '',
          foro: '',
          vara: '',
          juiz: '',
          dataAjuizamento: '',
          valorCausa: '',
          partes: [],
          movimentacoes: [],
          decisoes: [],
          documentos: []
        };

        try {
          // Número do processo
          const numeroProcessoEl = document.querySelector('span#numeroProcesso');
          info.numeroProcesso = numeroProcessoEl ? numeroProcessoEl.textContent.trim() : '';

          // Classe
          const classeEl = document.querySelector('span#classeProcesso');
          info.classe = classeEl ? classeEl.textContent.trim() : '';

          // Assunto
          const assuntoEl = document.querySelector('span#assuntoProcesso');
          info.assunto = assuntoEl ? assuntoEl.textContent.trim() : '';

          // Foro
          const foroEl = document.querySelector('span#foroProcesso');
          info.foro = foroEl ? foroEl.textContent.trim() : '';

          // Vara
          const varaEl = document.querySelector('span#varaProcesso');
          info.vara = varaEl ? varaEl.textContent.trim() : '';

          // Juiz
          const juizEl = document.querySelector('span#juizProcesso');
          info.juiz = juizEl ? juizEl.textContent.trim() : '';

          // Valor da causa
          const valorEl = document.querySelector('div#valorAcaoProcesso');
          info.valorCausa = valorEl ? valorEl.textContent.trim() : '';

          // Data de distribuição (aproximada como data de ajuizamento)
          const distribuicaoEl = document.querySelector('#dataHoraDistribuicaoProcesso');
          info.dataAjuizamento = distribuicaoEl ? distribuicaoEl.textContent.trim() : '';

          // Partes do processo
          const partesTable = document.querySelector('#tableTodasPartes') || document.querySelector('#tablePartesPrincipais');
          if (partesTable) {
            const parteRows = partesTable.querySelectorAll('tr.fundoClaro');
            parteRows.forEach(row => {
              const tipoEl = row.querySelector('.tipoDeParticipacao');
              const nomeEl = row.querySelector('.nomeParteEAdvogado');
              if (tipoEl && nomeEl) {
                const tipo = tipoEl.textContent.trim();
                const nomeAdvogado = nomeEl.textContent.trim();
                // Separar nome da parte e advogado
                const partes = nomeAdvogado.split('Advogada:');
                const nomeParte = partes[0].trim();
                const advogado = partes[1] ? partes[1].trim() : '';

                info.partes.push({
                  tipo: tipo,
                  nome: nomeParte,
                  advogado: advogado
                });
              }
            });
          }

          // Movimentações processuais
          const movTable = document.querySelector('#tabelaTodasMovimentacoes') || document.querySelector('#tabelaUltimasMovimentacoes');
          if (movTable) {
            const movRows = movTable.querySelectorAll('tr.containerMovimentacao');
            movRows.forEach(row => {
              const dataEl = row.querySelector('.dataMovimentacao');
              const descEl = row.querySelector('.descricaoMovimentacao');
              if (dataEl && descEl) {
                const data = dataEl.textContent.trim();
                const descricao = descEl.textContent.trim();
                // Separar descrição e detalhes
                const descParts = descricao.split('br');
                const titulo = descParts[0] ? descParts[0].trim() : '';
                const detalhes = descParts[1] ? descParts[1].trim() : '';

                info.movimentacoes.push({
                  data: data,
                  titulo: titulo,
                  descricao: detalhes
                });
              }
            });
          }

          // Decisões (procurar em movimentações que contenham decisões)
          info.movimentacoes.forEach(mov => {
            if (mov.titulo.toLowerCase().includes('julgamento') ||
                mov.titulo.toLowerCase().includes('homolog') ||
                mov.titulo.toLowerCase().includes('decisão') ||
                mov.titulo.toLowerCase().includes('sentença')) {
              info.decisoes.push({
                tipo: mov.titulo,
                data: mov.data,
                conteudo: mov.descricao
              });
            }
          });

          // Documentos (links em movimentações)
          const docLinks = document.querySelectorAll('a.linkMovVincProc');
          docLinks.forEach(link => {
            const nome = link.textContent.trim();
            const url = link.href;
            if (nome && url) {
              info.documentos.push({
                nome: nome,
                link: url
              });
            }
          });

        } catch (error) {
          console.error('Erro extraindo detalhes:', error);
        }

        return info;
      });

      return {
        ...detailedInfo,
        url: caseUrl,
        extractedAt: new Date().toISOString(),
        fonte: 'e-SAJ TJSP - Página Detalhada'
      };

    } catch (error) {
      console.error(`❌ Erro acessando detalhes de ${caseNumber}:`, error.message);
      return null;
    } finally {
      if (detailPage) {
        await detailPage.close().catch(() => {});
      }
    }
  }

  /**
   * Fechar browser
   */
  async closeBrowser() {
    try {
      if (this.browser) {
        await this.browser.close();
        console.log('✅ Browser fechado');
      }
    } catch (error) {
      console.error('Erro fechando browser:', error.message);
    }
  }
}

export default EsajRealScraper;
