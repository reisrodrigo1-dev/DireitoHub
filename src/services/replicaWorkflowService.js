// Serviço especializado para o fluxo de trabalho da Réplica
// Implementa o fluxo sequencial e controlado conforme especificações técnicas

export class ReplicaWorkflowService {
  constructor() {
    // Seções obrigatórias da Réplica conforme estrutura legal
    this.SECTIONS = [
      {
        id: 'relatorio',
        title: 'I – DO RELATÓRIO',
        description: 'Relatório dos fatos e do procedimento',
        minTokens: 200,
        maxTokens: 800,
        requirements: [
          'Resumo dos fatos da petição inicial',
          'Resumo da contestação apresentada',
          'Pontos principais em disputa',
          'Cronologia dos fatos relevantes'
        ]
      },
      {
        id: 'pontos_controvertidos',
        title: 'II – DOS PONTOS CONTROVERTIDOS',
        description: 'Identificação e delimitação dos pontos controvertidos',
        minTokens: 300,
        maxTokens: 1000,
        requirements: [
          'Identificação clara de cada ponto controvertido',
          'Separação entre questões de fato e de direito',
          'Delimitação do objeto da lide',
          'Questões não contestadas (pontos incontroversos)'
        ]
      },
      {
        id: 'refutacao_argumentos',
        title: 'III – DA REFUTAÇÃO DOS ARGUMENTOS DA CONTESTAÇÃO',
        description: 'Refutação fundamentada dos argumentos defensivos',
        minTokens: 800,
        maxTokens: 2000,
        requirements: [
          'Análise de cada argumento da contestação',
          'Contra-argumentação fundamentada',
          'Demonstração da inconsistência dos argumentos defensivos',
          'Reforço dos argumentos da petição inicial',
          'Jurisprudência aplicável (se necessária)'
        ]
      },
      {
        id: 'pedidos',
        title: 'IV – DOS PEDIDOS',
        description: 'Reiteração e eventual ampliação dos pedidos',
        minTokens: 200,
        maxTokens: 600,
        requirements: [
          'Reiteração dos pedidos da petição inicial',
          'Fundamentação da procedência dos pedidos',
          'Pedidos relativos às despesas processuais',
          'Pedidos alternativos ou subsidiários (se aplicáveis)'
        ]
      }
    ];

    // Estado do fluxo de trabalho
    this.workflowState = {
      currentSection: 0,
      completedSections: [],
      documentsProcessed: false,
      documentsContent: null,
      sectionContents: {},
      userConfirmations: {}
    };

    // Configurações do fluxo
    this.CONFIG = {
      requireDocuments: true,
      allowSkipSections: false,
      allowReorderSections: false,
      enforceMinTokens: true,
      enforceUppercaseNames: true,
      prohibitJurisprudence: true, // Por padrão, não incluir jurisprudência a menos que necessário
      requireUserConfirmation: true
    };
  }

  // Inicializar o fluxo da Réplica
  initializeWorkflow() {
    this.workflowState = {
      currentSection: 0,
      completedSections: [],
      documentsProcessed: false,
      documentsContent: null,
      sectionContents: {},
      userConfirmations: {}
    };

    return {
      phase: 'document_upload',
      message: this.getDocumentUploadMessage(),
      nextStep: 'upload_documents'
    };
  }

  // Mensagem de upload de documentos
  getDocumentUploadMessage() {
    return `📝 **ELABORAÇÃO DE RÉPLICA - FLUXO SEQUENCIAL**

Para elaborar uma réplica tecnicamente adequada, seguiremos um processo estruturado em 4 seções obrigatórias:

**I – DO RELATÓRIO**
**II – DOS PONTOS CONTROVERTIDOS** 
**III – DA REFUTAÇÃO DOS ARGUMENTOS DA CONTESTAÇÃO**
**IV – DOS PEDIDOS**

**📋 DOCUMENTOS NECESSÁRIOS:**
- Petição inicial completa
- Contestação da parte contrária  
- Documentos juntados pela defesa (se houver)
- Provas e anexos relevantes (se houver)
- **Máximo: 10 documentos**

**📄 FORMATOS ACEITOS:**
- Arquivos de texto (.txt) - RECOMENDADO
- Documentos Word (.docx) - RECOMENDADO  
- Arquivos PDF (.pdf) - TOTALMENTE SUPORTADO (OCR automático)
- Tamanho máximo: 25MB por arquivo

**💡 DICAS IMPORTANTES:**
• PDFs são processados automaticamente com OCR inteligente se necessário
• Para PDFs grandes (>20 páginas), apenas as primeiras 20 são processadas
• Você pode anexar múltiplos documentos - todos serão analisados em conjunto

**⚠️ IMPORTANTE:**
- O processo será sequencial (não é possível pular seções)
- Cada seção será elaborada após sua confirmação
- Todos os nomes serão apresentados em MAIÚSCULAS
- Mínimo de tokens por seção será respeitado
- Não será incluída jurisprudência desnecessária

Por favor, **anexe todos os documentos necessários** para iniciarmos o processo.`;
  }

