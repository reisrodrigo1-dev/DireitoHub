import puppeteer from 'puppeteer';

console.log('🔍 Encontrando o botão de consulta\n');

async function findButton() {
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

    // Encontra TODOS os buttons
    const buttons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]')).map((btn, i) => ({
        index: i,
        tagName: btn.tagName,
        type: btn.type,
        id: btn.id,
        name: btn.name,
        class: btn.className,
        value: btn.value,
        text: btn.textContent.trim()
      }));
    });

    console.log('📌 TODOS OS BOTÕES ENCONTRADOS:\n');
    buttons.forEach(btn => {
      console.log(`[${btn.index}] <${btn.tagName}>`);
      console.log(`    type="${btn.type}" id="${btn.id}" name="${btn.name}"`);
      console.log(`    class="${btn.class}"`);
      console.log(`    text="${btn.text}" value="${btn.value}"\n`);
    });

    return buttons;

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (browser) await browser.close();
  }
}

findButton();
