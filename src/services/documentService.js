// Serviço para leitura e processamento de documentos
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { requiresMandatoryDocument, canBenefitFromDocument, getDocumentRequestMessage } from './promptDocumentConfig.js';

// Configurar o worker do PDF.js
if (typeof window !== 'undefined') {
  // Use a versão que está na pasta public
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

// Verificar se estamos no browser ou Node.js
const isBrowser = typeof window !== 'undefined';

// Função para ler arquivos de texto simples
const readTextFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file, 'utf-8');
  });
};

// Função para ler arquivos Word (.docx)
const readWordFile = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.error('Erro ao ler arquivo Word:', error);
    throw new Error('Erro ao processar arquivo Word. Certifique-se de que é um arquivo .docx válido.');
  }
};

// Função para ler PDFs com extração real de texto
const readPDFFile = async (file) => {
  console.log('🔍 Processando PDF:', file.name);
  
  try {
    // Verificar se pdfjsLib está disponível
    if (!pdfjsLib || !pdfjsLib.getDocument) {
      console.warn('⚠️ PDF.js não disponível, tentando fallback');
      throw new Error('Biblioteca PDF.js não está disponível');
    }
    
    const arrayBuffer = await file.arrayBuffer();
    console.log('📖 ArrayBuffer criado, iniciando parseamento do PDF');
    
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    console.log('📑 PDF carregado com', pdf.numPages, 'páginas');
    
    let extractedText = '';
    
    // Extrair texto de todas as páginas
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        console.log(`📄 Página ${pageNum}: ${pageText.length} caracteres`);
        extractedText += pageText + '\n';
      } catch (pageError) {
        console.warn(`⚠️ Erro ao processar página ${pageNum}:`, pageError);
      }
    }
    
    if (!extractedText || extractedText.trim().length === 0) {
      console.error('❌ Nenhum texto foi extraído do PDF');
      throw new Error('Nenhum texto foi extraído do PDF. O arquivo pode estar vazio ou ser uma imagem.');
    }
    
    console.log('✅ PDF processado com sucesso:', {
      fileName: file.name,
      páginas: pdf.numPages,
      caracteres: extractedText.length,
      preview: extractedText.substring(0, 100)
    });
    
    return extractedText;
  } catch (error) {
    console.error('❌ Erro ao processar PDF:', error);
    
    // Fallback: Retornar mensagem orientando converter para outro formato
    const fileName = file.name;
    return `⚠️ AVISO: O PDF "${fileName}" não pôde ser processado automaticamente.

📋 COMO RESOLVER:
1. Abra o PDF em seu computador
2. Selecione todo o texto (Ctrl+A)
3. Copie o texto (Ctrl+C)
4. Crie um arquivo .txt
5. Cole o conteúdo (Ctrl+V)
6. Salve o arquivo
7. Anexe o arquivo .txt aqui

Ou:
1. Use uma ferramenta online gratuita para converter PDF → TXT
2. Anexe o arquivo .txt resultante

ALTERNATIVA:
- Você pode colar o conteúdo do PDF diretamente na mensagem de chat

🔄 O sistema está pronto para processar o texto quando enviado!`;
  }
};

// Função principal para processar qualquer tipo de documento
export const processDocument = async (file) => {
  if (!file) {
    throw new Error('Nenhum arquivo fornecido');
  }

  const fileExtension = file.name.toLowerCase().split('.').pop();
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (file.size > maxSize) {
    throw new Error('Arquivo muito grande. Tamanho máximo: 10MB');
  }

  let content = '';
  
  try {
    switch (fileExtension) {
      case 'txt':
        content = await readTextFile(file);
        break;
      
      case 'docx':
        content = await readWordFile(file);
        break;
      
      case 'doc':
        throw new Error('Arquivos .doc não são suportados. Converta para .docx ou .txt');
      
      case 'pdf':
        console.log('📂 Iniciando leitura de PDF...');
        content = await readPDFFile(file);
        console.log('✅ Conteúdo do PDF retornado:', {
          length: content.length,
          firstChars: content.substring(0, 100),
          isWarning: content.includes('AVISO')
        });
        break;
      
      default:
        throw new Error(`Tipo de arquivo não suportado: .${fileExtension}. Use: .txt, .docx, .pdf`);
    }

    // Validar conteúdo extraído
    if (!content || content.trim().length === 0) {
      throw new Error('O documento está vazio ou não pôde ser lido');
    }

    // Limitar tamanho do conteúdo
    const maxContentLength = 50000; // 50k caracteres
    if (content.length > maxContentLength) {
      content = content.substring(0, maxContentLength) + '\n\n[DOCUMENTO TRUNCADO - MUITO LONGO]';
    }

    const result = {
      success: true,
      fileName: file.name,
      fileSize: file.size,
      fileType: fileExtension,
      content: content.trim(),
      wordCount: content.trim().split(/\s+/).length
    };
    
    console.log('📊 Resultado de processDocument:', {
      success: result.success,
      fileName: result.fileName,
      wordCount: result.wordCount,
      contentLength: result.content.length,
      contentPreview: result.content.substring(0, 100)
    });
    
    return result;

  } catch (error) {
    console.error('Erro ao processar documento:', error);
    return {
      success: false,
      error: error.message || 'Erro desconhecido ao processar documento'
    };
  }
};