  // Processar documentos carregados
  processDocuments(documents) {
    console.log('🔍 ReplicaWorkflow.processDocuments chamado:', {
      documentsCount: documents?.length || 0,
      documentsType: typeof documents,
      hasDocuments: !!documents
    });

    if (!documents || documents.length === 0) {
      console.log('❌ Nenhum documento fornecido');
      return {
        success: false,
        message: 'Nenhum documento foi anexado. Por favor, anexe os documentos obrigatórios para prosseguir.'
      };
    }

    console.log('📄 Documentos recebidos:', documents.map((doc, index) => ({
      index: index + 1,
      name: doc.name,
      hasContent: !!doc.content,
      contentLength: doc.content?.length || 0,
      fileType: doc.fileType || 'unknown'
    })));

    // Verificar se há documentos essenciais
    const hasContestation = documents.some(doc => 
      doc.name.toLowerCase().includes('contestação') || 
      doc.name.toLowerCase().includes('contestacao') ||
      doc.content.toLowerCase().includes('contestação') ||
      doc.content.toLowerCase().includes('contestacao') ||
      doc.content.toLowerCase().includes('defesa') ||
      doc.content.toLowerCase().includes('resposta')
    );

    const hasPetition = documents.some(doc => 
      doc.name.toLowerCase().includes('inicial') || 
      doc.name.toLowerCase().includes('petição') ||
      doc.name.toLowerCase().includes('peticao') ||
      doc.content.toLowerCase().includes('petição inicial') ||
      doc.content.toLowerCase().includes('peticao inicial') ||
      doc.content.toLowerCase().includes('exordial')
    );

    console.log('🔍 Validação de documentos:', {
      totalDocuments: documents.length,
      hasContestation,
      hasPetition,
      documentsNames: documents.map(d => d.name)
    });

    // Classificar documentos por tipo (para melhor organização)
    const classifiedDocs = {
      petition: documents.filter(doc => 
        doc.name.toLowerCase().includes('inicial') || 
        doc.name.toLowerCase().includes('petição') ||
        doc.name.toLowerCase().includes('peticao') ||
        doc.content.toLowerCase().includes('petição inicial')
      ),
      contestation: documents.filter(doc => 
        doc.name.toLowerCase().includes('contestação') || 
        doc.name.toLowerCase().includes('contestacao') ||
        doc.content.toLowerCase().includes('contestação')
      ),
      evidence: documents.filter(doc => 
        doc.name.toLowerCase().includes('prova') || 
        doc.name.toLowerCase().includes('documento') ||
        doc.name.toLowerCase().includes('anexo')
      ),
      others: documents.filter(doc => 
        !doc.name.toLowerCase().includes('inicial') && 
        !doc.name.toLowerCase().includes('contestação') &&
        !doc.name.toLowerCase().includes('contestacao') &&
        !doc.name.toLowerCase().includes('prova')
      )
    };

    console.log('📂 Classificação dos documentos:', {
      petition: classifiedDocs.petition.length,
      contestation: classifiedDocs.contestation.length,
      evidence: classifiedDocs.evidence.length,
      others: classifiedDocs.others.length
    });

    if (!hasContestation) {
      console.log('❌ Contestação não encontrada');
      return {
        success: false,
        message: `⚠️ **Contestação não encontrada**\n\nPor favor, anexe o documento da contestação da parte contrária. Este documento é essencial para elaborar a réplica.\n\n📄 **Documentos anexados (${documents.length}):**\n${documents.map((doc, i) => `${i + 1}. ${doc.name}`).join('\n')}\n\nVocê pode anexar mais documentos ou renomear um dos existentes para incluir "contestação" no nome.`
      };
    }

    // Armazenar conteúdo dos documentos com classificação
    this.workflowState.documentsContent = documents;
    this.workflowState.classifiedDocuments = classifiedDocs;
    this.workflowState.documentsProcessed = true;

    console.log('✅ Documentos processados com sucesso');

    const documentSummary = documents.map((doc, i) => 
      `${i + 1}. **${doc.name}** (${doc.fileType?.toUpperCase() || 'TXT'}, ${Math.round(doc.content?.length / 1000) || 0}k chars)`
    ).join('\n');

    return {
      success: true,
      message: `✅ **${documents.length} documento(s) processado(s) com sucesso!**

📂 **Documentos analisados:**
${documentSummary}

🔍 **Classificação automática:**
- 📋 Petições iniciais: ${classifiedDocs.petition.length}
- 🛡️ Contestações/Defesas: ${classifiedDocs.contestation.length}
- 📎 Provas/Anexos: ${classifiedDocs.evidence.length}
- 📄 Outros documentos: ${classifiedDocs.others.length}

${this.getStartSectionMessage()}`,
      phase: 'section_work',
      nextStep: 'start_first_section'
    };
  }

