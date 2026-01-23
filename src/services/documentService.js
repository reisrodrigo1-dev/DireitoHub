// Serviço para leitura e processamento de documentos
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';
import { requiresMandatoryDocument, canBenefitFromDocument, getDocumentRequestMessage } from './promptDocumentConfig.js';

// Configurar o worker do PDF.js
if (typeof window !== 'undefined') {
  // Use a versão que está na pasta public
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

// Verificar se estamos no browser ou Node.js
const isBrowser = typeof window !== 'undefined';

// Configurações otimizadas por tipo de documento
const DOCUMENT_OPTIMIZATIONS = {
  'apelacao-criminal': {
    ocrThreshold: 0.7, // Threshold mais alto para apelações (70% - mais tolerante a caracteres especiais)
    preferDirectExtraction: true,
    batchSize: 20, // Processar mais páginas por lote para PDFs grandes
    concurrentPages: 5, // Menos concorrência para estabilidade
    samplePages: 5 // Amostrar mais páginas para detecção mais precisa
  },
  'default': {
    ocrThreshold: 0.5,
    preferDirectExtraction: true,
    batchSize: 10,
    concurrentPages: 10,
    samplePages: 3
  }
};

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

// Função melhorada para detectar se o texto extraído precisa de OCR
// Otimizada para documentos jurídicos brasileiros
const detectNeedsOCR = (text, documentType = 'default') => {
  if (!text || text.trim().length === 0) return true;
  
  const config = DOCUMENT_OPTIMIZATIONS[documentType] || DOCUMENT_OPTIMIZATIONS.default;
  
  // Para documentos jurídicos, permitir mais caracteres especiais
  // Caracteres comuns em documentos jurídicos brasileiros
  const legalSpecialChars = /[§ºª°\.\-\,\;\:\!\?\(\)\[\]\{\}\"\'\d]/g;
  const textWithoutLegalChars = text.replace(legalSpecialChars, '');
  
  // Contar caracteres não-texto (excluindo caracteres jurídicos comuns)
  const nonTextChars = textWithoutLegalChars.match(/[^\w\s]/g) || [];
  const totalChars = textWithoutLegalChars.length;
  
  if (totalChars === 0) return true; // Se só tinha caracteres especiais, provavelmente precisa OCR
  
  const nonTextRatio = nonTextChars.length / totalChars;
  
  // Usar threshold específico do tipo de documento
  const needsOCR = nonTextRatio > config.ocrThreshold;
  
  console.log(`🔍 Análise OCR (${documentType}): ${nonTextChars.length}/${totalChars} caracteres não-texto (${(nonTextRatio * 100).toFixed(1)}%) - OCR ${needsOCR ? 'NECESSÁRIO' : 'NÃO NECESSÁRIO'}`);
  
  return needsOCR;
};

// Função otimizada para extração rápida de texto direto (sem OCR)
const extractTextDirectFast = async (pdf, documentType = 'default') => {
  console.log('⚡ Iniciando extração direta rápida de texto');
  
  let extractedText = '';
  const totalPages = pdf.numPages;
  
  // Configurações baseadas no tipo de documento
  const config = DOCUMENT_OPTIMIZATIONS[documentType] || DOCUMENT_OPTIMIZATIONS.default;
  const batchSize = config.batchSize || 10;
  
  // Processar em lotes otimizados para melhor performance
  for (let batchStart = 1; batchStart <= totalPages; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize - 1, totalPages);
    console.log(`📄 Processando lote: páginas ${batchStart}-${batchEnd}/${totalPages}`);
    
    const pagePromises = [];
    for (let pageNum = batchStart; pageNum <= batchEnd; pageNum++) {
      pagePromises.push(
        pdf.getPage(pageNum).then(page => 
          page.getTextContent().then(textContent => ({
            pageNum,
            text: textContent.items.map(item => item.str).join(' ')
          }))
        ).catch(error => {
          console.warn(`⚠️ Erro na página ${pageNum}:`, error);
          return { pageNum, text: '' };
        })
      );
    }
    
    // Aguardar todas as páginas do lote
    const batchResults = await Promise.allSettled(pagePromises);
    
    // Ordenar por número da página e juntar
    batchResults.sort((a, b) => {
      const pageA = a.status === 'fulfilled' ? a.value.pageNum : 0;
      const pageB = b.status === 'fulfilled' ? b.value.pageNum : 0;
      return pageA - pageB;
    });
    
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        extractedText += result.value.text + '\n';
      }
    }
  }
  
  console.log(`✅ Extração direta concluída: ${extractedText.length} caracteres de ${totalPages} páginas`);
  return extractedText;
};

