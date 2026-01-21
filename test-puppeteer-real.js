import puppeteer from 'puppeteer';

console.log('🚀 Iniciando teste real do Puppeteer com e-SAJ...\n');

async function searchJudicial() {
  let browser;
  
  try {
    console.log('📱 Abrindo navegador...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    const page = await browser.newPage();
    
    // User agent para evitar bloqueios
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );

    console.log('🌐 Acessando e-SAJ...');
    await page.goto('https://esaj.tjsp.jus.br/cpopg/search.do', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('📝 Preenchendo formulário com: "rodrigo munhoz reis"...');
    
    // Preenche o campo de nome usando o ID correto
    await page.type('#campo_NMPARTE', 'rodrigo munhoz reis', { delay: 50 });
    console.log('✅ Nome preenchido');

    console.log('🔍 Clicando em "Consultar"...');
    
    // Clica no botão de consulta
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}),
      page.click('button:contains("Consultar")').catch(() => page.click('input[type="submit"]'))
    ]);

    console.log('📊 Extraindo resultados...\n');

    // Espera pela tabela de resultados
    await page.waitForSelector('table', { timeout: 10000 }).catch(() => {
      console.log('⚠️ Tabela de resultados não encontrada');
    });

    // Extrai os dados da página
    const results = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      
      return rows.map(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length === 0) return null;

        // Extrai conteúdo de cada célula
        const texto = row.innerText;
        
        // Busca número do processo (padrão NNNNNNN-DD.AAAA.J.TT.OOOO)
        const processMatch = texto.match(/(\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4})/);
        
        return {
          processo: processMatch ? processMatch[1] : null,
          texto: texto,
          html: row.innerHTML
        };
      }).filter(r => r !== null && r.processo !== null);
    });

    if (results.length === 0) {
      console.log('❌ Nenhum resultado encontrado na e-SAJ');
      console.log('   Possível motivo: Nenhum processo para "rodrigo munhoz reis"');
      console.log('   Ou: e-SAJ retornou página sem tabela de resultados\n');
    } else {
      console.log(`✅ ${results.length} processo(s) encontrado(s)!\n`);
      results.forEach((r, i) => {
        console.log(`📌 PROCESSO ${i + 1}:`);
        console.log(`   Número: ${r.processo}`);
        console.log(`   Detalhes: ${r.texto.substring(0, 100)}...\n`);
      });
    }

    // Retorna os dados REAIS da página
    return {
      success: true,
      searchName: 'rodrigo munhoz reis',
      totalFound: results.length,
      results: results,
      timestamp: new Date().toISOString(),
      note: '✅ Dados 100% REAIS extraídos da e-SAJ - zero mocks'
    };

  } catch (error) {
    console.error('\n❌ Erro durante a busca:', error.message);
    return {
      success: false,
      error: error.message,
      note: 'Verifique: conexão de internet, e-SAJ disponível, Puppeteer instalado'
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Executa a busca
searchJudicial().then(result => {
  console.log('\n' + '='.repeat(60));
  console.log('📋 RESULTADO FINAL:');
  console.log('='.repeat(60));
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
});
