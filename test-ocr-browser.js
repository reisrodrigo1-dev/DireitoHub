// Teste do OCR no console do browser
// Execute isso no console do browser (F12) quando estiver na página da Juri AI

import { processDocument } from '/src/services/documentService.js';

// Função de teste para verificar se o OCR está funcionando
async function testOCRImplementation() {
  console.log('🧪 Testando implementação OCR...');

  // Verificar se as funções estão disponíveis
  console.log('✅ Funções disponíveis:', {
    processDocument: typeof processDocument,
    detectNeedsOCR: typeof window.detectNeedsOCR,
    performOCR: typeof window.performOCR
  });

  // Testar detecção de texto que precisa OCR
  const sampleGarbageText = '                                                                                                   !                      "                      ! #       $% &&'()*&'+,&))      -         $.    !                 / /   $%   ! !    /     0      1    2  /        3 456 ';

  // Simular um arquivo PDF pequeno para teste
  console.log('📄 Testando com arquivo PDF simulado...');

  // Este é apenas um teste conceitual - o OCR real precisa de um arquivo PDF real
  console.log('💡 Para testar completamente:');
  console.log('1. Vá para a tela Juri AI');
  console.log('2. Clique em "📎 Anexar Documentos"');
  console.log('3. Selecione um PDF escaneado (como o exemplo fornecido)');
  console.log('4. Observe no console se aparece "🤖 Iniciando OCR"');
  console.log('5. Verifique se o texto é extraído corretamente');

  return 'Teste concluído - verifique o console para detalhes';
}

// Disponibilizar função globalmente
window.testOCRImplementation = testOCRImplementation;

console.log('🎯 Execute: testOCRImplementation() para testar o OCR');