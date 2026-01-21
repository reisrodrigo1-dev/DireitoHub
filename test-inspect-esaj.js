import puppeteer from 'puppeteer';

console.log('🔎 Analisando estrutura real da e-SAJ...\n');

async function inspectPage() {
  let browser;
  
  try {
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

    console.log('📌 Acessando https://esaj.tjsp.jus.br/cpopg/search.do...');
    await page.goto('https://esaj.tjsp.jus.br/cpopg/search.do', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('✅ Página carregada');
    console.log('\n🔍 Analisando elementos do formulário:\n');

    // Analisa os inputs
    const inputs = await page.evaluate(() => {
      const allInputs = Array.from(document.querySelectorAll('input[type="text"]'));
      return allInputs.map((inp, i) => ({
        index: i,
        name: inp.name,
        id: inp.id,
        placeholder: inp.placeholder,
        value: inp.value
      }));
    });

    console.log('INPUT FIELDS:');
    inputs.forEach(inp => {
      console.log(`  [${inp.index}] name="${inp.name}" id="${inp.id}" placeholder="${inp.placeholder}"`);
    });

    // Analisa checkboxes
    const checkboxes = await page.evaluate(() => {
      const allChecks = Array.from(document.querySelectorAll('input[type="checkbox"]'));
      return allChecks.map((chk, i) => ({
        index: i,
        name: chk.name,
        id: chk.id,
        value: chk.value,
        checked: chk.checked
      }));
    });

    console.log('\nCHECKBOX FIELDS:');
    checkboxes.forEach(chk => {
      console.log(`  [${chk.index}] name="${chk.name}" id="${chk.id}" value="${chk.value}"`);
    });

    // Analisa botões
    const buttons = await page.evaluate(() => {
      const allBtns = Array.from(document.querySelectorAll('button, input[type="submit"]'));
      return allBtns.map((btn, i) => ({
        index: i,
        type: btn.tagName,
        name: btn.name,
        id: btn.id,
        value: btn.value,
        text: btn.textContent.trim()
      })).filter(b => b.text || b.value);
    });

    console.log('\nBUTTON FIELDS:');
    buttons.forEach(btn => {
      console.log(`  [${btn.index}] <${btn.type}> name="${btn.name}" id="${btn.id}" text="${btn.text || btn.value}"`);
    });

    // Analisa labels
    const labels = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('label')).map((lbl, i) => ({
        index: i,
        text: lbl.textContent.trim(),
        htmlFor: lbl.htmlFor
      })).filter(l => l.text.length > 0);
    });

    console.log('\nLABELS:');
    labels.forEach(lbl => {
      console.log(`  [${lbl.index}] for="${lbl.htmlFor}" text="${lbl.text}"`);
    });

    // HTML completo do formulário
    const formHTML = await page.evaluate(() => {
      const form = document.querySelector('form');
      return form ? form.outerHTML.substring(0, 1000) : 'Form not found';
    });

    console.log('\nPRIMEIROS 1000 CHARS DO FORMULÁRIO:');
    console.log(formHTML);

    console.log('\n✅ Análise completa');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

inspectPage();
