import puppeteer from 'puppeteer';

console.log('🚀 Teste AVANÇADO - Extraindo dados reais da e-SAJ\n');

async function searchJudicial() {
  let browser;
  
  try {
    console.log('📱 Iniciando navegador com Puppeteer...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    const page = await browser.newPage();
    
    // Aumenta timeout
    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(60000);
    
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    );

    console.log('🌐 Acessando e-SAJ...');
    await page.goto('https://esaj.tjsp.jus.br/cpopg/search.do', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    console.log('✅ Página carregada');

    // Aguarda o campo estar pronto
    await page.waitForSelector('#campo_NMPARTE', { timeout: 10000 });
    console.log('📝 Preenchendo campo de nome...');
    
    await page.type('#campo_NMPARTE', 'rodrigo munhoz reis', { delay: 50 });
    
    console.log('🔍 Clicando em Consultar...');
    
    // Aguarda o botão
    await page.waitForSelector('button[type="submit"]', { timeout: 5000 }).catch(() => {});
    
    // Clica no botão de submit
    await page.click('button[type="submit"]').catch(() => {
      console.log('❌ Botão submit não encontrado, tentando alternativa...');
    });

    // Aguarda resultados ou timeout
    console.log('⏳ Aguardando resultados (20s)...');
    
    try {
      await page.waitForSelector('table tbody tr', { timeout: 20000 });
      console.log('✅ Tabela de resultados encontrada!');
    } catch {
      console.log('⚠️ Sem tabela de resultados, verificando conteúdo...');
    }

    // Aguarda um pouco mais para a página processar
    await page.waitForTimeout(2000);

    // Extrai TUDO que há na página
    const pageData = await page.evaluate(() => {
      return {
        title: document.title,
        bodyHTML: document.body.innerText.substring(0, 2000),
        allText: document.documentElement.innerText.substring(0, 3000),
        tables: Array.from(document.querySelectorAll('table')).length,
        divs: Array.from(document.querySelectorAll('div[class*="result"], div[class*="processo"]')).length,
        textContent: document.body.textContent.substring(0, 2000)
      };
    });

    console.log('\n📄 ESTRUTURA DA PÁGINA:');
    console.log(`   Título: ${pageData.title}`);
    console.log(`   Tabelas encontradas: ${pageData.tables}`);
    console.log(`   Divs de resultado: ${pageData.divs}`);

    console.log('\n📋 PRIMEIROS 1500 CHARS DO CONTEÚDO:');
    console.log(pageData.textContent.substring(0, 1500));

    // Tenta extrair resultados
    const results = await page.evaluate(() => {
      const processes = [];
      
      // Procura por padrão de número de processo
      const allText = document.body.innerText;
      const regex = /(\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4})/g;
      const matches = allText.match(regex);
      
      if (matches) {
        // Remove duplicatas
        const unique = [...new Set(matches)];
        processes.push(...unique.map(proc => ({
          numeroProcesso: proc,
          encontradoEm: 'página',
          dataExtracao: new Date().toISOString()
        })));
      }

      // Também procura em tabelas
      const rows = document.querySelectorAll('table tbody tr');
      if (rows.length > 0) {
        rows.forEach((row, idx) => {
          const texto = row.innerText;
          const match = texto.match(/(\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4})/);
          if (match) {
            processes.push({
              numeroProcesso: match[1],
              linhaTabela: idx,
              textoCompleto: texto.substring(0, 200)
            });
          }
        });
      }

      return processes;
    });

    console.log(`\n✅ RESULTADO FINAL:`);
    console.log(`   Total de processos encontrados: ${results.length}`);
    
    if (results.length > 0) {
      console.log('\n📌 PROCESSOS ENCONTRADOS:');
      results.forEach((proc, i) => {
        console.log(`   [${i + 1}] ${proc.numeroProcesso}`);
        if (proc.textoCompleto) {
          console.log(`       ${proc.textoCompleto}`);
        }
      });
    } else {
      console.log('   ⚠️ Nenhum processo encontrado na resposta');
    }

    return {
      success: results.length > 0,
      searchName: 'rodrigo munhoz reis',
      totalFound: results.length,
      results: results,
      timestamp: new Date().toISOString(),
      note: results.length > 0 ? '✅ DADOS REAIS - 100% extraídos da e-SAJ' : '⚠️ e-SAJ pode não ter resultados ou página não carregou corretamente'
    };

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error(error.stack);
    return {
      success: false,
      error: error.message
    };
  } finally {
    if (browser) {
      console.log('\n🔚 Fechando navegador...');
      await browser.close();
    }
  }
}

searchJudicial().then(result => {
  console.log('\n' + '='.repeat(70));
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
});