  // Mensagem para iniciar primeira seção
  getStartSectionMessage() {
    const currentSection = this.SECTIONS[0];
    return `✅ **DOCUMENTOS PROCESSADOS COM SUCESSO**

Agora iniciaremos a elaboração sequencial da réplica.

**${currentSection.title}**
${currentSection.description}

**Requisitos desta seção:**
${currentSection.requirements.map(req => `• ${req}`).join('\n')}

**Características técnicas:**
• Mínimo: ${currentSection.minTokens} tokens
• Máximo: ${currentSection.maxTokens} tokens
• Nomes em MAIÚSCULAS
• Linguagem técnica e formal

Você confirma o início da elaboração da **primeira seção (${currentSection.title})**?

**Digite "CONFIRMAR" para prosseguir** ou "ALTERAR" se precisar modificar documentos.`;
  }

  // Processar confirmação do usuário
  processUserConfirmation(userInput, currentSection) {
    const input = userInput.toLowerCase().trim();
    
    if (input === 'confirmar') {
      return {
        confirmed: true,
        action: 'generate_section',
        message: `Iniciando elaboração da seção ${currentSection + 1}: ${this.SECTIONS[currentSection].title}...`
      };
    } else if (input === 'alterar') {
      return {
        confirmed: false,
        action: 'modify_documents',
        message: 'Você pode anexar documentos adicionais ou substituir os existentes.'
      };
    } else {
      return {
        confirmed: false,
        action: 'request_confirmation',
        message: `Por favor, digite **"CONFIRMAR"** para iniciar a elaboração da seção ou **"ALTERAR"** para modificar documentos.

**Seção atual:** ${this.SECTIONS[currentSection].title}`
      };
    }
  }

