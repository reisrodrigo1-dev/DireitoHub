import puppeteer from 'puppeteer';

console.log('🔍 Testando submissão correta do formulário\n');

async function testFormSubmit() {
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

    await page.goto('https://esaj.tjsp.jus.br/cpopg/search.do', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    console.log('✅ Página carregada\n');

    // Verifica o estado inicial do select
    const selectState = await page.evaluate(() => {
      const sel = document.getElementById('cbPesquisa');
      return {
        value: sel.value,
        selectedText: sel.options[sel.selectedIndex].text,
        options: Array.from(sel.options).map(opt => ({
          value: opt.value,
          text: opt.text,
          selected: opt.selected
        }))
      };
    });

    console.log('ESTADO DO SELECT cbPesquisa:');
    console.log(`   Valor atual: ${selectState.value}`);
    console.log(`   Texto selecionado: ${selectState.selectedText}`);
    console.log('   Opções disponíveis:');
    selectState.options.forEach(opt => {
      console.log(`     ${opt.value}: ${opt.text} ${opt.selected ? '(SELECIONADO)' : ''}`);
    });

    // Verifica se está selecionado "NMPARTE"
    if (selectState.value !== 'NMPARTE') {
      console.log('\n⚠️ Select não está em "Nome da parte", mudando...');
      await page.select('#cbPesquisa', 'NMPARTE');
      console.log('✅ Select mudado para "Nome da parte"');
    } else {
      console.log('\n✅ Select já está correto: "Nome da parte"');
    }

    // Agora preenche o campo
    console.log('\n📝 Preenchendo campo de nome...');
    await page.evaluate(() => {
      const inp = document.getElementById('campo_NMPARTE');
      inp.value = 'rodrigo munhoz reis';
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const fieldValue = await page.$eval('#campo_NMPARTE', el => el.value);
    console.log(`   Campo preenchido: "${fieldValue}"`);

    // Verifica se há um campo hidden que precisa ser preenchido
    const hiddenFields = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input[type="hidden"]')).map(inp => ({
        name: inp.name,
        value: inp.value,
        id: inp.id
      })).filter(inp => inp.name.includes('dadosConsulta'));
    });

    console.log('\n🔍 Campos hidden relacionados:');
    hiddenFields.forEach(field => {
      console.log(`   ${field.name}: "${field.value}"`);
    });

    // Tenta submeter o form diretamente
    console.log('\n📤 Submetendo formulário...');

    // Método 1: Clicar no botão
    try {
      await Promise.all([
        page.click('#botaoConsultarProcessos'),
        page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {})
      ]);
    } catch (e) {
      console.log('   Método 1 falhou, tentando método 2...');
      // Método 2: Submeter o form via JavaScript
      await page.evaluate(() => {
        document.forms[0].submit();
      });
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
    }

    await new Promise(r => setTimeout(r, 3000));

    // Verifica resultado
    const result = await page.evaluate(() => {
      const url = window.location.href;
      const title = document.title;
      const hasError = document.body.innerText.includes('inválido');
      const hasResults = document.body.innerText.includes('processo') && !hasError;

      return {
        url: url,
        title: title,
        hasError: hasError,
        hasResults: hasResults,
        textSnippet: document.body.innerText.substring(0, 500)
      };
    });

    console.log('\n📊 RESULTADO:');
    console.log(`   URL: ${result.url.substring(0, 100)}...`);
    console.log(`   Título: ${result.title}`);
    console.log(`   Tem erro: ${result.hasError}`);
    console.log(`   Tem resultados: ${result.hasResults}`);

    console.log('\n📄 TEXTO DA PÁGINA:');
    console.log(result.textSnippet);

    // Procura por processos
    const processos = result.textSnippet.match(/\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}/g);
    if (processos) {
      console.log(`\n✅ PROCESSOS ENCONTRADOS: ${processos.length}`);
      processos.forEach((p, i) => console.log(`   [${i + 1}] ${p}`));
    } else {
      console.log('\n❌ Nenhum processo encontrado');
    }

    return {
      success: !result.hasError && result.hasResults,
      processosEncontrados: processos ? processos.length : 0,
      url: result.url
    };

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    return { success: false, error: error.message };
  } finally {
    if (browser) await browser.close();
  }
}

testFormSubmit().then(result => {
  console.log('\n' + '='.repeat(70));
  console.log(JSON.stringify(result, null, 2));
});
