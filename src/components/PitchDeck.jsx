import React, { useState, useRef, useEffect } from 'react';
import { FileText, Calendar, Briefcase, Users, Play, TrendingUp, Send, X } from 'lucide-react';
import ChatInterface from './ChatInterface';
import { loadPromptFiles } from '../services/promptService';

const PitchDeck = () => {
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [promptTypes, setPromptTypes] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleScheduleMeeting = () => {
    const phoneNumber = '5511974696172';
    const message = 'Olá! Gostaria de agendar uma reunião para conhecer melhor a plataforma DireitoHub.';
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Carregar prompts ao montar o componente
  useEffect(() => {
    const loadPrompts = async () => {
      try {
        const prompts = await loadPromptFiles();
        setPromptTypes(prompts);
        
        // Encontrar o prompt "Projeto de Lei" ou usar o primeiro disponível
        const projetoPrompt = prompts.find(p => 
          p.name.toLowerCase().includes('projeto') || 
          p.name.toLowerCase().includes('lei')
        ) || prompts[0];
        
        if (projetoPrompt) {
          setSelectedPrompt(projetoPrompt);
        }
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    };
    
    loadPrompts();
  }, []);

  const handleCloseDemoModal = () => {
    setShowDemoModal(false);
  };

  const modules = [
    {
      icon: FileText,
      title: 'JuriIA',
      description: 'Motor de IA jurídica com RAG proprietário',
      features: [
        'Redação automática de peças processuais',
        'Zero alucinação com contexto do CRM',
        'Engenharia jurídica codificada (CPC)',
        'Análise de jurisprudências'
      ],
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Calendar,
      title: 'Criação & Agendamento de Consultas',
      description: 'Plataforma 24/7 com geração automática de página',
      features: [
        'Página de agendamento auto-gerada',
        'Integração com calendário do advogado',
        'Confirmação automática de consultas',
        'Video conferência integrada'
      ],
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: Play,
      title: 'DireitoHub Flix',
      description: 'Plataforma educativa com tutorials',
      features: [
        'Vídeos tutoriais sobre como usar o sistema',
        'Documentação interativa',
        'Casos de uso práticos',
        'Certificação de advogados'
      ],
      color: 'from-orange-500 to-red-500'
    },
    {
      icon: Briefcase,
      title: 'Gerenciador de Processos',
      description: 'CRM jurídico integrado com IA',
      features: [
        'Gestão completa de processos',
        'Comunicação com JuriIA para peças',
        'Timeline e prazos automáticos',
        'Histórico de versões de documentos'
      ],
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: Users,
      title: 'Gerenciador de Vagas',
      description: 'Marketplace de oportunidades jurídicas',
      features: [
        'Publicação de vagas e demandas',
        'Conexão entre advogados',
        'Sistema de ratings e confiança',
        'Comissão por sucesso'
      ],
      color: 'from-pink-500 to-rose-500'
    },
    {
      icon: Users,
      title: 'Parceiros',
      description: 'Rede de especialistas e provedores',
      features: [
        'Integração com peritos e consultores',
        'Marketplace de serviços jurídicos',
        'Revenue sharing para parceiros',
        'API aberta para integrações'
      ],
      color: 'from-indigo-500 to-violet-500'
    }
  ];

  return (
    <div className="bg-slate-900 text-white">
      {/* NAV */}
      <nav className="border-b border-slate-700 sticky top-0 z-40 bg-slate-900/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            DireitoHub
          </div>
          <div className="hidden md:flex gap-8 text-sm">
            <a href="#problema" className="text-slate-300 hover:text-white transition">Problema</a>
            <a href="#solucao" className="text-slate-300 hover:text-white transition">Solução</a>
            <a href="#modulos" className="text-slate-300 hover:text-white transition">Módulos</a>
            <a href="#dados" className="text-slate-300 hover:text-white transition">Dados</a>
            <a href="#cta" className="text-slate-300 hover:text-white transition">Contato</a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <div className="text-sm font-bold text-blue-400 mb-4 tracking-widest">DIREITOHUB BY BIPETECH</div>
          <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
            O Sistema Operacional da <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Advocacia Inteligente</span>
          </h1>
          <p className="text-2xl text-cyan-400 font-bold mb-8">CRM Jurídico + Engenharia de Prompts Contextual</p>
          <div className="inline-block bg-slate-800 border border-slate-700 rounded-xl p-8">
            <p className="text-2xl font-bold"><span className="text-green-400">⚡ Zero Alucinação.</span> <span className="text-blue-400">100% Contexto.</span></p>
          </div>
        </div>
      </section>

      {/* PROBLEMA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-700" id="problema">
        <h2 className="text-4xl font-bold mb-4 text-center">O Problema</h2>
        <p className="text-center text-slate-300 mb-12 max-w-2xl mx-auto text-lg">
          Advogados desperdiçam 40% do tempo com tarefas administrativas e redação repetitiva. A IA disponível é genérica e perigosa. Não existe sistema jurídico integrado para a "cauda longa" da advocacia.
        </p>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-red-950/30 border border-red-800 rounded-lg p-8">
            <h3 className="text-xl font-bold text-red-400 mb-3">❌ Alucinação de IA</h3>
            <p className="text-slate-300">ChatGPT inventa jurisprudências. O risco é fatal para advogados.</p>
          </div>
          <div className="bg-red-950/30 border border-red-800 rounded-lg p-8">
            <h3 className="text-xl font-bold text-red-400 mb-3">❌ Dados Fragmentados</h3>
            <p className="text-slate-300">Clientes em Excel, petições em Word, prazos no calendário. A IA não vê o todo.</p>
          </div>
          <div className="bg-red-950/30 border border-red-800 rounded-lg p-8">
            <h3 className="text-xl font-bold text-red-400 mb-3">❌ Sem Automação</h3>
            <p className="text-slate-300">Agendamentos manuais, redação jurídica manual, gestão de processos fragmentada.</p>
          </div>
        </div>
      </section>

      {/* SOLUÇÃO */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-700" id="solucao">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">A Solução: DireitoHub</h2>
          <p className="text-slate-300 max-w-3xl mx-auto text-lg">
            Uma plataforma integrada que conecta CRM, IA jurídica proprietária, agendamentos, gestão de processos e marketplace de oportunidades. Tudo em um único lugar.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-lg p-8">
            <div className="text-3xl mb-4">📥</div>
            <h3 className="text-xl font-bold mb-4">Input</h3>
            <p className="text-slate-300">Advogado cadastra cliente, processo, documentos e provas no CRM.</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg p-8">
            <div className="text-3xl mb-4">⚙️</div>
            <h3 className="text-xl font-bold mb-4">Motor RAG</h3>
            <p className="text-slate-300">JuriIA lê documentos reais do caso + base legal integrada (Retrieval-Augmented Generation).</p>
          </div>
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-8">
            <div className="text-3xl mb-4">📄</div>
            <h3 className="text-xl font-bold mb-4">Output</h3>
            <p className="text-slate-300">Peça processual pronta, formatada, com segurança jurídica garantida.</p>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 text-center">
          <h3 className="text-2xl font-bold mb-2">Resultado</h3>
          <p className="text-cyan-400 text-lg font-bold">✅ 80% automação + 100% precisão jurídica</p>
        </div>
      </section>

      {/* DIFERENCIAL */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-700">
        <h2 className="text-4xl font-bold mb-12 text-center">Por que DireitoHub é Diferente</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-lg p-8">
            <div className="text-4xl mb-4">🧠</div>
            <h3 className="text-xl font-bold mb-4">Engenharia Jurídica Proprietária</h3>
            <p className="text-slate-300">Traduzimos o CPC em cadeias de raciocínio lógico. Não é um wrapper genérico de GPT.</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg p-8">
            <div className="text-4xl mb-4">⚖️</div>
            <h3 className="text-xl font-bold mb-4">Fator Humano</h3>
            <p className="text-slate-300">Head of Legal AI (Advogado Sênior) garante que a IA respeita a lei. Zero invenções.</p>
          </div>
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-8">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-xl font-bold mb-4">Zero Prompting</h3>
            <p className="text-slate-300">Advogado clica em "Contestar". O sistema injeta o prompt perfeito automaticamente.</p>
          </div>
        </div>
      </section>

      {/* MÓDULOS PRINCIPAIS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-700" id="modulos">
        <h2 className="text-4xl font-bold mb-4 text-center">2 Pilares Principais</h2>
        <p className="text-center text-slate-300 mb-12 text-lg">Foco absoluto em IA jurídica e geração automática de sites.</p>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-lg p-10">
            <div className="text-5xl mb-6">🧠</div>
            <h3 className="text-3xl font-bold mb-4">JuriIA</h3>
            <p className="text-slate-300 mb-6 text-lg">Motor de IA jurídica com RAG proprietário</p>
            <ul className="space-y-3">
              <li className="text-slate-300 flex gap-3"><span className="text-green-400">✓</span> Redação automática de peças processuais</li>
              <li className="text-slate-300 flex gap-3"><span className="text-green-400">✓</span> Zero alucinação com contexto do CRM</li>
              <li className="text-slate-300 flex gap-3"><span className="text-green-400">✓</span> Engenharia jurídica codificada (CPC)</li>
              <li className="text-slate-300 flex gap-3"><span className="text-green-400">✓</span> Análise de jurisprudências</li>
              <li className="text-slate-300 flex gap-3"><span className="text-green-400">✓</span> Integração com Gerenciador de Processos</li>
            </ul>
            <div className="mt-6 pt-6 border-t border-slate-700">
              <p className="text-cyan-400 font-bold">~70% da receita Y2</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg p-10">
            <div className="text-5xl mb-6">🌐</div>
            <h3 className="text-3xl font-bold mb-4">Site Builder 24/7</h3>
            <p className="text-slate-300 mb-6 text-lg">Criação automática de página + agendamento integrado</p>
            <ul className="space-y-3">
              <li className="text-slate-300 flex gap-3"><span className="text-green-400">✓</span> Página de agendamento auto-gerada</li>
              <li className="text-slate-300 flex gap-3"><span className="text-green-400">✓</span> Integração com calendário do advogado</li>
              <li className="text-slate-300 flex gap-3"><span className="text-green-400">✓</span> Confirmação automática de consultas</li>
              <li className="text-slate-300 flex gap-3"><span className="text-green-400">✓</span> Video conferência integrada</li>
              <li className="text-slate-300 flex gap-3"><span className="text-green-400">✓</span> Domínio personalizado e SSL inclusos</li>
            </ul>
            <div className="mt-6 pt-6 border-t border-slate-700">
              <p className="text-purple-400 font-bold">~25% da receita Y2</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
          <h3 className="text-2xl font-bold mb-4 text-center">Módulos Complementares</h3>
          <p className="text-slate-300 mb-6 text-center">Gerenciador de Processos, DireitoHub Flix (Educação) e Marketplace de Oportunidades complementam a plataforma.</p>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-bold text-blue-400 mb-3">📋 Gerenciador de Processos</h4>
              <p className="text-sm text-slate-300">CRM jurídico integrado, timeline automática e histórico de versões.</p>
            </div>
            <div>
              <h4 className="font-bold text-green-400 mb-3">🎓 DireitoHub Flix</h4>
              <p className="text-sm text-slate-300">Plataforma de educação com tutoriais, certificação e casos de uso.</p>
            </div>
            <div>
              <h4 className="font-bold text-purple-400 mb-3">👥 Marketplace</h4>
              <p className="text-sm text-slate-300">Conexão entre advogados, publicação de vagas e sistema de ratings.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FLUXOS DE RECEITA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-700">
        <h2 className="text-4xl font-bold mb-4 text-center">Fluxos de Receita</h2>
        <p className="text-center text-slate-300 mb-12 text-lg max-w-3xl mx-auto">
          Múltiplos pontos de monetização criam receita previsível e escalável.
        </p>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-lg p-8">
            <div className="text-4xl mb-4">💳</div>
            <h3 className="text-2xl font-bold mb-3">SaaS Recorrente</h3>
            <p className="text-slate-300 mb-4">Assinaturas mensais por tier de funcionalidades</p>
            <ul className="space-y-2 text-sm">
              <li className="text-slate-300"><strong>Starter:</strong> R$ 79,90 - Autônomos</li>
              <li className="text-slate-300"><strong>PRO:</strong> R$ 199,90 - Escritórios Ativos (RECOMENDADO)</li>
              <li className="text-slate-300"><strong>Boutique:</strong> R$ 499,90 - Multi-usuários</li>
            </ul>
            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="text-2xl font-bold text-cyan-400">R$ 3.15M</div>
              <div className="text-sm text-slate-400">~70% da receita Y2</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg p-8">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-2xl font-bold mb-3">Créditos de IA (Pay-as-you-go)</h3>
            <p className="text-slate-300 mb-4">Consumo adicional para heavy users</p>
            <ul className="space-y-2 text-sm">
              <li className="text-slate-300">• R$ 0,50 por peça processual gerada</li>
              <li className="text-slate-300">• R$ 0,10 por análise jurídica</li>
              <li className="text-slate-300">• R$ 0,05 por consulta ao RAG</li>
              <li className="text-slate-300">Pacotes com desconto até 20%</li>
            </ul>
            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="text-2xl font-bold text-purple-400">R$ 675K</div>
              <div className="text-sm text-slate-400">~15% da receita Y2</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-8">
            <div className="text-4xl mb-4">🎓</div>
            <h3 className="text-2xl font-bold mb-3">DireitoHub Flix Premium</h3>
            <p className="text-slate-300 mb-4">Certificação e conteúdo avançado</p>
            <ul className="space-y-2 text-sm">
              <li className="text-slate-300">• R$ 49,90/mês - Acesso completo</li>
              <li className="text-slate-300">• Certificação jurídica reconhecida</li>
              <li className="text-slate-300">• Conteúdo exclusivo + casos reais</li>
              <li className="text-slate-300">Atração cross-sell dos usuários base</li>
            </ul>
            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="text-2xl font-bold text-green-400">R$ 825K</div>
              <div className="text-sm text-slate-400">~18% da receita Y2</div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
          <h3 className="text-2xl font-bold mb-6 text-center">Projeção de Mix de Receita - Ano 2</h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-bold mb-4 text-cyan-400">Breakdown por Stream</h4>
              <ul className="space-y-3">
                <li className="flex justify-between"><span>SaaS Recorrente</span> <span className="text-cyan-400 font-bold">R$ 3.15M (70%)</span></li>
                <li className="flex justify-between"><span>Créditos IA</span> <span className="text-purple-400 font-bold">R$ 675K (15%)</span></li>
                <li className="flex justify-between"><span>DireitoHub Flix Premium</span> <span className="text-green-400 font-bold">R$ 825K (18%)</span></li>
                <li className="flex justify-between border-t border-slate-600 pt-3 mt-3 text-lg font-bold"><span>TOTAL</span> <span className="text-cyan-400">R$ 4.65M (100%)</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-cyan-400">Métricas por Stream</h4>
              <ul className="space-y-3 text-sm">
                <li><strong>1.800 usuários</strong> × R$ 175 avg MRR = R$ 3.15M</li>
                <li><strong>180 heavy users</strong> × R$ 3.750 consumo/ano = R$ 675K</li>
                <li><strong>1.375 subscribers Flix</strong> × R$ 49,90 × 12 meses = R$ 825K</li>
                <li className="border-t border-slate-600 pt-3 mt-3"><strong>Mix recorrente:</strong> 100% (previsível e escalável)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FLUXO */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-700">
        <h2 className="text-4xl font-bold mb-12 text-center">Como Funciona</h2>
        <div className="grid md:grid-cols-4 gap-6">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 text-center">
            <div className="text-4xl mb-4">1️⃣</div>
            <h4 className="font-bold mb-2">Cliente Agendar</h4>
            <p className="text-sm text-slate-300">Via página auto-gerada 24/7</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 text-center">
            <div className="text-4xl mb-4">2️⃣</div>
            <h4 className="font-bold mb-2">Advogado Preenche CRM</h4>
            <p className="text-sm text-slate-300">Partes, fatos, documentos</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 text-center">
            <div className="text-4xl mb-4">3️⃣</div>
            <h4 className="font-bold mb-2">JuriIA Gera Peça</h4>
            <p className="text-sm text-slate-300">Com RAG + contexto jurídico</p>
          </div>
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-6 text-center">
            <div className="text-4xl mb-4">✅</div>
            <h4 className="font-bold mb-2">Pronto para Protocolo</h4>
            <p className="text-sm text-green-400 font-bold">80% automação</p>
          </div>
        </div>
      </section>

      {/* DADOS & NÚMEROS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-700" id="dados">
        <h2 className="text-4xl font-bold mb-12 text-center">Mercado & Métricas</h2>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
            <div className="text-4xl font-bold text-blue-400 mb-2">R$ 90B</div>
            <h4 className="font-bold mb-2">TAM</h4>
            <p className="text-sm text-slate-300">Mercado total endereçável de software jurídico</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
            <div className="text-4xl font-bold text-cyan-400 mb-2">180K</div>
            <h4 className="font-bold mb-2">SAM</h4>
            <p className="text-sm text-slate-300">Advogados autônomos + pequenos escritórios</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
            <div className="text-4xl font-bold text-green-400 mb-2">1.2M</div>
            <h4 className="font-bold mb-2">Total</h4>
            <p className="text-sm text-slate-300">Advogados brasileiros na "cauda longa"</p>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 mb-12">
          <h3 className="text-2xl font-bold mb-6">Unit Economics</h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <div className="text-slate-400 text-sm mb-2">LTV / CAC</div>
              <div className="text-3xl font-bold text-green-400">10x</div>
              <p className="text-xs text-slate-400 mt-1">Eficiência de capital</p>
            </div>
            <div>
              <div className="text-slate-400 text-sm mb-2">Margem Bruta</div>
              <div className="text-3xl font-bold text-green-400">70%</div>
              <p className="text-xs text-slate-400 mt-1">Sustentável com custos de IA</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <h3 className="text-2xl font-bold p-8 pb-4">Projeção 5 Anos</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-700">
                  <th className="text-left py-3 px-4 font-bold">Métrica</th>
                  <th className="text-center py-3 px-4 font-bold">Ano 1</th>
                  <th className="text-center py-3 px-4 font-bold">Ano 2</th>
                  <th className="text-center py-3 px-4 font-bold">Ano 3</th>
                  <th className="text-center py-3 px-4 font-bold">Ano 5</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                <tr className="hover:bg-slate-700/50">
                  <td className="py-3 px-4">Usuários</td>
                  <td className="text-center py-3 px-4 text-green-400 font-bold">450</td>
                  <td className="text-center py-3 px-4 text-green-400 font-bold">1.800</td>
                  <td className="text-center py-3 px-4 text-green-400 font-bold">5.500</td>
                  <td className="text-center py-3 px-4 text-green-400 font-bold">25.000</td>
                </tr>
                <tr className="hover:bg-slate-700/50">
                  <td className="py-3 px-4">Receita (ARR)</td>
                  <td className="text-center py-3 px-4 text-blue-400 font-bold">R$ 970K</td>
                  <td className="text-center py-3 px-4 text-blue-400 font-bold">R$ 4.5M</td>
                  <td className="text-center py-3 px-4 text-blue-400 font-bold">R$ 15M</td>
                  <td className="text-center py-3 px-4 text-blue-400 font-bold">R$ 81M</td>
                </tr>
                <tr className="hover:bg-slate-700/50">
                  <td className="py-3 px-4">EBITDA</td>
                  <td className="text-center py-3 px-4 text-red-400 font-bold">-32%</td>
                  <td className="text-center py-3 px-4 text-orange-400 font-bold">-8%</td>
                  <td className="text-center py-3 px-4 text-green-400 font-bold">+18%</td>
                  <td className="text-center py-3 px-4 text-green-400 font-bold">+56%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ROADMAP */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-700">
        <h2 className="text-4xl font-bold mb-12 text-center">Roadmap 2026</h2>
        <div className="grid md:grid-cols-4 gap-6">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
            <div className="text-sm font-bold text-blue-400 mb-2">Q1 2026</div>
            <h4 className="font-bold mb-3">MVP com RAG</h4>
            <p className="text-sm text-slate-300">Sistema core funcionando</p>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-6">
            <div className="text-sm font-bold text-purple-400 mb-2">Q2 2026</div>
            <h4 className="font-bold mb-3">Lançamento 5 Módulos</h4>
            <p className="text-sm text-slate-300">Plataforma completa ao mercado</p>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6">
            <div className="text-sm font-bold text-green-400 mb-2">Q3 2026</div>
            <h4 className="font-bold mb-3">Escala (Cauda Longa)</h4>
            <p className="text-sm text-slate-300">Crescimento agressivo de usuários</p>
          </div>
          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-6">
            <div className="text-sm font-bold text-cyan-400 mb-2">Q4 2026</div>
            <h4 className="font-bold mb-3">Breakeven</h4>
            <p className="text-sm text-slate-300">Operações autossuficientes</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-700" id="cta">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-12 text-center">
          <h2 className="text-4xl font-bold mb-6">Vamos Falar Sobre o Futuro da Advocacia</h2>
          <p className="text-lg opacity-90 mb-8 max-w-3xl mx-auto">
            Estamos construindo a plataforma completa que integra CRM, IA jurídica proprietária, agendamentos, gestão de processos e marketplace. Tudo com zero alucinação.
          </p>
          <div className="grid md:grid-cols-3 gap-6 mb-8 max-w-2xl mx-auto">
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-3xl mb-2">💰</div>
              <p className="font-bold">SaaS Recorrente</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-3xl mb-2">🔐</div>
              <p className="font-bold">Tecnologia Proprietária</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-3xl mb-2">📈</div>
              <p className="font-bold">Mercado Gigante</p>
            </div>
          </div>
          <div className="flex gap-4 justify-center flex-wrap">
            <button 
              onClick={handleScheduleMeeting}
              className="bg-white text-blue-600 hover:bg-slate-100 px-8 py-3 rounded-lg font-bold transition"
            >
              Agendar Reunião
            </button>
            <button 
              onClick={() => setShowDemoModal(true)}
              className="border-2 border-white text-white hover:bg-white/10 px-8 py-3 rounded-lg font-bold transition"
            >
              Ver Demo
            </button>
          </div>
        </div>
      </section>

      {/* MODAL DEMO */}
      {showDemoModal && selectedPrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[700px] flex flex-col border border-gray-200 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">JuriIA Demo</h3>
                  <p className="text-sm text-gray-600">{selectedPrompt.name}</p>
                </div>
              </div>
              <button 
                onClick={handleCloseDemoModal}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Interface */}
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Carregando assistente...</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-hidden">
                <ChatInterface 
                  promptType={selectedPrompt}
                  onBack={handleCloseDemoModal}
                  onClose={handleCloseDemoModal}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="border-t border-slate-700 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-400 text-sm">
          <p>&copy; 2026 DireitoHub by BIPETech. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default PitchDeck;