// Função para renderizar página PDF como imagem com tratamento de erros
const renderPDFPageToImage = async (page, scale = 2.0) => {
  try {
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };

    // Renderizar com timeout maior para PDFs complexos
    const renderPromise = page.render(renderContext).promise;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Render timeout')), 120000) // 120 segundos timeout
    );

    await Promise.race([renderPromise, timeoutPromise]);
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.warn('Erro ao renderizar página PDF, tentando com qualidade reduzida:', error);

    // Tentar novamente com qualidade mais baixa
    try {
      const viewport = page.getViewport({ scale: scale * 0.5 }); // Metade da escala
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      await page.render(renderContext).promise;
      return canvas.toDataURL('image/png');
    } catch (fallbackError) {
      console.error('Falha crítica ao renderizar página PDF:', fallbackError);
      // Retornar uma imagem vazia em caso de falha total
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const context = canvas.getContext('2d');
      context.fillStyle = 'white';
      context.fillRect(0, 0, 100, 100);
      return canvas.toDataURL('image/png');
    }
  }
};

// Função para executar OCR em uma imagem com tratamento robusto de erros
const performOCR = async (imageData, language = 'por+eng', memoryOptimized = false) => {
  let worker = null;
  try {
    // Criar worker com linguagem
    worker = await createWorker(language);

    // Configurações que podem ser alteradas após inicialização
    await worker.setParameters({
      tessedit_pageseg_mode: memoryOptimized ? '6' : '3', // 6 para PDFs grandes, 3 para normais
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,;:!?()[]{}"\'-@#$%&*+=/\\|~ÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝàáâãäåçèéêëìíîïñòóôõöùúûüýÿ',
      tessedit_do_invert: '0', // Desabilitar inversão
      textord_min_linesize: '2.5', // Tamanho mínimo de linha
      tessedit_write_images: '0', // Não salvar imagens intermediárias
      tessedit_dump_pageseg_images: '0', // Não salvar imagens de segmentação
      debug_file: '/dev/null', // Desabilitar logs de debug
    });

    // Executar OCR com timeout
    const ocrPromise = worker.recognize(imageData);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('OCR timeout')), 60000) // 60 segundos timeout
    );

    const { data: { text, confidence } } = await Promise.race([ocrPromise, timeoutPromise]);
    return { text, confidence };

  } catch (error) {
    console.warn('Erro no OCR, tentando com configurações mais simples:', error);

    // Tentar novamente com configurações mínimas (sem alterar engine mode)
    try {
      if (worker) {
        await worker.setParameters({
          tessedit_pageseg_mode: '3', // Fully automatic page segmentation
        });

        const { data: { text, confidence } } = await worker.recognize(imageData);
        return { text: text || '', confidence: confidence || 0 };
      }
    } catch (fallbackError) {
      console.error('Falha crítica no OCR:', fallbackError);
    }

    // Retornar resultado vazio em caso de falha total
    return { text: '', confidence: 0 };
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch (terminateError) {
        console.warn('Erro ao terminar worker OCR:', terminateError);
      }
    }

    // Limpeza adicional de memória para PDFs grandes
    if (memoryOptimized && window.gc) {
      window.gc();
    }
  }
};

