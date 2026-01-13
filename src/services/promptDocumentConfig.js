// Configuração de prompts que necessitam de documentos
// Baseado na análise dos arquivos de prompt disponíveis

export const DOCUMENT_REQUIRED_PROMPTS = {
  // Prompts que OBRIGATORIAMENTE precisam de documentos
  MANDATORY_DOCUMENT: [
    'analisar-laudos-medicos',
    'analisar-pec',
    'analisar-pec-defensoria', 
    'correcao-portugues',
    'corrigir-portugues-deixar-claro',
    'corrigir-portugues-mantendo-escrita',
    'depoimento-vitima-laudo-medico',
    'encontrar-contradicoes-testemunhas',
    'memoriais-ministerio-publico',
    'memoriais-civel-consumidor',
    'memoriais-criminais',
    'memoriais-previdenciarios',
    'memoriais-trabalhistas',
    'relatorio-criminal',
    'relatorio-contestacao-replica',
    'resumir-processos-criminais-defesa',
    'resumir-processos-familia-audiencias',
    'resumo-assistidos-dpe',
    'resumo-cliente',
    'resumo-para-clientes',
    'rebater-argumentos',
    'vitima-depoimento',
    'preparacao-audiencia-trabalhista-reclamando',
    'preparacao-audiencia-trabalhista-reclamante',
    'acrescentar-argumentos',
    'rebater-argumentos',
    'maximizar-impacto-retorico',
    'ementa',
    'ementa-cnj',
    'dosimetria-pena',
    // NOVOS PROMPTS QUE PRECISAM DE DOCUMENTOS OBRIGATORIAMENTE
    'replica', // ← Réplica precisa da contestação para rebater
    'contrarrazoes-civel-familia', // ← Precisa das razões de apelação
    'contrarrazoes-apelacao-criminal', // ← Precisa das razões de apelação
    'contrarrazoes-recurso-especial', // ← Precisa do recurso especial
    'contrarrazoes-recurso-extraordinario', // ← Precisa do recurso extraordinário
    'razoes-rese', // ← Precisa do processo para fundamentar
    'despacho-judicial', // ← Precisa das petições para despachar
    'correicoes-e-sugestoes-pecas' // ← Precisa da peça para corrigir
  ],

  // Prompts que PODEM se beneficiar de documentos (opcionais)
  OPTIONAL_DOCUMENT: [
    'contestacao', // ← Pode ser baseada só nas informações ou com petição inicial
    'habeas-corpus', // ← Pode ser com ou sem documentos do processo
    'liberdade-provisoria', // ← Pode ser com ou sem autos
    'agravo-instrumento', // ← Pode ser com ou sem decisão agravada
    'apelacao-direito-privado', // ← Pode usar documentos do processo
    'apelacao-criminal', // ← Pode usar documentos do processo
    'apelacao-trabalhista', // ← Pode usar documentos do processo
    'inicial-alimentos', // ← Pode usar documentos comprobatórios
    'quesitos', // ← Pode usar documentos do caso
    'projeto-lei', // ← Pode usar documentos de referência
    'busca-de-jurisprudencia', // ← Pode se beneficiar de documento para contextualizar busca
    'perguntas-parte-contraria-testemunhas' // ← Pode usar documentos do processo
  ],

  // Prompts que geralmente NÃO precisam de documentos
  NO_DOCUMENT_NEEDED: [
    'busca-jurisprudencia',
    'inserir-fundamentos-legais',
    'inserir-fundamentos-legais-cpc',
    'linguagem-simples',
    'localizador-endereco',
    'atualizar-valores-cc'
  ]
};

// Função para verificar se um prompt necessita documento obrigatoriamente
export const requiresMandatoryDocument = (promptId, promptName) => {
  const id = (promptId || '').toLowerCase().replace(/\s+/g, '-');
  const name = (promptName || '').toLowerCase().replace(/\s+/g, '-');
  
  // Debug apenas se explicitamente habilitado
  if (window.DEBUG_PROMPTS) {
    console.log('🔍 requiresMandatoryDocument:', { 
      originalId: promptId, 
      originalName: promptName, 
      processedId: id, 
      processedName: name 
    });
  }
  
  const result = DOCUMENT_REQUIRED_PROMPTS.MANDATORY_DOCUMENT.some(required => {
    const match = id.includes(required) || name.includes(required) || 
           required.includes(id) || required.includes(name);
    
    if (match && window.DEBUG_PROMPTS) {
      console.log(`✅ MATCH encontrado: "${required}" com prompt ID: "${id}", Nome: "${name}"`);
    }
    
    return match;
  });
  
  if (window.DEBUG_PROMPTS) {
    console.log(`📊 Resultado final para "${promptName}" (${promptId}):`, result ? 'OBRIGATÓRIO' : 'NÃO OBRIGATÓRIO');
  }
  
  return result;
};