  // Gerar prompt para seção específica
  generateSectionPrompt(sectionIndex) {
    const section = this.SECTIONS[sectionIndex];
    const documents = this.workflowState.documentsContent;
    const classifiedDocs = this.workflowState.classifiedDocuments;
    
    if (!documents || documents.length === 0) {
      console.warn('⚠️ Nenhum documento disponível para o prompt');
      return 'Erro: Nenhum documento foi processado para elaborar a réplica.';
    }

    let documentsText = '';
    if (documents && documents.length > 0) {
      documentsText = documents.map((doc, index) => 
        `=== DOCUMENTO ${index + 1}: ${doc.name} ===\nTIPO: ${doc.fileType?.toUpperCase() || 'TXT'}\nTAMANHO: ${Math.round(doc.content?.length / 1000) || 0}k caracteres\n\nCONTEÚDO COMPLETO:\n${doc.content}\n\n`
      ).join('');
    }

    // Extrair fatos específicos dos documentos para o prompt
    const specificFacts = this.extractSpecificFacts(documents);

    // Informações sobre classificação dos documentos
    let classificationInfo = '';
    if (classifiedDocs) {
      classificationInfo = `
**ANÁLISE DOS DOCUMENTOS ANEXADOS:**
• Petições iniciais: ${classifiedDocs.petition.length} documento(s)
• Contestações/Defesas: ${classifiedDocs.contestation.length} documento(s)  
• Provas/Anexos: ${classifiedDocs.evidence.length} documento(s)
• Outros documentos: ${classifiedDocs.others.length} documento(s)
• **TOTAL: ${documents.length} documento(s) para análise conjunta**
`;
    }

    const prompt = `Você é um assistente jurídico especializado em elaboração de réplicas processuais.

**IMPORTANTE: ELABORE CONTEÚDO COMPLETO E ESPECÍFICO, NÃO APENAS ESTRUTURA OU MODELO**

**TAREFA:** Elaborar EXCLUSIVAMENTE a seção "${section.title}" da réplica COM CONTEÚDO COMPLETO baseado nos documentos anexados.

**SEÇÃO ATUAL:** ${section.title}
**DESCRIÇÃO:** ${section.description}

**FATOS ESPECÍFICOS IDENTIFICADOS:**
${specificFacts}

**REQUISITOS OBRIGATÓRIOS PARA ESTA SEÇÃO:**
${section.requirements.map(req => `• ${req}`).join('\n')}

**ESPECIFICAÇÕES TÉCNICAS:**
• Extensão: Entre ${section.minTokens} e ${section.maxTokens} tokens
• TODOS os nomes de pessoas físicas e jurídicas em MAIÚSCULAS
• Linguagem técnica e formal
• Base-se EXCLUSIVAMENTE nos documentos fornecidos
• NÃO usar jurisprudência genérica
• NÃO antecipar conteúdo de outras seções
• ELABORAR CONTEÚDO SUBSTANTIVO, NÃO APENAS ESTRUTURA

**ESTRUTURA ESPERADA:**
${section.title}

[CONTEÚDO COMPLETO E DETALHADO DA SEÇÃO BASEADO NOS DOCUMENTOS]

${classificationInfo}

**TODOS OS DOCUMENTOS ANEXADOS:**
${documentsText}

**INSTRUÇÕES CRÍTICAS:**
• Analise TODOS os ${documents.length} documentos em conjunto
• Use informações ESPECÍFICAS dos documentos (nomes, valores, datas, fatos)
• Cross-reference informações entre os documentos
• Identifique contradições ou complementaridades
• Priorize informações da contestação para refutação
• Use provas e anexos para fundamentar argumentos
• ELABORE TEXTO COMPLETO, NÃO APENAS TÓPICOS OU ESTRUTURA
• Seja ESPECÍFICO com base nos fatos dos documentos

**CRÍTICO:** Elabore CONTEÚDO COMPLETO E SUBSTANTIVO para a seção "${section.title}", baseado nos fatos específicos dos documentos anexados. NÃO retorne apenas estrutura, modelo ou tópicos.

Elabore agora a seção "${section.title}" COM CONTEÚDO COMPLETO:`;

    console.log('📝 Prompt gerado:', {
      sectionTitle: section.title,
      promptLength: prompt.length,
      documentsIncluded: documents.length,
      hasSpecificFacts: specificFacts.length > 100,
      hasDocumentsText: documentsText.length > 100
    });

    return prompt;
  }

  // Método auxiliar para extrair fatos específicos dos documentos
  extractSpecificFacts(documents) {
    if (!documents || documents.length === 0) return 'Nenhum fato específico identificado.';
    
    let facts = [];
    
    documents.forEach((doc, index) => {
      const content = doc.content.toLowerCase();
      
      // Extrair valores monetários
      const moneyRegex = /r\$\s*[\d.,]+/g;
      const moneyMatches = doc.content.match(moneyRegex);
      if (moneyMatches) {
        facts.push(`Valores: ${moneyMatches.join(', ')}`);
      }
      
      // Extrair nomes (palavras em maiúsculas)
      const nameRegex = /[A-Z][A-Z\s]+(?=\s|,|\.)/g;
      const nameMatches = doc.content.match(nameRegex);
      if (nameMatches) {
        const cleanNames = nameMatches.filter(name => name.length > 3 && name.length < 50);
        if (cleanNames.length > 0) {
          facts.push(`Pessoas: ${cleanNames.slice(0, 5).join(', ')}`);
        }
      }
      
      // Extrair datas
      const dateRegex = /\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}\s+de\s+\w+\s+de\s+\d{4}/g;
      const dateMatches = doc.content.match(dateRegex);
      if (dateMatches) {
        facts.push(`Datas: ${dateMatches.slice(0, 3).join(', ')}`);
      }
      
      // Identificar tipo de documento
      if (content.includes('petição') || content.includes('inicial')) {
        facts.push(`Documento ${index + 1}: Petição inicial`);
      } else if (content.includes('contestação') || content.includes('defesa')) {
        facts.push(`Documento ${index + 1}: Contestação/Defesa`);
      } else {
        facts.push(`Documento ${index + 1}: ${doc.name}`);
      }
    });
    