// Função para processar páginas PDF com OCR se necessário
const processPDFPagesWithOCR = async (pdf, maxPages = 20, concurrentChunks = 10, quality = 'medium', documentType = 'default') => {
  const scale = quality === 'high' ? 3.0 : quality === 'low' ? 1.5 : 2.0; // DPI aproximado: high=450, medium=300, low=225

  let extractedText = '';
  let usedOCR = false;
  let totalPages = 0;

  // Primeiro, tentar extrair texto diretamente das primeiras páginas
  const config = DOCUMENT_OPTIMIZATIONS[documentType] || DOCUMENT_OPTIMIZATIONS.default;
  const samplePages = Math.min(config.samplePages || 3, pdf.numPages);
  let sampleText = '';

  for (let i = 1; i <= samplePages; i++) {
    try {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      sampleText += pageText + '\n';
    } catch (error) {
      console.warn(`Erro ao extrair texto da página ${i}:`, error);
    }
  }

  const needsOCR = detectNeedsOCR(sampleText, documentType);
  console.log(`🔍 Detecção OCR: ${needsOCR ? 'NECESSÁRIO' : 'NÃO NECESSÁRIO'} (amostra de ${samplePages} páginas)`);

  if (!needsOCR) {
    // Usar extração direta otimizada
    extractedText = await extractTextDirectFast(pdf, documentType);
    totalPages = pdf.numPages;
  } else {
    // Usar OCR - agora com suporte para processamento completo
    const forceFullOCR = maxPages === -1; // -1 significa processar todas as páginas
    totalPages = forceFullOCR ? pdf.numPages : Math.min(pdf.numPages, maxPages);
    usedOCR = true;

    // Para PDFs grandes, usar configurações mais conservadoras de memória
    const isLargePDF = totalPages > 50;
    if (isLargePDF) {
      concurrentChunks = 1; // Processar uma página por vez para PDFs grandes
      quality = 'low'; // Usar qualidade mais baixa para economizar memória
      console.log('📊 PDF grande detectado - usando modo economia de memória');
    }

    const scale = quality === 'high' ? 2.5 : quality === 'low' ? 1.2 : 1.8; // DPI reduzido para economizar memória

    console.log(`🤖 Iniciando OCR para ${totalPages} páginas (${forceFullOCR ? 'PROCESSAMENTO COMPLETO' : 'LIMITADO'}) com ${concurrentChunks} chunk(s) simultâneo(s) - Modo: ${isLargePDF ? 'ECONOMIA' : 'NORMAL'}`);

    const pagePromises = [];
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      pagePromises.push(
        (async () => {
          try {
            const page = await pdf.getPage(pageNum);
            const imageData = await renderPDFPageToImage(page, scale);
            const { text, confidence } = await performOCR(imageData, 'por+eng', isLargePDF);

            if (totalPages <= 50 || pageNum % 10 === 0) {
              console.log(`📄 Página ${pageNum}/${totalPages}: ${text.length} caracteres, confiança: ${confidence.toFixed(1)}%`);
            }

            // Limpar referências para ajudar GC
            if (isLargePDF) {
              await new Promise(resolve => setTimeout(resolve, 100)); // Pequena pausa
            }

            return { pageNum, text, confidence };
          } catch (error) {
            console.warn(`⚠️ Erro OCR na página ${pageNum}:`, error);
            return { pageNum, text: '', confidence: 0 };
          }
        })()
      );
    }

    // Processar em chunks menores para controlar memória
    const results = [];
    const chunkSize = isLargePDF ? 1 : concurrentChunks; // Para PDFs grandes, processar 1 por vez

    for (let i = 0; i < pagePromises.length; i += chunkSize) {
      const chunk = pagePromises.slice(i, i + chunkSize);
      console.log(`📊 Processando chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(pagePromises.length / chunkSize)} (${chunk.length} página(s))`);

      try {
        const chunkResults = await Promise.allSettled(chunk);
        results.push(...chunkResults);

        // Forçar limpeza de memória entre chunks
        if (isLargePDF && window.gc) {
          window.gc();
        }

        // Pausa entre chunks para PDFs grandes
        if (isLargePDF) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (chunkError) {
        console.error('❌ Erro no processamento do chunk:', chunkError);
        // Continuar com próximos chunks mesmo se um falhar
      }
    }

    // Ordenar por número da página e juntar texto
    results.sort((a, b) => {
      const pageA = a.status === 'fulfilled' ? a.value.pageNum : 0;
      const pageB = b.status === 'fulfilled' ? b.value.pageNum : 0;
      return pageA - pageB;
    });

    for (const result of results) {
      if (result.status === 'fulfilled') {
        extractedText += result.value.text + '\n';
      }
    }

    console.log(`✅ OCR concluído: ${totalPages} páginas processadas, ${extractedText.length} caracteres extraídos`);
  }

  return { text: extractedText, usedOCR, totalPages };
};