// Função para validar se um prompt específico precisa de documentos
export const promptRequiresDocument = (promptType) => {
  return requiresMandatoryDocument(promptType?.id, promptType?.name);
};

// Função para verificar se prompt pode se beneficiar de documentos
export const promptCanBenefitFromDocument = (promptType) => {
  return canBenefitFromDocument(promptType?.id, promptType?.name);
};

// Função para gerar mensagem solicitando documento
export const generateDocumentRequestMessage = (promptType) => {
  return getDocumentRequestMessage(promptType);
};

// Função para gerar mensagem de documento para mensagem inicial
export const generateInitialDocumentMessage = (promptType) => {
  const promptName = promptType?.name || '';
  const promptId = (promptType?.id || '').toLowerCase();
  
  // Mensagens específicas mais diretas para a mensagem inicial
  if (promptId.includes('laudo') || promptId.includes('medico')) {
    return `📋 **DOCUMENTO NECESSÁRIO:** Para analisar laudos médicos, você precisará anexar o documento durante nossa conversa. Aceito arquivos .txt e .docx (máximo 10MB).`;
  }
  
  if (promptId.includes('pec')) {
    return `📜 **DOCUMENTO NECESSÁRIO:** Para analisar a PEC, você precisará anexar o texto completo da proposta. Aceito arquivos .txt e .docx (máximo 10MB).`;
  }
  
  if (promptId.includes('correcao') || promptId.includes('corrigir')) {
    return `✏️ **DOCUMENTO NECESSÁRIO:** Para corrigir seu texto, você precisará anexar o documento original. Aceito arquivos .txt e .docx (máximo 10MB).`;
  }
  
  if (promptId.includes('memoriais')) {
    return `📝 **DOCUMENTO NECESSÁRIO:** Para elaborar memoriais, você precisará anexar as peças processuais relevantes. Aceito arquivos .txt e .docx (máximo 10MB).`;
  }
  
  if (promptId.includes('resumir') || promptId.includes('resumo')) {
    return `📋 **DOCUMENTO NECESSÁRIO:** Para criar um resumo, você precisará anexar os documentos do processo. Aceito arquivos .txt e .docx (máximo 10MB).`;
  }
  
  if (promptId.includes('relatorio')) {
    return `📊 **DOCUMENTO NECESSÁRIO:** Para elaborar o relatório, você precisará anexar os documentos base. Aceito arquivos .txt e .docx (máximo 10MB).`;
  }
  
  if (promptId.includes('contradicoes') || promptId.includes('encontrar')) {
    return `🔍 **DOCUMENTO NECESSÁRIO:** Para encontrar contradições, você precisará anexar os depoimentos ou documentos a serem analisados. Aceito arquivos .txt e .docx (máximo 10MB).`;
  }
  
  if (promptId.includes('rebater') || promptId.includes('acrescentar')) {
    return `⚖️ **DOCUMENTO NECESSÁRIO:** Para trabalhar com argumentos, você precisará anexar a peça original. Aceito arquivos .txt e .docx (máximo 10MB).`;
  }
  
  if (promptId.includes('ementa')) {
    return `🏛️ **DOCUMENTO NECESSÁRIO:** Para elaborar a ementa, você precisará anexar a decisão judicial. Aceito arquivos .txt e .docx (máximo 10MB).`;
  }
  
  if (promptId.includes('dosimetria')) {
    return `⚖️ **DOCUMENTO NECESSÁRIO:** Para análise de dosimetria, você precisará anexar os documentos do processo criminal. Aceito arquivos .txt e .docx (máximo 10MB).`;
  }
  
  if (promptId.includes('replica')) {
    return `📝 **DOCUMENTO NECESSÁRIO:** Para elaborar uma réplica eficaz, você precisará anexar a contestação da parte contrária. Aceito arquivos .txt e .docx (máximo 10MB).`;
  }
  
  if (promptId.includes('contrarrazoes')) {
    return `⚖️ **DOCUMENTO NECESSÁRIO:** Para elaborar contrarrazões, você precisará anexar o recurso da parte contrária. Aceito arquivos .txt e .docx (máximo 10MB).`;
  }
  
  if (promptId.includes('razoes-rese')) {
    return `📋 **DOCUMENTO NECESSÁRIO:** Para fundamentar o Recurso Especial, você precisará anexar o acórdão recorrido. Aceito arquivos .txt e .docx (máximo 10MB).`;
  }
  
  if (promptId.includes('despacho-judicial')) {
    return `⚖️ **DOCUMENTO NECESSÁRIO:** Para elaborar o despacho, você precisará anexar as petições das partes. Aceito arquivos .txt e .docx (máximo 10MB).`;
  }
  
  // Mensagem genérica para outros tipos que requerem documento
  return `📄 **DOCUMENTO NECESSÁRIO:** Para realizar ${promptName}, você precisará anexar o documento relacionado durante nossa conversa. Aceito arquivos .txt e .docx (máximo 10MB).`;
};

export default {
  processDocument,
  promptRequiresDocument,
  promptCanBenefitFromDocument,
  generateDocumentRequestMessage,
  generateInitialDocumentMessage
};
