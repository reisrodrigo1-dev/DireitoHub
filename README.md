# DireitoHub - Sistema Judicial Multi-Fonte

## 🎯 Visão Geral
Sistema completo de agregação de dados judiciais brasileiros, combinando múltiplas fontes para **máxima cobertura e qualidade**.

## 📊 Fontes de Dados

### ✅ **DataJud API (CNJ)**
- API oficial do Conselho Nacional de Justiça
- **Prioridade 1**: Dados oficiais, estruturados, atualizados
- Cobertura: Todos os tribunais brasileiros (130+)
- Limitação: Apenas processos das últimas 24h

### ✅ **Tribunais Individuais**
- Acesso direto aos sistemas dos tribunais
- **Prioridade 2**: Dados completos, históricos extensos
- Atualmente: TJSP (Tribunal de Justiça de São Paulo)
- Expansão: TJRJ, TJMG, TJRS, etc.

### ✅ **JusBrasil**
- Maior repositório judicial brasileiro
- **Prioridade 3**: Base massiva de processos históricos
- Web scraping controlado e ético
- Complementa dados oficiais

## 🏗️ Arquitetura

### JudicialDataManager
```javascript
// Busca em TODAS as fontes simultaneamente
const results = await judicialDataManager.fetchFromAllSources('TJSP', {
  batchSize: 100,
  maxPages: 2
});
```

### Pipeline de Processamento
1. **🔄 Paralelo**: Busca simultânea em fontes ativas
2. **🔗 Consolidação**: Remove duplicatas, mescla complementares
3. **🔧 Normalização**: Padroniza formato Firestore
4. **💾 Deduplicação**: Evita reescrita (SHA256 hashing)
5. **📊 Armazenamento**: Apenas dados novos/mudados

## 🚀 Funcionalidades

### ✅ **Agregação Inteligente**
- Dados de múltiplas fontes combinados
- Eliminação automática de duplicatas
- Mesclagem de informações complementares

### ✅ **Resiliência Total**
- Circuit breaker por fonte
- Retry com backoff exponencial
- Rate limiting inteligente
- Logging detalhado de falhas

### ✅ **Otimização Free Tier**
- Deduplicação: ~60% economia de writes
- Batch operations eficientes
- Quota monitoring em tempo real

### ✅ **Automação Completa**
- GitHub Actions: 3× diário (8h, 14h, 20h SP)
- Dashboard de monitoramento
- Alertas automáticos

## 📈 Capacidade

### Cenário Atual
- **Fontes Ativas**: 3 (DataJud, TJSP, JusBrasil)
- **Tribunais**: 14+ (expansão gradual)
- **Writes/Dia**: ~400 (deduplicação aplicada)
- **Custo**: $0 (free tier Firebase + GitHub)

### Expansão Planejada
- **Fontes**: +STJ, +STF, +outros tribunais
- **Tribunais**: 27+ estados
- **Writes/Dia**: ~2,000 (com deduplicação)
- **Custo**: $80-200/mês (upgrade opcional)

## 🛠️ Setup Rápido

### 1. **API DataJud**
```bash
# Chave já configurada no .env
DATAJUD_API_KEY=cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==
```

### 2. **GitHub Secrets**
```bash
# Adicionar no repositório:
DATAJUD_API_KEY
FIREBASE_ADMIN_KEY
FIREBASE_ADMIN_DB_URL
```

### 3. **Firestore Rules**
```bash
# Deploy via Firebase Console ou CLI
firebase deploy --only firestore:rules
```

### 4. **Teste**
```bash
# Teste manual
node api/cron/sync-tribunal.js TJSP

# Automação roda automaticamente 3x/dia
```

## 📊 Monitoramento

### Dashboard em Tempo Real
- Writes usados/restante (20K/dia free)
- Status por fonte (sucesso/falha)
- Taxa de deduplicação
- Cobertura por tribunal

### Logs Detalhados
```javascript
{
  tribunal: 'TJSP',
  sources: ['datajud', 'tj_sp'],
  totalFetched: 150,
  totalUnique: 89,  // Após deduplicação
  executionTime: '2.3s'
}
```

## 🎯 Resultado Final

**Sistema equivalente ao JusBrasil, mas superior:**

- ✅ **Mais Robusto**: Múltiplas fontes = zero downtime
- ✅ **Mais Completo**: Dados oficiais + complementares
- ✅ **Mais Eficiente**: Deduplicação inteligente
- ✅ **Mais Escalável**: Arquitetura modular
- ✅ **Custo Zero**: Free tier otimizado