// Função otimizada para processamento rápido de PDFs grandes com OCR
export const processLargePDFWithOCR = async (file, options = {}) => {
  const {
    concurrentChunks = 25, // Maior concurrency para PDFs grandes
    quality = 'medium',
    progressCallback = null,
    batchSize = 100 // Novo: tamanho do batch (100 páginas por vez)
  } = options;

  console.log('🚀 Iniciando processamento em batches de PDF grande:', file.name, {
    batchSize,
    concurrentChunks,
    quality,
    fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`
  });

  const startTime = Date.now();

  try {
    if (!pdfjsLib || !pdfjsLib.getDocument) {
      throw new Error('Biblioteca PDF.js não está disponível');
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    console.log(`📊 PDF grande detectado: ${pdf.numPages} páginas`);

    // Otimização de memória para PDFs muito grandes (>500 páginas)
    const isVeryLargePDF = pdf.numPages > 500;
    const optimizedConcurrentChunks = isVeryLargePDF ? 1 : concurrentChunks; // Processar 1 por vez para PDFs muito grandes
    const optimizedQuality = isVeryLargePDF ? 'low' : quality; // Usar qualidade baixa para economizar memória

    if (isVeryLargePDF) {
      console.log('🔧 PDF muito grande detectado - aplicando otimizações de memória extremas');
    }

    // Sempre usar OCR completo para PDFs grandes
    const scale = optimizedQuality === 'high' ? 2.5 : optimizedQuality === 'low' ? 1.2 : 1.8; // DPI reduzido para PDFs grandes

    let extractedText = '';
    let processedPages = 0;
    const totalPages = pdf.numPages;

    // Dividir em batches de 100 páginas
    const batches = [];
    for (let startPage = 1; startPage <= totalPages; startPage += batchSize) {
      const endPage = Math.min(startPage + batchSize - 1, totalPages);
      batches.push({ start: startPage, end: endPage });
    }

    console.log(`📦 Dividindo em ${batches.length} batch(es) de até ${batchSize} páginas cada`);
    console.log(`🔧 Configurações: concurrentChunks=${optimizedConcurrentChunks}, quality=${optimizedQuality}, scale=${scale}`);

    // Rastrear qualidade de processamento
    let consecutiveFailures = 0;
    let totalSuccessfulPages = 0;

    // Processar cada batch sequencialmente
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const { start, end } = batches[batchIndex];
      console.log(`🔄 Processando batch ${batchIndex + 1}/${batches.length}: páginas ${start}-${end}`);

      // Se muitos erros consecutivos, reduzir qualidade
      let currentScale = scale;
      if (consecutiveFailures >= 3) {
        currentScale = Math.max(scale * 0.5, 1.0); // Pelo menos 1.0
        console.log(`🔧 Reduzindo qualidade devido a ${consecutiveFailures} falhas consecutivas (scale: ${currentScale})`);
      }

      const pagePromises = [];
      for (let pageNum = start; pageNum <= end; pageNum++) {
        pagePromises.push(
          (async () => {
            try {
              const page = await pdf.getPage(pageNum);
              const imageData = await renderPDFPageToImage(page, currentScale);
              const { text, confidence } = await performOCR(imageData, 'por+eng', isVeryLargePDF);

              processedPages++;
              const progress = ((processedPages / totalPages) * 100).toFixed(1);

              // Log a cada 10 páginas ou callback se fornecido
              if (processedPages % 10 === 0 || processedPages === totalPages) {
                console.log(`📄 OCR Rápido: ${processedPages}/${totalPages} páginas (${progress}%)`);
                if (progressCallback) {
                  progressCallback({ processedPages, totalPages, progress: parseFloat(progress) });
                }
              }

              return { pageNum, text, confidence };
            } catch (error) {
              console.warn(`⚠️ Erro OCR na página ${pageNum}:`, error);
              processedPages++;
              return { pageNum, text: '', confidence: 0 };
            }
          })()
        );
      }

      // Processar páginas do batch em paralelo (dentro do batch)
      const results = await Promise.allSettled(pagePromises);

      // Processar resultados, sendo tolerante a falhas individuais
      let batchText = '';
      let successfulPages = 0;
      let failedPages = 0;

      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { pageNum, text, confidence } = result.value;
          if (text && text.trim().length > 0) {
            batchText += text + '\n';
            successfulPages++;
            totalSuccessfulPages++;
          } else {
            console.warn(`Página ${pageNum}: OCR retornou texto vazio (confiança: ${confidence.toFixed(1)}%)`);
            failedPages++;
          }
        } else {
          console.warn(`Página falhou completamente:`, result.reason);
          failedPages++;
        }
      }

      extractedText += batchText;

      // Atualizar contador de falhas consecutivas
      if (failedPages > successfulPages) {
        consecutiveFailures++;
      } else {
        consecutiveFailures = 0; // Reset se batch foi bem-sucedido
      }

      console.log(`📊 Batch ${batchIndex + 1} resultados: ${successfulPages} OK, ${failedPages} problemas. Total bem-sucedidas: ${totalSuccessfulPages}/${processedPages}`);

      // Se menos de 30% das páginas do batch foram processadas com sucesso, logar aviso
      const successRate = successfulPages / (end - start + 1);
      if (successRate < 0.3) {
        console.warn(`⚠️ Batch ${batchIndex + 1} teve baixa taxa de sucesso (${(successRate * 100).toFixed(1)}%)`);
      }

      // Pausa entre batches para limpeza de memória
      console.log(`⏳ Batch ${batchIndex + 1} concluído. Pausa para limpeza de memória.`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 segundos de pausa

      // Forçar garbage collection se disponível
      if (window.gc) {
        window.gc();
      }
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);
    const successRate = ((totalSuccessfulPages / totalPages) * 100).toFixed(1);

    console.log(`✅ Processamento em batches concluído: ${totalPages} páginas em ${duration}s`, {
      caracteres: extractedText.length,
      velocidade: `${(totalPages / (endTime - startTime) * 1000).toFixed(1)} páginas/segundo`,
      taxaSucesso: `${successRate}% (${totalSuccessfulPages}/${totalPages} páginas)`,
      batchesProcessados: batches.length,
      qualidadeFinal: consecutiveFailures > 0 ? 'reduzida' : 'normal'
    });

    return {
      success: true,
      text: extractedText,
      totalPages,
      processingTime: duration,
      method: 'OCR Otimizado em Batches',
      successRate: parseFloat(successRate),
      successfulPages: totalSuccessfulPages,
      batchesProcessed: batches.length
    };

  } catch (error) {
    console.error('❌ Erro no processamento em batches de PDF:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Função para ler PDFs com extração real de texto e OCR automático
const readPDFFile = async (file, options = {}, documentType = 'default') => {
  const {
    maxPages = 20,
    concurrentChunks = 10,
    quality = 'medium',
    forceFullOCR = false
  } = options;

  console.log('🔍 Processando PDF:', file.name, {
    maxPages,
    concurrentChunks,
    quality,
    forceFullOCR,
    fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`
  });
  
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
    
    // Determinar se deve processar todas as páginas
    const actualMaxPages = forceFullOCR ? -1 : maxPages;
    
    const { text: extractedText, usedOCR, totalPages } = await processPDFPagesWithOCR(pdf, actualMaxPages, concurrentChunks, quality, documentType);
    
    if (!extractedText || extractedText.trim().length === 0) {
      console.error('❌ Nenhum texto foi extraído do PDF');
      throw new Error('Nenhum texto foi extraído do PDF. O arquivo pode estar vazio, protegido por senha ou corrompido.');
    }
    
    const processingMethod = usedOCR ? 'OCR' : 'Texto Direto';
    const processingMode = forceFullOCR ? 'COMPLETO' : 'LIMITADO';
    
    console.log('✅ PDF processado com sucesso:', {
      fileName: file.name,
      páginasProcessadas: totalPages,
      totalPáginas: pdf.numPages,
      método: processingMethod,
      modo: processingMode,
      caracteres: extractedText.length,
      preview: extractedText.substring(0, 100)
    });
    
    return extractedText;
  } catch (error) {
    console.error('❌ Erro ao processar PDF:', error);
    
    // Fallback: Retornar mensagem orientando converter para outro formato
    const fileName = file.name;
    return `⚠️ AVISO: O PDF "${fileName}" não pôde ser processado automaticamente.

📋 POSSÍVEIS CAUSAS:
• Arquivo corrompido ou protegido por senha
• PDF contém apenas imagens sem texto digitalizável
• Problema técnico na extração

🔧 SOLUÇÕES RECOMENDADAS:
1. **Para PDFs com texto digitalizável:**
   - Abra o PDF em seu computador
   - Selecione todo o texto (Ctrl+A)
   - Copie o texto (Ctrl+C)
   - Crie um arquivo .txt
   - Cole o conteúdo (Ctrl+V)
   - Salve o arquivo
   - Anexe o arquivo .txt aqui

2. **Para PDFs escaneados (imagens):**
   - Use uma ferramenta online gratuita de OCR:
     • Google Drive (upload → "Abrir com Google Docs")
     • Adobe Acrobat Online
     • SmallPDF ou ILovePDF
   - Converta para .txt ou .docx
   - Anexe o arquivo convertido

3. **Alternativa:**
   - Cole o conteúdo do PDF diretamente na mensagem de chat

🔄 O sistema está pronto para processar o texto quando enviado!`;
  }
};