// Função para verificar se um prompt pode se beneficiar de documentos
export const canBenefitFromDocument = (promptId, promptName) => {
  const id = (promptId || '').toLowerCase().replace(/\s+/g, '-');
  const name = (promptName || '').toLowerCase().replace(/\s+/g, '-');
  
  return DOCUMENT_REQUIRED_PROMPTS.OPTIONAL_DOCUMENT.some(optional => {
    return id.includes(optional) || name.includes(optional) || 
           optional.includes(id) || optional.includes(name);
  });
};

// Função para gerar mensagem específica baseada no tipo de prompt
export const getDocumentRequestMessage = (promptType) => {
  const promptName = promptType?.name || '';
  const promptId = (promptType?.id || '').toLowerCase();
  
  // Mensagens específicas para diferentes tipos de documento
  if (promptId.includes('replica')) {
    return `📝 **ELABORAÇÃO DE RÉPLICA - FLUXO SEQUENCIAL**

Para elaborar uma réplica tecnicamente adequada e estruturada, preciso dos documentos processuais:

**📋 DOCUMENTOS OBRIGATÓRIOS:**
- Petição inicial completa
- Contestação da parte contrária
- Documentos juntados pela defesa
- Provas e anexos relevantes ao processo

**⚙️ PROCESSO ESTRUTURADO:**
O sistema seguirá um fluxo sequencial obrigatório:
1. **I – DO RELATÓRIO**
2. **II – DOS PONTOS CONTROVERTIDOS** 
3. **III – DA REFUTAÇÃO DOS ARGUMENTOS DA CONTESTAÇÃO** (mín. 4.000 tokens)
4. **IV – DOS PEDIDOS**

**📄 Formatos aceitos:** .txt, .docx, .pdf (máx. 10MB)

⚠️ **IMPORTANTE:** Este processo é sequencial e controlado. Cada seção será elaborada após sua confirmação individual.

Anexe todos os documentos para iniciar o fluxo específico da Réplica.`;
  }

  if (promptId.includes('contrarrazoes')) {
    return `⚖️ **Contrarrazões de Recurso**

Para elaborar contrarrazões consistentes, preciso do recurso da parte contrária:

**Documentos necessários:**
- Recurso (apelação/especial/extraordinário)
- Razões de recurso
- Acórdão recorrido
- Documentos relevantes do processo

**Formatos aceitos:** .txt, .docx (máx. 10MB)

Anexe o recurso da parte contrária para elaborar as contrarrazões.`;
  }

  if (promptId.includes('razoes-rese')) {
    return `📋 **Razões de Recurso Especial**

Para fundamentar adequadamente o Recurso Especial, preciso dos documentos processuais:

**Documentos necessários:**
- Acórdão recorrido
- Decisões de instâncias inferiores
- Jurisprudência divergente
- Legislação federal violada

**Formatos aceitos:** .txt, .docx (máx. 10MB)

Anexe os documentos para fundamentar o Recurso Especial.`;
  }

  if (promptId.includes('despacho-judicial')) {
    return `⚖️ **Elaboração de Despacho Judicial**

Para elaborar despacho adequado, preciso das petições e documentos:

**Documentos necessários:**
- Petições das partes
- Documentos juntados
- Manifestações processuais
- Histórico do processo

**Formatos aceitos:** .txt, .docx (máx. 10MB)

Anexe as petições e documentos para elaborar o despacho.`;
  }

  if (promptId.includes('laudo') || promptId.includes('medico')) {
    return `📋 **Análise de Laudos Médicos**

Para realizar uma análise completa e precisa dos laudos médicos, preciso que você anexe:

**Documentos necessários:**
- Laudo médico pericial
- Exames complementares
- Relatórios médicos
- Documentos relacionados ao caso

**Formatos aceitos:** .txt, .docx (máx. 10MB)

Por favor, anexe o documento para prosseguir com a análise.`;
  }
  
  if (promptId.includes('pec')) {
    return `📜 **Análise de PEC (Proposta de Emenda Constitucional)**

Para analisar adequadamente a PEC, preciso do documento oficial:

**Documento necessário:**
- Texto completo da PEC
- Justificativa da proposta
- Documentos complementares (se houver)

**Formatos aceitos:** .txt, .docx (máx. 10MB)

Anexe a PEC para realizar a análise jurídica detalhada.`;
  }
  
  if (promptId.includes('correcao') || promptId.includes('corrigir')) {
    return `✏️ **Correção de Texto Jurídico**

Para corrigir e aprimorar seu texto, preciso do documento original:

**Documento necessário:**
- Texto a ser corrigido
- Peça jurídica
- Documento para revisão

**Formatos aceitos:** .txt, .docx (máx. 10MB)

Anexe o documento que deseja corrigir e aprimorar.`;
  }
  
  if (promptId.includes('memoriais')) {
    return `📝 **Elaboração de Memoriais**

Para elaborar memoriais fundamentados, preciso dos documentos do processo:

**Documentos necessários:**
- Petição inicial
- Contestação/Defesa
- Provas produzidas
- Decisões relevantes
- Documentos do processo

**Formatos aceitos:** .txt, .docx (máx. 10MB)

Anexe os documentos processuais para elaboração dos memoriais.`;
  }

  if (promptId.includes('resumo-para-clientes')) {
    return `📋 **Resumo para Clientes**

Para criar um resumo claro e acessível para seu cliente, preciso da peça jurídica:

**Documentos necessários:**
- Petição, parecer, recurso ou outra peça jurídica
- Documentação do processo (opcional)
- Qualquer documento que deseja que seja resumido

**📝 O que você receberá:**
✅ Explicação simples e clara (sem jargão jurídico)
✅ O que foi feito até agora
✅ Situação legal atual
✅ Próximos passos esperados
✅ Glossário com termos técnicos
✅ Respostas às dúvidas frequentes

**Formatos aceitos:** .txt, .docx, .pdf (máx. 10MB)

Anexe o documento que deseja resumir para seu cliente.`;
  }

  if (promptId.includes('rebater-argumentos')) {
    return `⚖️ **Rebater Argumentos - Contra-argumentação Jurídica**

Para elaborar uma contra-argumentação robusta e tecnicamente irrefutável, preciso dos argumentos que você deseja refutar:

**Documentos necessários:**
- Argumentos da parte contrária (peça processual, razões de recurso, contestação, etc.)
- Indicação clara do foco/tema específico da refutação
- Documentação relevante do processo (se houver)

**📝 O que você receberá:**
✅ Contra-argumentação ponto a ponto
✅ Fundamentação legal precisa (com fontes)
✅ Desconstrução lógica dos argumentos adversários
✅ Antecipação de possíveis réplicas
✅ Minuta pronta para uso processual
✅ Linguagem técnico-jurídica formal

**Formatos aceitos:** .txt, .docx, .pdf (máx. 10MB)

Anexe o documento com os argumentos a serem refutados e indique o tema específico.`;
  }

  if (promptId.includes('busca-de-jurisprudencia')) {
    return `🔍 **Busca de Jurisprudência - Orientação e Formatação**

Este assistente ajuda você a localizar e formatar jurisprudência de forma profissional.

**COMO FUNCIONA:**

**Passo 1 - Indique seu tema:**
- Descreva o tema jurídico ou artigo de lei
- Indique preferência de tribunal (STF, STJ, TRF, TJ estadual, etc.)
- Especifique ramo do direito (cível, criminal, trabalhista, etc.)

**Passo 2 - Receba orientação:**
- Vou indicar exatamente onde buscar
- Forneço dicas de como fazer a pesquisa em cada site
- Indico palavras-chave para usar

**Passo 3 - Compartilhe as decisões:**
- Copie e cole o conteúdo das decisões encontradas
- Ou anexe PDFs das decisões
- Ou compartilhe os links das plataformas

**Passo 4 - Receba formatação profissional:**
- Vou formatar 3 jurisprudências conforme padrão profissional
- Com ementa, tribunal, número do processo, data e link
- Pronto para usar em petições e memoriais

**PLATAFORMAS PRINCIPAIS:**
- **STF**: https://portal.stf.jus.br/
- **STJ**: https://www.stj.jus.br/
- **TRFs**: https://www.trf1.jus.br/ (e demais regiões)
- **Jusbrasil**: https://www.jusbrasil.com.br/
- **TJ-SP e outros TJs estaduais**

**📝 O que você receberá:**
✅ 3 jurisprudências formatadas
✅ Ementa oficial de cada decisão
✅ Tribunal e número do processo
✅ Links diretos verificáveis
✅ Pronto para usar profissionalmente

Comece descrevendo seu tema jurídico!`;
  }
  
  if (promptId.includes('resumir') || promptId.includes('resumo')) {
    return `📋 **Resumo de Processos**

Para criar um resumo completo e útil, preciso dos documentos processuais:

**Documentos necessários:**
- Peças principais do processo
- Decisões judiciais
- Documentos relevantes
- Histórico processual

**Formatos aceitos:** .txt, .docx (máx. 10MB)

Anexe os documentos do processo para gerar o resumo.`;
  }
  
  if (promptId.includes('relatorio')) {
    return `📊 **Elaboração de Relatório**

Para elaborar um relatório detalhado, preciso dos documentos base:

**Documentos necessários:**
- Documentos a serem analisados
- Peças processuais
- Provas e evidências
- Material de apoio

**Formatos aceitos:** .txt, .docx (máx. 10MB)

Anexe os documentos para elaboração do relatório.`;
  }
  
  // Mensagem genérica para outros tipos
  return `📄 **Documento Necessário**

Para realizar ${promptName}, preciso que você anexe o documento que deve ser analisado.

**Tipos de arquivo aceitos:**
- Documentos de texto (.txt)
- Documentos Word (.docx)
- Tamanho máximo: 10MB

Por favor, anexe o documento relacionado ao seu caso.`;
};

export default {
  DOCUMENT_REQUIRED_PROMPTS,
  requiresMandatoryDocument,
  canBenefitFromDocument,
  getDocumentRequestMessage
};
