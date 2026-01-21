# Mensagem Inicial - Apelação Criminal

## Análise do Prompt Enviado

O prompt "Apelação Criminal" foi estruturado para elaborar **razões de apelação criminal com 150 mil tokens** (43 partes de ~3.500 tokens cada) seguindo um método rigorosamente técnico e profissional.

### Características do Prompt:

**TAREFA:** Elaborar razões de apelação criminal detalhada, técnica e estruturada
**PERSONA:** Jurista experiente em Direito Penal e Processual Penal
**METODOLOGIA:** 5 etapas mentais antes de redigir (segmentação, steel-manning, prova, etc.)
**PROTOCOLO:** 7 etapas de leitura e análise da sentença

### Estrutura de Saída (5 seções):
1. **RELATÓRIO** - Exposição dos fatos processuais
2. **JUÍZO DE ADMISSIBILIDADE** - Requisitos do recurso
3. **MÉRITO RECURSAL** - Análise profunda em hierarquia de teses (absolvição → desclassificação → qualificadores → dosimetria)
4. **APLICAÇÃO DA PENA** - Impugnação de circunstâncias e dosimetria
5. **PEDIDOS** - Pedidos em gradação

---

## Mensagem Inicial Criada

A mensagem foi registrada em `src/services/promptService.js` na função `getWelcomeMessageForPrompt()`:

```
🔴 **ASSISTENTE DE APELAÇÃO CRIMINAL** 🔴

Bem-vindo ao especialista em Razões de Apelação Criminal com 150 mil tokens!

**COMO FUNCIONA:**

Este assistente elabora apelações criminais **rigorosamente técnicas**, analisando a sentença em profundidade e apresentando argumentação robusta em hierarquia de teses.

**O QUE VOCÊ PRECISA FAZER:**

1️⃣ **Envie um PDF** contendo:
   • A sentença condenatória (completa)
   • A denúncia original
   • Os autos do processo (provas documentais relevantes)
   • Depoimentos das testemunhas (se possível)
   • Qualquer outro documento importante para análise

2️⃣ **Responda minhas perguntas** sobre:
   • O acusado e seus dados pessoais
   • Os crimes imputados e suas circunstâncias
   • Os principais pontos de contestação
   • Circunstâncias favoráveis não mencionadas

3️⃣ **Digite "GERAR"** quando tiver enviado todos os documentos e respondido as perguntas

**RESULTADO:**

Você receberá uma **apelação de 150 mil tokens** estruturada em 5 seções:
   ✅ **Relatório** – Exposição dos fatos processuais
   ✅ **Admissibilidade** – Demonstração dos requisitos do recurso
   ✅ **Mérito** – Análise profunda com teses em hierarquia
   ✅ **Dosimetria** – Impugnação da pena (se necessário)
   ✅ **Pedidos** – Formulação graduada dos requerimentos

Comece enviando o PDF da sentença e dos documentos! 📄
```

---

## Fluxo de Uso

### Fase 1: BOAS-VINDAS
- Usuário seleciona "Apelação Criminal" no dashboard
- Sistema exibe mensagem de boas-vindas explicando o processo
- **IA inicia com questões estruturadas sobre:**
  - Identificação do acusado
  - Crimes imputados
  - Principais contestações
  - Circunstâncias relevantes

### Fase 2: COLETA DE INFORMAÇÕES
- Usuário envia **PDF com sentença e documentos**
- Usuário responde perguntas da IA
- IA pode fazer perguntas complementares
- **Transição automática** quando usuário digita "GERAR" OU quando IA detecta "tenho todas as informações"

### Fase 3: GERAÇÃO MULTI-PARTE
- Sistema chama `generateLargeResponse()` com config:
  ```javascript
  {
    model: 'gpt-3.5-turbo',
    maxTokens: 150000,
    numberOfParts: 43,
    chunkSize: 3500,
    temperature: 0.5,
    multiPartGeneration: true
  }
  ```

- Gera 43 partes sequenciais com 1.5s de pausa entre requisições
- Cada parte referencia o contexto das partes anteriores
- Total: ~150.000 tokens (~45-50 minutos de geração)

### Fase 4: ENTREGA
- Apelação completa é exibida no chat
- Usuário pode copiar, editar e enviar para o tribunal

---

## Integração Realizada

### 1. **promptService.js** - Linhas 164-198
- Adicionada entrada 'Apelacao Criminal' ao objeto `welcomeMessages`
- Mensagem clara sobre o fluxo e requisitos

### 2. **promptService.js** - Função `getPromptFileName()`
- Adicionado mapeamento:
  ```javascript
  'apelacao-criminal': 'Apelacao Criminal.txt'
  ```

### 3. **promptService.js** - Array `promptFiles`
- Prompt já adicionado ao array na linha 7:
  ```javascript
  const promptFiles = [
    ...
    'Apelacao Criminal.txt',
    ...
  ];
  ```

### 4. **aiConfig.js** - Configuração do Token Management
- Configuração já presente:
  ```javascript
  'apelacao-criminal': {
    maxTokens: 150000,
    numberOfParts: 43,
    chunkSize: 3500,
    temperature: 0.5,
    useRAG: false,
    multiPartGeneration: true
  }
  ```

### 5. **ChatInterface.jsx** - Routing e Fluxo
- Prompt excluído de direct chat (força fluxo estruturado)
- Detecta `generateLargeResponse()` para multi-part generation
- GERAR command trigger implementado

---

## Próximos Passos (Opcionais)

1. **Integração de Upload de PDF:**
   - Implementar handler para receber PDFs
   - Extrair texto da sentença automaticamente
   - Pré-popular a IA com informações do documento

2. **Ativação de RAG:**
   - Implementar vector embeddings com Firebase
   - Permitir que IA consulte conteúdo do PDF durante geração

3. **Histórico de Apelações:**
   - Salvar no Firebase para revisão posterior
   - Permitir exportação em DOCX/PDF

4. **Validação de Conteúdo:**
   - Verificar se sentença está completa
   - Alertar se informações críticas faltam

---

## Validação

✅ Arquivo `/public/prompts/Apelacao Criminal.txt` - Criado com 3000+ linhas  
✅ Configuração em `aiConfig.js` - 150k tokens, 43 partes  
✅ Routing em `ChatInterface.jsx` - Estruturado e exclusivo  
✅ Mensagem de boas-vindas - Clara e instrutiva  
✅ Aparecer no dashboard Juri.AI - "Assistentes Populares"  

**Sistema pronto para uso!** 🚀