// Função principal para processar qualquer tipo de documento
export const processDocument = async (file, options = {}, documentType = 'default') => {
  if (!file) {
    throw new Error('Nenhum arquivo fornecido');
  }

  const fileExtension = file.name.toLowerCase().split('.').pop();
  const maxSize = 25 * 1024 * 1024; // 25MB

  if (file.size > maxSize) {
    throw new Error('Arquivo muito grande. Tamanho máximo: 25MB');
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

        // Carregar PDF para análise preliminar
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        // Verificar se é um PDF grande
        const isLargePDF = pdf.numPages > 100;
        
        // Para PDFs grandes, verificar se realmente precisa de OCR
        if (isLargePDF) {
          // Amostrar primeiras páginas para detectar necessidade de OCR
          let sampleText = '';
          const samplePages = Math.min(5, pdf.numPages);
          
          for (let i = 1; i <= samplePages; i++) {
            try {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              const pageText = textContent.items.map(item => item.str).join(' ');
              sampleText += pageText + '\n';
            } catch (error) {
              console.warn(`Erro ao amostrar página ${i}:`, error);
            }
          }
          
          const needsOCR = detectNeedsOCR(sampleText, documentType);
          
          if (!needsOCR) {
            console.log(`📊 PDF grande (${pdf.numPages} páginas) NÃO precisa de OCR - usando extração direta rápida`);
            content = await extractTextDirectFast(pdf, documentType);
          } else {
            console.log(`📊 PDF grande (${pdf.numPages} páginas) precisa de OCR - usando processamento otimizado`);
            const result = await processLargePDFWithOCR(file, options);
            if (result.success) {
              content = result.text;
            } else {
              throw new Error(result.error || 'Erro no processamento otimizado do PDF');
            }
          }
        } else {
          // PDFs pequenos - usar processamento normal com tipo de documento
          content = await readPDFFile(file, options, documentType);
        }

        console.log('✅ Conteúdo do PDF retornado:', {
          length: content.length,
          firstChars: content.substring(0, 100),
          isWarning: content.includes('AVISO'),
          method: isLargePDF ? (content.includes('⚡') ? 'Extração Direta Rápida' : 'OCR Otimizado') : 'Padrão'
        });
        break;
      
      default:
        throw new Error(`Tipo de arquivo não suportado: .${fileExtension}. Use: .txt, .docx, .pdf`);
    }

    // Validar conteúdo extraído
    if (!content || content.trim().length === 0) {
      throw new Error('O documento está vazio ou não pôde ser lido');
    }

    // Removido limite de tamanho - processar conteúdo completo
    console.log(`📊 Documento processado: ${content.length} caracteres`);

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
    return `📝 **DOCUMENTO NECESSÁRIO:** Para elaborar uma réplica eficaz, você precisará anexar a contestação da parte contrária. Aceito arquivos .txt, .docx e .pdf (até 25MB). PDFs são processados automaticamente com OCR se necessário.`;
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