    return facts.length > 0 ? facts.join('\n• ') : 'Análise automática não identificou fatos específicos.';
  }

  // Validar conteúdo da seção
  validateSectionContent(content, sectionIndex) {
    const section = this.SECTIONS[sectionIndex];
    const errors = [];
    const warnings = [];

    // Verificar extensão (aproximação por contagem de caracteres)
    const approximateTokens = content.length / 4; // Aproximação rudimentar
    if (approximateTokens < section.minTokens * 0.8) {
      errors.push(`Seção muito curta. Mínimo esperado: ~${section.minTokens} tokens`);
    }
    if (approximateTokens > section.maxTokens * 1.2) {
      warnings.push(`Seção muito extensa. Máximo recomendado: ~${section.maxTokens} tokens`);
    }

    // Verificar se contém o título da seção
    if (!content.includes(section.title)) {
      errors.push(`Título da seção "${section.title}" não encontrado no conteúdo`);
    }

    // Verificar se nomes estão em maiúsculas (busca por padrões comuns)
    const lowercaseNames = content.match(/\b[a-z]+\s+[a-z]+\s+[a-z]+\b/g);
    if (lowercaseNames && lowercaseNames.length > 3) {
      warnings.push('Possíveis nomes próprios em minúsculas detectados. Verifique se todos os nomes estão em MAIÚSCULAS');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Avançar para próxima seção
  advanceToNextSection() {
    this.workflowState.currentSection++;
    
    if (this.workflowState.currentSection >= this.SECTIONS.length) {
      return {
        completed: true,
        phase: 'completion',
        message: this.getCompletionMessage()
      };
    }

    const nextSection = this.SECTIONS[this.workflowState.currentSection];
    return {
      completed: false,
      phase: 'section_confirmation',
      message: this.getSectionConfirmationMessage(nextSection),
      currentSection: this.workflowState.currentSection
    };
  }

  // Mensagem de confirmação para próxima seção
  getSectionConfirmationMessage(section) {
    return `✅ **SEÇÃO ANTERIOR CONCLUÍDA**

Agora elaboraremos a próxima seção:

**${section.title}**
${section.description}

**Requisitos desta seção:**
${section.requirements.map(req => `• ${req}`).join('\n')}

**Características técnicas:**
• Mínimo: ${section.minTokens} tokens
• Máximo: ${section.maxTokens} tokens
• Nomes em MAIÚSCULAS
• Linguagem técnica e formal

Você confirma o início da elaboração da **${section.title}**?

**Digite "CONFIRMAR" para prosseguir** ou "REVISAR" para ver seção anterior.`;
  }

  // Mensagem de conclusão
  getCompletionMessage() {
    return `🎉 **RÉPLICA COMPLETA - PROCESSO FINALIZADO**

Todas as 4 seções obrigatórias foram elaboradas com sucesso:

✅ **I – DO RELATÓRIO**
✅ **II – DOS PONTOS CONTROVERTIDOS**
✅ **III – DA REFUTAÇÃO DOS ARGUMENTOS DA CONTESTAÇÃO**
✅ **IV – DOS PEDIDOS**

**Próximos passos:**
1. Revisar todo o documento elaborado
2. Verificar adequação aos requisitos processuais
3. Ajustar formatação final se necessário
4. Proceder com protocolização

A réplica foi elaborada seguindo rigorosamente as especificações técnicas e os requisitos legais estabelecidos.

**Documento pronto para revisão final.**`;
  }

  // Obter estado atual do fluxo
  getCurrentState() {
    return {
      ...this.workflowState,
      currentSectionInfo: this.SECTIONS[this.workflowState.currentSection] || null,
      totalSections: this.SECTIONS.length,
      progress: (this.workflowState.completedSections.length / this.SECTIONS.length) * 100
    };
  }

  // Reiniciar fluxo
  resetWorkflow() {
    return this.initializeWorkflow();
  }
}

// Instância singleton do serviço
export const replicaWorkflowService = new ReplicaWorkflowService();

// Função utilitária para verificar se um prompt é de réplica
export const isReplicaPrompt = (promptId, promptName) => {
  const id = (promptId || '').toLowerCase();
  const name = (promptName || '').toLowerCase();
  
  return id.includes('replica') || name.includes('réplica') || name.includes('replica');
};

// Função para detectar se o chat deve usar o fluxo de réplica
export const shouldUseReplicaWorkflow = (promptType) => {
  return isReplicaPrompt(promptType?.id, promptType?.name);
};
