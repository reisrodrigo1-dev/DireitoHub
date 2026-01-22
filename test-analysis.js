// Teste da análise de documentos
import { analyzeDocument } from './documentAnalysisService.js';

const testContent = `
MINISTÉRIO PÚBLICO DO ESTADO DO RIO GRANDE DO SUL
1º Promotoria de Justiça de Marau

O MINISTÉRIO PÚBLICO, por seu Promotor de Justiça signatário, vem oferecer
DENÚNCIA contra
FABRÍCIO DE OLIVEIRA, brasileiro, solteiro, natural de Marau/RS, filho de Adão Luciano de Oliveira,
inscrito no RG sob o n.º 1125391811, CPF n.º 042.697.160-45, nascido em 31/07/1996,
residente na Rua dos Estados, n.º 251, Bairro Santa Helena, na Cidade de Marau/RS;

pela prática do crime de ASSOCIAÇÃO PARA O TRÁFICO DE DROGAS (artigo 35 da Lei 11.343/06)
e TRÁFICO DE DROGAS (artigo 33 da Lei 11.343/06).

Processo nº 50050421020248210109
`;

console.log('🧪 Iniciando teste de análise...');
analyzeDocument(testContent, 'apelacao-criminal')
  .then(result => {
    console.log('✅ Resultado do teste:', JSON.stringify(result, null, 2));
  })
  .catch(error => {
    console.error('❌ Erro no teste:', error);
  });