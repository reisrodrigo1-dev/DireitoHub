import puppeteer from 'puppeteer';

console.log('🔍 Teste com formulário exato da e-SAJ\n');

async function testSearch() {
  let browser;
  
  try {
    console.log('📱 Abrindo Chromium...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );

    console.log('🌐 Navegando para e-SAJ...');
    await page.goto('https://esaj.tjsp.jus.br/cpopg/search.do', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    console.log('✅ Página carregada\n');

    // Aguarda campo estar visível
    await page.waitForSelector('#campo_NMPARTE', { timeout: 10000 });
    
    console.log('1️⃣ Campo de nome encontrado');
    console.log('2️⃣ Preenchendo "rodrigo munhoz reis"...');
    
    await page.type('#campo_NMPARTE', 'rodrigo munhoz reis', { delay: 30 });

    console.log('3️⃣ Clicando em Consultar...\n');
    
    // Clica e aguarda navegação ou resposta
    await Promise.all([
      page.click('#botaoConsultarProcessos'),
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {})
    ]);

    console.log('⏳ Aguardando 3 segundos para página processar...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extrai conteúdo completo
    const content = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        totalText: document.body.innerText,
        htmlLength: document.documentElement.outerHTML.length
      };
    });

    console.log('\n📊 RESPOSTA DA PÁGINA:');
    console.log(`   URL: ${content.url}`);
    console.log(`   Título: ${content.title}`);
    console.log(`   Tamanho HTML: ${content.htmlLength} bytes\n`);

    console.log('📄 CONTEÚDO DE TEXTO (primeiros 3000 chars):');
    console.log('─'.repeat(70));
    console.log(content.totalText.substring(0, 3000));
    console.log('─'.repeat(70));

    // Procura por processos no conteúdo
    const processos = content.totalText.match(/\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}/g);
    
    console.log('\n🔎 BUSCA POR PADRÃO DE PROCESSO:');
    if (processos && processos.length > 0) {
      console.log(`✅ ENCONTRADOS: ${processos.length} processo(s)`);
      const unique = [...new Set(processos)];
      unique.forEach((p, i) => {
        console.log(`   [${i + 1}] ${p}`);
      });
    } else {
      console.log('❌ Nenhum processo encontrado no padrão NNNNNNN-DD.AAAA.J.TT.OOOO');
    }

    return {
      success: true,
      processosEncontrados: processos ? processos.length : 0,
      url: content.url,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    return { success: false, error: error.message };
  } finally {
    if (browser) await browser.close();
  }
}

testSearch().then(result => {
  console.log('\n' + '='.repeat(70));
  console.log('RESULTADO:', JSON.stringify(result, null, 2));
  process.exit(0);
});
