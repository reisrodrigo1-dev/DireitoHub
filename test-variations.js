import puppeteer from 'puppeteer';

console.log('🔍 Teste final - tentando diferentes variações\n');

async function testVariations() {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );

    const variations = [
      'rodrigo munhoz reis',
      'RODRIGO MUNHOZ REIS',
      'Rodrigo Munhoz Reis',
      'MUNHOZ REIS',
      'REIS'
    ];

    for (const name of variations) {
      console.log(`\n🔎 Testando: "${name}"`);
      console.log('─'.repeat(50));

      try {
        await page.goto('https://esaj.tjsp.jus.br/cpopg/search.do', {
          waitUntil: 'networkidle0',
          timeout: 60000
        });

        // Configura select
        await page.select('#cbPesquisa', 'NMPARTE');

        // Preenche campo
        await page.evaluate((searchName) => {
          document.getElementById('campo_NMPARTE').value = searchName;
        }, name);

        // Submete
        await page.click('#botaoConsultarProcessos');
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});

        // Aguarda
        await new Promise(r => setTimeout(r, 5000));

        // Analisa resultado
        const result = await page.evaluate(() => {
          const text = document.body.innerText;
          const url = window.location.href;

          // Verifica se encontrou resultados
          const hasResults = text.includes('Resultado') || text.includes('processo') || text.includes('Encontrado');
          const hasNoResults = text.includes('não encontrado') || text.includes('sem resultado') || text.includes('0 resultado');
          const hasCaptcha = text.includes('captcha') || text.includes('verificação');
          const hasError = text.includes('erro') || text.includes('inválido');

          // Procura por números de processo
          const processos = text.match(/\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}/g) || [];

          return {
            url: url,
            hasResults: hasResults,
            hasNoResults: hasNoResults,
            hasCaptcha: hasCaptcha,
            hasError: hasError,
            processosCount: processos.length,
            processos: processos.slice(0, 5), // primeiros 5
            textSnippet: text.substring(0, 1000)
          };
        });

        console.log(`   URL: ${result.url.substring(0, 80)}...`);
        console.log(`   Tem resultados: ${result.hasResults}`);
        console.log(`   Não encontrou: ${result.hasNoResults}`);
        console.log(`   Tem captcha: ${result.hasCaptcha}`);
        console.log(`   Tem erro: ${result.hasError}`);
        console.log(`   Processos encontrados: ${result.processosCount}`);

        if (result.processosCount > 0) {
          console.log('   📋 PROCESSOS:');
          result.processos.forEach((p, i) => console.log(`      [${i + 1}] ${p}`));
        }

        // Se encontrou processos, para aqui
        if (result.processosCount > 0) {
          console.log(`\n🎉 SUCESSO! Encontrados ${result.processosCount} processos para "${name}"`);
          return {
            success: true,
            name: name,
            processos: result.processos,
            url: result.url
          };
        }

      } catch (error) {
        console.log(`   ❌ Erro nesta variação: ${error.message}`);
      }
    }

    console.log('\n❌ Nenhuma variação encontrou resultados');
    return { success: false, note: 'Testadas várias variações do nome sem sucesso' };

  } catch (error) {
    console.error('\n❌ Erro geral:', error.message);
    return { success: false, error: error.message };
  } finally {
    if (browser) await browser.close();
  }
}

testVariations().then(result => {
  console.log('\n' + '='.repeat(70));
  console.log(JSON.stringify(result, null, 2));
});
