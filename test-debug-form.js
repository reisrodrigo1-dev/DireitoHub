import puppeteer from 'puppeteer';

console.log('🔍 Investigando por que o formulário não funciona\n');

async function debugForm() {
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto('https://esaj.tjsp.jus.br/cpopg/search.do', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    console.log('✅ Página carregada\n');

    // Verifica o estado do campo ANTES de preencher
    const beforeFill = await page.evaluate(() => {
      const inp = document.getElementById('campo_NMPARTE');
      return {
        exists: !!inp,
        value: inp?.value || '',
        name: inp?.name || '',
        type: inp?.type || ''
      };
    });

    console.log('ANTES DE PREENCHER:');
    console.log(JSON.stringify(beforeFill, null, 2));

    // Tenta várias formas de preencher
    console.log('\n1️⃣ Tentando com page.type()...');
    await page.type('#campo_NMPARTE', 'rodrigo', { delay: 50 });

    const after1 = await page.$eval('#campo_NMPARTE', el => el.value);
    console.log(`   Resultado: "${after1}"`);

    // Limpa e tenta com evaluate
    console.log('\n2️⃣ Limpando e tentando com evaluate...');
    await page.evaluate(() => {
      document.getElementById('campo_NMPARTE').value = '';
    });

    await page.evaluate(() => {
      const inp = document.getElementById('campo_NMPARTE');
      inp.value = 'rodrigo munhoz reis';
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const after2 = await page.$eval('#campo_NMPARTE', el => el.value);
    console.log(`   Resultado: "${after2}"`);

    // Verifica se há alguma função JavaScript que valida
    console.log('\n3️⃣ Procurando por validadores ou handlers...');
    const handlers = await page.evaluate(() => {
      const inp = document.getElementById('campo_NMPARTE');
      return {
        hasOnChange: !!inp.onchange,
        hasOnInput: !!inp.oninput,
        hasOnBlur: !!inp.onblur,
        classes: inp.className,
        attributes: Array.from(inp.attributes).map(attr => `${attr.name}="${attr.value}"`)
      };
    });

    console.log(JSON.stringify(handlers, null, 2));

    // Tenta limpar e preencher novamente
    console.log('\n4️⃣ Tentativa final com aguardo...');
    await page.evaluate(() => {
      document.getElementById('campo_NMPARTE').value = '';
    });

    await new Promise(r => setTimeout(r, 500));

    await page.type('#campo_NMPARTE', 'rodrigo munhoz reis', { delay: 100 });
    
    await new Promise(r => setTimeout(r, 500));

    // Verifica campo antes de submeter
    const beforeSubmit = await page.$eval('#campo_NMPARTE', el => el.value);
    console.log(`   Campo antes de submeter: "${beforeSubmit}"`);

    // Clica no botão
    console.log('\n5️⃣ Clicando em Consultar...');
    await page.click('#botaoConsultarProcessos');

    await new Promise(r => setTimeout(r, 3000));

    // Verifica URL após submit
    const urlAfter = await page.evaluate(() => window.location.href);
    console.log(`   URL após: ${urlAfter.substring(0, 150)}...`);

    // Tira screenshot para ver o estado
    await page.screenshot({ path: 'esaj-debug.png' });
    console.log('\n📸 Screenshot salvo: esaj-debug.png');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
  } finally {
    if (browser) await browser.close();
  }
}

debugForm();