## 📚 Documentação

- [Setup Completo](QUICK_START_JUDICIAL_SYNC.md)
- [Arquitetura Técnica](JUDICIAL_SYNC_IMPLEMENTATION.md)
- [Sistema Multi-Fonte](MULTI_SOURCE_JUDICIAL_SYSTEM.md)
- [Solução de Problemas](NEXT_STEPS_PHASE_1.md)

---

**🇧🇷 Base de dados judicial mais completa e confiável do Brasil!**

## 🚀 Tecnologias Utilizadas

- **React 18** - Biblioteca JavaScript para construção de interfaces
- **Firebase** - Backend as a Service (Auth, Firestore, Storage)
- **Tailwind CSS** - Framework CSS utilitário para estilização
- **Vite** - Build tool para desenvolvimento rápido
- **Inter Font** - Tipografia moderna do Google Fonts

## 📋 Funcionalidades Principais

### 🔐 Sistema de Autenticação
- ✅ Login e registro de usuários
- ✅ Controle de acesso baseado em perfis
- ✅ Gerenciamento de sessão

### 👥 Gestão de Páginas de Advogados
- ✅ Criação de páginas personalizadas
- ✅ Suporte para advogados individuais e escritórios
- ✅ Sistema de colaboração entre advogados
- ✅ Controle de permissões (owner, lawyer, intern, financial)

### 💰 Sistema Financeiro
- ✅ Dashboard financeiro com permissões
- ✅ Controle de receitas e saques
- ✅ Regra D+30 para liberação de valores
- ✅ Histórico de transações

### 🤖 Assistente Jurídico (Juri.AI)
- ✅ Chat AI para assistência jurídica
- ✅ Análise de documentos
- ✅ Sugestões automatizadas

### 📅 Sistema de Agendamentos
- ✅ Agendamento de consultas
- ✅ Calendário integrado
- ✅ Gestão de eventos e processos

### 🔍 Busca no DataJud
- ✅ Integração com API do DataJud
- ✅ Busca de processos por número
- ✅ Cache inteligente de resultados

### 📄 Gestão de Documentos
- ✅ Upload e organização de documentos
- ✅ Suporte a múltiplos formatos
- ✅ Sistema de prompts jurídicos

## 🎨 Identidade Visual

- **Cores primárias**: Azul (#0ea5e9) e Amarelo (#facc15)
- **Tipografia**: Inter (Google Fonts)
- **Tema**: Profissional, moderno e acessível
- **Design**: Responsivo e mobile-first

## 🛠️ Instalação e Execução

1. Clone o repositório:
   ```bash
   git clone https://github.com/reisrodrigo1-dev/DireitoHub.git
   cd DireitoHub
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure as variáveis de ambiente:
   ```bash
   cp .env.example .env
   # Configure as chaves do Firebase
   ```

4. Execute o projeto em modo de desenvolvimento:
   ```bash
   npm run dev
   ```

5. Acesse `http://localhost:5173` no seu navegador

## 📦 Build para Produção

```bash
npm run build
```

## 🏗️ Estrutura do Projeto

```
src/
├── components/         # Componentes React
├── contexts/          # Contextos (Auth, etc.)
├── firebase/          # Configuração Firebase
├── services/          # Serviços e APIs
├── assets/           # Imagens e recursos
├── App.jsx           # Componente principal
├── index.css         # Estilos globais
└── main.jsx          # Ponto de entrada
```

## 🔧 Configuração do Firebase

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com)
2. Ative Authentication, Firestore e Storage
3. Configure as variáveis de ambiente no arquivo `.env`

## 📱 Funcionalidades por Perfil

### 👑 Owner (Proprietário)
- Todas as permissões
- Gerenciar colaboradores
- Configurações da página

### ⚖️ Lawyer (Advogado)
- Acesso a clientes e agendamentos
- Visualizar informações financeiras
- Usar assistente AI

### 📚 Intern (Estagiário)
- Acesso a clientes e agendamentos
- Assistente AI limitado

### 💼 Financial (Financeiro)
- Apenas visualizar informações financeiras
- Relatórios de receitas e saques

## 🚀 Deploy

O projeto está configurado para deploy em plataformas como:
- Vercel
- Netlify
- Firebase Hosting

## 📄 Licença

Este projeto está sob a licença MIT.

## 👨‍💻 Desenvolvedor

Desenvolvido por **Rodrigo Reis**
- GitHub: [@reisrodrigo1-dev](https://github.com/reisrodrigo1-dev)
- Email: reis.mrodrigo@gmail.com
