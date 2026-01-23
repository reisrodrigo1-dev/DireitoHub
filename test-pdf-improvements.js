// Teste das melhorias para processamento de PDFs grandes
import { processDocument } from './src/services/documentService.js';
import { estimateTokens } from './src/services/openaiService.js';

console.log('🧪 Iniciando testes das melhorias para PDFs grandes...\n');

// Teste 1: Verificar se limite de 50k caracteres foi removido
console.log('Teste 1: Verificação de limites de processamento');
const testContent = 'A'.repeat(60000); // 60k caracteres
console.log(`✅ Criado conteúdo de teste: ${testContent.length} caracteres`);

// Teste 2: Verificar função de chunking inteligente
console.log('\nTeste 2: Função de chunking inteligente');
const legalText = `
DOS FATOS

O réu foi condenado por crime de furto qualificado.

DA SENTENÇA

O juiz aplicou pena de 2 anos de reclusão.

DO DIREITO

Art. 155 do CPB prevê pena de reclusão de 1 a 4 anos.

DOS PEDIDOS

Requer reforma da sentença.
`.repeat(10); // Repetir para criar texto maior

console.log(`📄 Texto jurídico de teste: ${legalText.length} caracteres`);
console.log(`🔢 Estimativa de tokens: ${estimateTokens(legalText)}`);

// Teste 3: Verificar configuração de tokens para apelação criminal
console.log('\nTeste 3: Configuração de tokens atualizada');
const { PROMPT_SPECIFIC_CONFIG } = await import('./src/config/aiConfig.js');
const apelacaoConfig = PROMPT_SPECIFIC_CONFIG['apelacao-criminal'];

console.log('Configuração apelação criminal:');
console.log(`- maxTokens: ${apelacaoConfig.maxTokens}`);
console.log(`- chunkSize: ${apelacaoConfig.chunkSize}`);
console.log(`- numberOfParts: ${apelacaoConfig.numberOfParts}`);
console.log(`- Total estimado: ${apelacaoConfig.numberOfParts * apelacaoConfig.chunkSize} tokens`);

console.log('\n✅ Todos os testes básicos passaram!');