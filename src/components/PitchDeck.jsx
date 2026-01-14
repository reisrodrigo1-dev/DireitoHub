import React, { useState, useRef, useEffect } from 'react';
import { FileText, Calendar, Briefcase, Users, Play, TrendingUp, Send, X, ZoomIn } from 'lucide-react';
import { motion, useAnimation, useInView } from 'framer-motion';
import ChatInterface from './ChatInterface';
import { loadPromptFiles } from '../services/promptService';

const PitchDeck = () => {
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [promptTypes, setPromptTypes] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [zoomedImage, setZoomedImage] = useState(null);

  // Hook para animações de scroll
  const useScrollAnimation = (threshold = 0.1) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: threshold });
    const controls = useAnimation();

    useEffect(() => {
      if (isInView) {
        controls.start('visible');
      }
    }, [isInView, controls]);

    return { ref, controls };
  };

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
    <div className="min-h-screen bg-slate-900 relative overflow-hidden">
      {/* Modal de Zoom de Imagem */}
      {zoomedImage && (
        <motion.div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setZoomedImage(null)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative max-w-4xl max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full z-10"
            >
              <X size={24} />
            </button>
            <img
              src={zoomedImage}
              alt="Imagem ampliada"
              className="w-full h-full object-contain rounded-lg"
            />
          </motion.div>
        </motion.div>
      )}

      {/* Background animado sutil */}
      <div className="fixed inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-slate-900 to-purple-900/20 animate-pulse-slow"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-cyan-500/5 via-transparent to-blue-500/5 animate-float"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-radial from-purple-500/10 to-transparent rounded-full blur-3xl animate-bounce-subtle"></div>
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-radial from-blue-400/8 to-transparent rounded-full blur-2xl animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Conteúdo principal */}
      <div className="relative z-10">
        {/* NAV */}
        <motion.nav 
          className="border-b border-slate-700 sticky top-0 z-40 bg-slate-900/95 backdrop-blur shadow-lg"
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <motion.div 
              className="flex items-center gap-3"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <img 
                src="/logo_direitoHub_Branco.png" 
                alt="DireitoHub Logo" 
                className="h-10 w-auto"
              />
              <div className="text-xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                DireitoHub
              </div>
            </motion.div>
            <div className="hidden md:flex gap-8 text-sm">
              <motion.a 
                href="#problema" 
                className="text-slate-200 hover:text-white transition-colors font-medium"
                whileHover={{ x: 2 }}
              >
                Problema
              </motion.a>
              <motion.a 
                href="#solucao" 
                className="text-slate-200 hover:text-white transition-colors font-medium"
                whileHover={{ x: 2 }}
              >
                Solução
              </motion.a>
              <motion.a 
                href="#modulos" 
                className="text-slate-200 hover:text-white transition-colors font-medium"
                whileHover={{ x: 2 }}
              >
                Módulos
              </motion.a>
              <motion.a 
                href="#dados" 
                className="text-slate-200 hover:text-white transition-colors font-medium"
                whileHover={{ x: 2 }}
              >
                Dados
              </motion.a>
              <motion.a 
                href="#cta" 
                className="text-slate-200 hover:text-white transition-colors font-medium"
                whileHover={{ x: 2 }}
              >
                Contato
              </motion.a>
            </div>
          </div>
        </motion.nav>

      {/* HERO */}
      <motion.section 
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="text-center">
          <motion.div 
            className="text-sm font-bold text-blue-300 mb-4 tracking-widest"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            DIREITOHUB BY BIPETECH
          </motion.div>
          <motion.h1 
            className="text-6xl md:text-7xl font-bold mb-6 leading-tight text-white"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            O Sistema Operacional da <span className="text-white animate-pulse">Advocacia Inteligente</span>
          </motion.h1>
          <motion.p 
            className="text-2xl text-slate-100 font-semibold mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            CRM Jurídico + Engenharia de Prompts Contextual
          </motion.p>
          <motion.div 
            className="flex justify-center mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            <motion.button 
              onClick={() => setShowDemoModal(true)}
              className="border-2 border-white text-white hover:bg-white/20 px-8 py-3 rounded-lg font-bold transition backdrop-blur"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              Ver Demo
            </motion.button>
          </motion.div>
          <motion.div 
            className="inline-block bg-gradient-to-br from-slate-800 to-slate-700 border border-blue-500/30 rounded-xl p-8 shadow-2xl shadow-blue-500/10"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(59, 130, 246, 0.3)" }}
          >
            <p className="text-2xl font-bold text-white"><span className="text-green-400">⚡ Zero Alucinação.</span> <span className="text-cyan-300">100% Contexto.</span></p>
          </motion.div>
        </div>
      </motion.section>

      {/* PROBLEMA */}
      <motion.section 
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-700" 
        id="problema"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <motion.h2 
          className="text-4xl font-bold mb-4 text-center text-white"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          O Problema
        </motion.h2>
        <motion.p 
          className="text-center text-slate-100 mb-12 max-w-2xl mx-auto text-lg"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          viewport={{ once: true }}
        >
          Advogados desperdiçam 40% do tempo com tarefas administrativas e redação repetitiva. A IA disponível é genérica e perigosa. Não existe sistema jurídico integrado para a "cauda longa" da advocacia.
        </motion.p>
        <motion.div 
          className="grid md:grid-cols-3 gap-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.2
              }
            }
          }}
        >
          <motion.div 
            className="bg-red-950/40 border border-red-700/50 rounded-lg p-8 hover:bg-red-950/60 transition-all duration-300 shadow-lg shadow-red-500/10"
            variants={{
              hidden: { opacity: 0, y: 50 },
              visible: { opacity: 1, y: 0 }
            }}
            whileHover={{ scale: 1.02, y: -5 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="text-xl font-bold text-red-300 mb-3">❌ Alucinação de IA</h3>
            <p className="text-slate-100">ChatGPT inventa jurisprudências. O risco é fatal para advogados.</p>
          </motion.div>
          <motion.div 
            className="bg-red-950/40 border border-red-700/50 rounded-lg p-8 hover:bg-red-950/60 transition-all duration-300 shadow-lg shadow-red-500/10"
            variants={{
              hidden: { opacity: 0, y: 50 },
              visible: { opacity: 1, y: 0 }
            }}
            whileHover={{ scale: 1.02, y: -5 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="text-xl font-bold text-red-300 mb-3">❌ Dados Fragmentados</h3>
            <p className="text-slate-100">Clientes em Excel, petições em Word, prazos no calendário. A IA não vê o todo.</p>
          </motion.div>
          <motion.div 
            className="bg-red-950/40 border border-red-700/50 rounded-lg p-8 hover:bg-red-950/60 transition-all duration-300 shadow-lg shadow-red-500/10"
            variants={{
              hidden: { opacity: 0, y: 50 },
              visible: { opacity: 1, y: 0 }
            }}
            whileHover={{ scale: 1.02, y: -5 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="text-xl font-bold text-red-300 mb-3">❌ Sem Automação</h3>
            <p className="text-slate-100">Agendamentos manuais, redação jurídica manual, gestão de processos fragmentada.</p>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* SOLUÇÃO */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-700" id="solucao">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 text-white">A Solução: DireitoHub</h2>
          <p className="text-slate-100 max-w-3xl mx-auto text-lg">
            Uma plataforma integrada que conecta CRM, IA jurídica proprietária, agendamentos, gestão de processos e marketplace de oportunidades. Tudo em um único lugar.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <motion.div 
            className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-lg p-8 shadow-lg shadow-blue-500/10"
            whileHover={{ y: -5, scale: 1.02 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-3xl mb-4">📥</div>
            <h3 className="text-xl font-bold mb-4 text-white">Input</h3>
            <p className="text-slate-100">Advogado cadastra cliente, processo, documentos e provas no CRM.</p>
          </motion.div>
          <motion.div 
            className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg p-8 shadow-lg shadow-purple-500/10"
            whileHover={{ y: -5, scale: 1.02 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-3xl mb-4">⚙️</div>
            <h3 className="text-xl font-bold mb-4 text-white">Motor RAG</h3>
            <p className="text-slate-100">JuriIA lê documentos reais do caso + base legal integrada (Retrieval-Augmented Generation).</p>
          </motion.div>
          <motion.div 
            className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-8 shadow-lg shadow-green-500/10"
            whileHover={{ y: -5, scale: 1.02 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-3xl mb-4">📄</div>
            <h3 className="text-xl font-bold mb-4 text-white">Output</h3>
            <p className="text-slate-100">Peça processual pronta, formatada, com segurança jurídica garantida.</p>
          </motion.div>
        </div>

        <motion.div 
          className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 border border-cyan-500/30 rounded-lg p-8 text-center shadow-lg shadow-cyan-500/10"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.3 }}
        >
          <h3 className="text-2xl font-bold mb-2 text-white">Resultado</h3>
          <p className="text-cyan-300 text-lg font-bold">✅ 80% automação + 100% precisão jurídica</p>
        </motion.div>
      </section>

      {/* DIFERENCIAL */}
      <motion.section 
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-700"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <motion.h2 
          className="text-4xl font-bold mb-12 text-center text-white"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          Por que DireitoHub é Diferente
        </motion.h2>
        <motion.div 
          className="grid md:grid-cols-3 gap-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.2
              }
            }
          }}
        >
          <motion.div 
            className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-lg p-8 shadow-lg shadow-blue-500/10"
            variants={{
              hidden: { opacity: 0, y: 50 },
              visible: { opacity: 1, y: 0 }
            }}
            whileHover={{ scale: 1.02, y: -5 }}
          >
            <motion.div 
              className="text-4xl mb-4"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              🧠
            </motion.div>
            <h3 className="text-xl font-bold mb-4 text-white">Engenharia Jurídica Proprietária</h3>
            <p className="text-slate-100">Traduzimos o CPC em cadeias de raciocínio lógico. Não é um wrapper genérico de GPT.</p>
          </motion.div>
          <motion.div 
            className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg p-8 shadow-lg shadow-purple-500/10"
            variants={{
              hidden: { opacity: 0, y: 50 },
              visible: { opacity: 1, y: 0 }
            }}
            whileHover={{ scale: 1.02, y: -5 }}
          >
            <motion.div 
              className="text-4xl mb-4"
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              ⚖️
            </motion.div>
            <h3 className="text-xl font-bold mb-4 text-white">Fator Humano</h3>
            <p className="text-slate-100">Head of Legal AI (Advogado Sênior) garante que a IA respeita a lei. Zero invenções.</p>
          </motion.div>
          <motion.div 
            className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-8 shadow-lg shadow-green-500/10"
            variants={{
              hidden: { opacity: 0, y: 50 },
              visible: { opacity: 1, y: 0 }
            }}
            whileHover={{ scale: 1.02, y: -5 }}
          >
            <motion.div 
              className="text-4xl mb-4"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              🎯
            </motion.div>
            <h3 className="text-xl font-bold mb-4 text-white">Zero Prompting</h3>
            <p className="text-slate-100">Advogado clica em "Contestar". O sistema injeta o prompt perfeito automaticamente.</p>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* MÓDULOS PRINCIPAIS */}
      <motion.section 
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-700" 
        id="modulos"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <motion.h2 
          className="text-4xl font-bold mb-4 text-center text-white"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          2 Pilares Principais
        </motion.h2>
        <motion.p 
          className="text-center text-slate-100 mb-12 text-lg"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          viewport={{ once: true }}
        >
          Foco absoluto em IA jurídica e geração automática de sites.
        </motion.p>

        <motion.div 
          className="grid md:grid-cols-2 gap-8 mb-12"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.3
              }
            }
          }}
        >
          <motion.div 
            className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-lg p-10 hover:border-blue-400/50 transition-all duration-300 shadow-lg shadow-blue-500/10"
            variants={{
              hidden: { opacity: 0, x: -50 },
              visible: { opacity: 1, x: 0 }
            }}
            whileHover={{ scale: 1.02, y: -5 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="relative group"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
            >
              <motion.img 
                src="/img/pitch-deck/JURI-IA.png"
                alt="JuriIA"
                className="w-full h-80 object-contain rounded-lg mb-6 bg-slate-700/30"
              />
              <button
                onClick={() => setZoomedImage("/img/pitch-deck/JURI-IA.png")}
                className="absolute top-4 right-4 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ZoomIn size={20} />
              </button>
            </motion.div>
            <h3 className="text-3xl font-bold mb-4 text-white">JuriIA</h3>
            <p className="text-slate-100 mb-6 text-lg">Motor de IA jurídica com RAG proprietário</p>
            <ul className="space-y-3">
              <li className="text-slate-100 flex gap-3"><span className="text-green-400 font-bold">✓</span> Redação automática de peças processuais</li>
              <li className="text-slate-100 flex gap-3"><span className="text-green-400 font-bold">✓</span> Zero alucinação com contexto do CRM</li>
              <li className="text-slate-100 flex gap-3"><span className="text-green-400 font-bold">✓</span> Engenharia jurídica codificada (CPC)</li>
              <li className="text-slate-100 flex gap-3"><span className="text-green-400 font-bold">✓</span> Análise de jurisprudências</li>
              <li className="text-slate-100 flex gap-3"><span className="text-green-400 font-bold">✓</span> Integração com Gerenciador de Processos</li>
            </ul>
            <div className="mt-6 pt-6 border-t border-slate-700">
              <p className="text-cyan-300 font-bold">~71.6% da receita Y2</p>
            </div>
          </motion.div>

          <motion.div 
            className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg p-10 hover:border-purple-400/50 transition-all duration-300 shadow-lg shadow-purple-500/10"
            variants={{
              hidden: { opacity: 0, x: 50 },
              visible: { opacity: 1, x: 0 }
            }}
            whileHover={{ scale: 1.02, y: -5 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="relative group"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
            >
              <motion.img 
                src="/img/pitch-deck/CRIE-SUA-PAGINA.png"
                alt="Site Builder 24/7"
                className="w-full h-80 object-contain rounded-lg mb-6 bg-slate-700/30"
              />
              <button
                onClick={() => setZoomedImage("/img/pitch-deck/CRIE-SUA-PAGINA.png")}
                className="absolute top-4 right-4 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ZoomIn size={20} />
              </button>
            </motion.div>
            <h3 className="text-3xl font-bold mb-4 text-white">Site Builder 24/7</h3>
            <p className="text-slate-100 mb-6 text-lg">Criação automática de página + agendamento integrado</p>
            <ul className="space-y-3">
              <li className="text-slate-100 flex gap-3"><span className="text-green-400 font-bold">✓</span> Página de agendamento auto-gerada</li>
              <li className="text-slate-100 flex gap-3"><span className="text-green-400 font-bold">✓</span> Integração com calendário do advogado</li>
              <li className="text-slate-100 flex gap-3"><span className="text-green-400 font-bold">✓</span> Confirmação automática de consultas</li>
              <li className="text-slate-100 flex gap-3"><span className="text-green-400 font-bold">✓</span> Video conferência integrada</li>
              <li className="text-slate-100 flex gap-3"><span className="text-green-400 font-bold">✓</span> Domínio personalizado e SSL inclusos</li>
            </ul>
            <div className="mt-6 pt-6 border-t border-slate-700">
              <p className="text-purple-300 font-bold">~12.8% da receita Y2</p>
            </div>
          </motion.div>
        </motion.div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
          <h3 className="text-2xl font-bold mb-4 text-center text-white">Módulos Complementares</h3>
          <p className="text-slate-100 mb-6 text-center">Gerenciador de Processos, DireitoHub Flix (Educação) e Marketplace de Oportunidades complementam a plataforma.</p>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-bold text-blue-400 mb-3">📋 Gerenciador de Processos</h4>
              <p className="text-sm text-slate-100">CRM jurídico integrado, timeline automática e histórico de versões.</p>
            </div>
            <div>
              <h4 className="font-bold text-green-400 mb-3">🎓 DireitoHub Flix</h4>
              <p className="text-sm text-slate-100">Plataforma de educação com tutoriais, certificação e casos de uso.</p>
            </div>
            <div>
              <h4 className="font-bold text-purple-400 mb-3">👥 Marketplace</h4>
              <p className="text-sm text-slate-100">Conexão entre advogados, publicação de vagas e sistema de ratings.</p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* FLUXOS DE RECEITA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-700">
        <h2 className="text-4xl font-bold mb-4 text-center text-white">Fluxos de Receita</h2>
        <p className="text-center text-slate-100 mb-12 text-lg max-w-3xl mx-auto">
          Múltiplos pontos de monetização criam receita previsível e escalável.
        </p>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-lg p-8">
            <div className="text-4xl mb-4">💳</div>
            <h3 className="text-2xl font-bold mb-3 text-white">SaaS Recorrente</h3>
            <p className="text-slate-100 mb-4">Assinaturas mensais por tier de funcionalidades</p>
            <ul className="space-y-2 text-sm text-slate-100">
              <li className="text-slate-100"><strong>Essencial:</strong> R$ 19,90 - Acesso a parceiros + 5 créditos de IA</li>
              <li className="text-slate-100"><strong>Site Builder:</strong> R$ 79,90 - Criador de páginas e agendamentos + 30 créditos de IA</li>
              <li className="text-slate-100"><strong>Escritório Pro:</strong> R$ 199,90 - Gestão de escritórios + 100 créditos de IA</li>
              <li className="text-slate-100"><strong>Boutique (Equipe):</strong> R$ 499,90 - Multi-usuários + 500 créditos de IA</li>
            </ul>
            <p className="text-xs text-slate-400 mt-2">Plano de aquisição e upgrade: créditos IA inclusos facilitam o onboarding e uso inicial das principais funcionalidades.</p>
            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="text-2xl font-bold text-cyan-400">R$ 3.15M</div>
              <div className="text-sm text-slate-200">~70% da receita Y2</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg p-8">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-2xl font-bold mb-3 text-white">Créditos de IA (Pay-as-you-go)</h3>
            <p className="text-slate-100 mb-4">Consumo adicional para heavy users</p>
            <ul className="space-y-2 text-sm text-slate-100">
              <li className="text-slate-100">• R$ 0,50 por peça processual gerada</li>
              <li className="text-slate-100">• R$ 0,10 por análise jurídica</li>
              <li className="text-slate-100">• R$ 0,05 por consulta ao RAG</li>
              <li className="text-slate-100">Pacotes com desconto até 20%</li>
            </ul>
            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="text-2xl font-bold text-purple-400">R$ 675K</div>
              <div className="text-sm text-slate-200">~15% da receita Y2</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-8">
            <div className="text-4xl mb-4">🎓</div>
            <h3 className="text-2xl font-bold mb-3 text-white">DireitoHub Flix Premium</h3>
            <p className="text-slate-100 mb-4">Certificação e conteúdo avançado</p>
            <ul className="space-y-2 text-sm text-slate-100">
              <li className="text-slate-100">• R$ 49,90/mês - Acesso completo</li>
              <li className="text-slate-100">• Certificação jurídica reconhecida</li>
              <li className="text-slate-100">• Conteúdo exclusivo + casos reais</li>
              <li className="text-slate-100">Atração cross-sell dos usuários base</li>
            </ul>
            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="text-2xl font-bold text-green-400">R$ 823K</div>
                <div className="text-sm text-slate-200">~15.6% da receita Y2</div>
            </div>
          </div>
        </div>

        {/* Comparativo de Planos */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h3 className="text-2xl font-bold mb-6 text-center text-white">Comparativo de Planos</h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 text-center">
              <div className="text-sm text-slate-400">Essencial</div>
              <div className="text-2xl font-bold text-white mt-2">R$ 19,90</div>
              <p className="text-sm text-slate-200 mt-2">Acesso a parceiros • Ideal para experimentar</p>
              <div className="mt-4 inline-block bg-slate-700 px-3 py-1 rounded-full text-sm text-slate-200">5 créditos IA</div>
              <ul className="text-sm text-slate-100 mt-4 space-y-1">
                <li>• Acesso a parceiros e conteúdos selecionados</li>
                
              </ul>
              <button className="mt-6 w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-md">Assinar</button>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 text-center">
              <div className="text-sm text-slate-400">Site Builder</div>
              <div className="text-2xl font-bold text-white mt-2">R$ 79,90</div>
              <p className="text-sm text-slate-200 mt-2">Criador de páginas + agendamentos</p>
              <div className="mt-4 inline-block bg-slate-700 px-3 py-1 rounded-full text-sm text-slate-200">30 créditos IA</div>
              <ul className="text-sm text-slate-100 mt-4 space-y-1">
                <li>• Páginas auto-geradas</li>
                <li>• Agendamento integrado</li>
                <li>• 30 créditos IA iniciais</li>
              </ul>
              <button className="mt-6 w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-md">Assinar</button>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 text-center">
              <div className="text-sm text-slate-400">Escritório Pro</div>
              <div className="text-2xl font-bold text-white mt-2">R$ 199,90</div>
              <p className="text-sm text-slate-200 mt-2">Gestão de escritórios • Usuários e permissões</p>
              <div className="mt-4 inline-block bg-slate-700 px-3 py-1 rounded-full text-sm text-slate-200">100 créditos IA</div>
              <ul className="text-sm text-slate-100 mt-4 space-y-1">
                <li>• Gestão multi-usuário</li>
                <li>• Relatórios e integrações</li>
                <li>• 100 créditos IA iniciais</li>
              </ul>
              <button className="mt-6 w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-md">Assinar</button>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 text-center">
              <div className="text-sm text-slate-400">Boutique (Equipe)</div>
              <div className="text-2xl font-bold text-white mt-2">R$ 499,90</div>
              <p className="text-sm text-slate-200 mt-2">Equipe completa • Gestão avançada</p>
              <div className="mt-4 inline-block bg-slate-700 px-3 py-1 rounded-full text-sm text-slate-200">500 créditos IA</div>
              <ul className="text-sm text-slate-100 mt-4 space-y-1">
                <li>• Contas por equipe e permissões</li>
                <li>• Suporte prioritário</li>
                <li>• 500 créditos IA iniciais</li>
              </ul>
              <button className="mt-6 w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-md">Assinar</button>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
          <h3 className="text-2xl font-bold mb-6 text-center text-white">Projeção de Mix de Receita - Ano 2</h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-bold mb-4 text-cyan-400">Breakdown por Stream</h4>
              <ul className="space-y-3">
                <li className="flex justify-between text-slate-100"><span>SaaS Recorrente</span> <span className="text-cyan-400 font-bold">R$ 3.78M (71.6%)</span></li>
                <li className="flex justify-between text-slate-100"><span>Créditos IA</span> <span className="text-purple-400 font-bold">R$ 675K (12.8%)</span></li>
                <li className="flex justify-between text-slate-100"><span>DireitoHub Flix Premium</span> <span className="text-green-400 font-bold">R$ 823K (15.6%)</span></li>
                <li className="flex justify-between border-t border-slate-600 pt-3 mt-3 text-lg font-bold text-white"><span>TOTAL</span> <span className="text-cyan-400">R$ 5.28M (100%)</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-cyan-400">Métricas por Stream</h4>
              <ul className="space-y-3 text-sm text-slate-100">
                <li><strong>1.800 usuários</strong> × R$ 175 avg MRR = R$ 3.78M (ARR)</li>
                <li><strong>180 heavy users</strong> × R$ 3.750 consumo/ano = R$ 675K</li>
                <li><strong>1.375 subscribers Flix</strong> × R$ 49,90 × 12 meses = R$ 823.35K</li>
                <li className="border-t border-slate-600 pt-3 mt-3"><strong>Mix recorrente:</strong> 100% (previsível e escalável)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FLUXO */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-700">
        <h2 className="text-4xl font-bold mb-12 text-center text-white">Como Funciona</h2>
        <div className="grid md:grid-cols-2 gap-12 mb-12 items-center">
          <motion.div
            className="order-2 md:order-1 relative group"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <img 
              src="/img/pitch-deck/AGENDE-SUA-CONSULTA.png"
              alt="Agende sua Consulta"
              className="w-full rounded-xl shadow-2xl shadow-blue-500/30"
            />
            <button
              onClick={() => setZoomedImage("/img/pitch-deck/AGENDE-SUA-CONSULTA.png")}
              className="absolute top-4 right-4 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ZoomIn size={20} />
            </button>
          </motion.div>
          <div className="order-1 md:order-2 grid grid-cols-2 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 text-center">
              <div className="text-4xl mb-4">1️⃣</div>
              <h4 className="font-bold mb-2 text-white">Cliente Agendar</h4>
              <p className="text-sm text-slate-100">Via página auto-gerada 24/7</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 text-center">
              <div className="text-4xl mb-4">2️⃣</div>
              <h4 className="font-bold mb-2 text-white">Advogado Preenche CRM</h4>
              <p className="text-sm text-slate-100">Partes, fatos, documentos</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 text-center">
              <div className="text-4xl mb-4">3️⃣</div>
              <h4 className="font-bold mb-2 text-white">JuriIA Gera Peça</h4>
              <p className="text-sm text-slate-100">Com RAG + contexto jurídico</p>
            </div>
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-6 text-center">
              <div className="text-4xl mb-4">✅</div>
              <h4 className="font-bold mb-2 text-white">Pronto para Protocolo</h4>
              <p className="text-sm text-green-400 font-bold">80% automação</p>
            </div>
          </div>
        </div>
      </section>

      {/* DADOS & NÚMEROS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-700" id="dados">
        <h2 className="text-4xl font-bold mb-12 text-center text-white">Mercado & Métricas</h2>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
            <div className="text-4xl font-bold text-blue-400 mb-2">R$ 90B</div>
            <h4 className="font-bold mb-2 text-white">TAM</h4>
            <p className="text-sm text-slate-100">Mercado total endereçável de software jurídico</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
            <div className="text-4xl font-bold text-cyan-400 mb-2">180K</div>
            <h4 className="font-bold mb-2 text-white">SAM</h4>
            <p className="text-sm text-slate-100">Advogados autônomos + pequenos escritórios</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
            <div className="text-4xl font-bold text-green-400 mb-2">1.2M</div>
            <h4 className="font-bold mb-2 text-white">Total</h4>
            <p className="text-sm text-slate-100">Advogados brasileiros na "cauda longa"</p>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 mb-12">
          <h3 className="text-2xl font-bold mb-6 text-white">Unit Economics</h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <div className="text-slate-200 text-sm mb-2">LTV / CAC</div>
              <div className="text-3xl font-bold text-green-400">10x</div>
              <p className="text-xs text-slate-200 mt-1">Eficiência de capital</p>
            </div>
            <div>
              <div className="text-slate-200 text-sm mb-2">Margem Bruta</div>
              <div className="text-3xl font-bold text-green-400">70%</div>
              <p className="text-xs text-slate-200 mt-1">Sustentável com custos de IA</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <h3 className="text-2xl font-bold p-8 pb-4 text-white">Projeção 5 Anos</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-700">
                  <th className="text-left py-3 px-4 font-bold text-white">Métrica</th>
                  <th className="text-center py-3 px-4 font-bold text-white">Ano 1</th>
                  <th className="text-center py-3 px-4 font-bold text-white">Ano 2</th>
                  <th className="text-center py-3 px-4 font-bold text-white">Ano 3</th>
                  <th className="text-center py-3 px-4 font-bold text-white">Ano 5</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                <tr className="hover:bg-slate-700/50">
                  <td className="py-3 px-4 text-white">Usuários</td>
                  <td className="text-center py-3 px-4 text-green-400 font-bold">450</td>
                  <td className="text-center py-3 px-4 text-green-400 font-bold">1.800</td>
                  <td className="text-center py-3 px-4 text-green-400 font-bold">5.500</td>
                  <td className="text-center py-3 px-4 text-green-400 font-bold">25.000</td>
                </tr>
                <tr className="hover:bg-slate-700/50">
                  <td className="py-3 px-4 text-white">Receita (ARR)</td>
                  <td className="text-center py-3 px-4 text-blue-400 font-bold">R$ 970K</td>
                  <td className="text-center py-3 px-4 text-blue-400 font-bold">R$ 5.28M</td>
                  <td className="text-center py-3 px-4 text-blue-400 font-bold">R$ 15M</td>
                  <td className="text-center py-3 px-4 text-blue-400 font-bold">R$ 81M</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ROADMAP */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-700">
        <h2 className="text-4xl font-bold mb-12 text-center text-white">Roadmap 2026</h2>
        <div className="grid md:grid-cols-4 gap-6">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
            <div className="text-sm font-bold text-blue-400 mb-2">Q1 2026</div>
            <h4 className="font-bold mb-3 text-white">MVP com RAG</h4>
            <p className="text-sm text-slate-100">Sistema core funcionando</p>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-6">
            <div className="text-sm font-bold text-purple-400 mb-2">Q2 2026</div>
            <h4 className="font-bold mb-3 text-white">Lançamento 5 Módulos</h4>
            <p className="text-sm text-slate-100">Plataforma completa ao mercado</p>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6">
            <div className="text-sm font-bold text-green-400 mb-2">Q3 2026</div>
            <h4 className="font-bold mb-3 text-white">Escala (Cauda Longa)</h4>
            <p className="text-sm text-slate-100">Crescimento agressivo de usuários</p>
          </div>
          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-6">
            <div className="text-sm font-bold text-cyan-400 mb-2">Q4 2026</div>
            <h4 className="font-bold mb-3 text-white">Breakeven</h4>
            <p className="text-sm text-slate-100">Operações autossuficientes</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <motion.section 
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-700" 
        id="cta"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <motion.div 
          className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-12 text-center shadow-2xl shadow-blue-600/20"
          initial={{ scale: 0.95 }}
          whileInView={{ scale: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          whileHover={{ scale: 1.02, boxShadow: "0 0 40px rgba(6, 182, 212, 0.4)" }}
        >
          <motion.h2 
            className="text-4xl font-bold mb-6 text-white"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            viewport={{ once: true }}
          >
            Vamos Falar Sobre o Futuro da Advocacia
          </motion.h2>
          <motion.p 
            className="text-lg text-blue-50 mb-8 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            viewport={{ once: true }}
          >
            Estamos construindo a plataforma completa que integra CRM, IA jurídica proprietária, agendamentos, gestão de processos e marketplace. Tudo com zero alucinação.
          </motion.p>
          <motion.div 
            className="grid md:grid-cols-3 gap-6 mb-8 max-w-2xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.1
                }
              }
            }}
          >
            <motion.div 
              className="bg-white/15 backdrop-blur rounded-lg p-4 hover:bg-white/25 transition-all duration-300 border border-white/20"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 }
              }}
              whileHover={{ scale: 1.05, y: -3 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div 
                className="text-3xl mb-2"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                💰
              </motion.div>
              <p className="font-bold text-white">SaaS Recorrente</p>
            </motion.div>
            <motion.div 
              className="bg-white/15 backdrop-blur rounded-lg p-4 hover:bg-white/25 transition-all duration-300 border border-white/20"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 }
              }}
              whileHover={{ scale: 1.05, y: -3 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div 
                className="text-3xl mb-2"
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                🔐
              </motion.div>
              <p className="font-bold text-white">Tecnologia Proprietária</p>
            </motion.div>
            <motion.div 
              className="bg-white/15 backdrop-blur rounded-lg p-4 hover:bg-white/25 transition-all duration-300 border border-white/20"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 }
              }}
              whileHover={{ scale: 1.05, y: -3 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div 
                className="text-3xl mb-2"
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                📈
              </motion.div>
              <p className="font-bold text-white">Mercado Gigante</p>
            </motion.div>
          </motion.div>
          <motion.div 
            className="flex gap-4 justify-center flex-wrap"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            viewport={{ once: true }}
          >
            <motion.button 
              onClick={handleScheduleMeeting}
              className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-3 rounded-lg font-bold transition shadow-lg"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              Agendar Reunião
            </motion.button>
            <motion.button 
              onClick={() => setShowDemoModal(true)}
              className="border-2 border-white text-white hover:bg-white/20 px-8 py-3 rounded-lg font-bold transition backdrop-blur"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              Ver Demo
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* MODAL DEMO */}
      {showDemoModal && selectedPrompt && (
        <motion.div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div 
            className="bg-white rounded-2xl w-full max-w-4xl h-[700px] flex flex-col border border-gray-200 shadow-2xl"
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">JuriIA Demo</h3>
                  <p className="text-sm text-slate-200">{selectedPrompt.name}</p>
                </div>
              </div>
              <motion.button 
                onClick={handleCloseDemoModal}
                className="text-slate-300 hover:text-slate-100 transition"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Chat Interface */}
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-white">Carregando assistente...</p>
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
          </motion.div>
        </motion.div>

    
      )}

      {/* FOOTER */}
      <motion.footer 
        className="border-t border-slate-700 py-12 bg-gradient-to-b from-slate-900 to-slate-950"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-200 text-sm">
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            &copy; 2026 DireitoHub by BIPETech. Todos os direitos reservados.
          </motion.p>
        </div>
      </motion.footer>
    </div>
    </div>
  );
};

export default PitchDeck;
