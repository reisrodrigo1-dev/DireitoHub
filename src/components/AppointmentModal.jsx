import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { appointmentService, userService, collaborationService } from '../firebase/firestore';
import InlineAuthForm from './InlineAuthForm';

const AppointmentModal = ({ isOpen, onClose, lawyerData, selectedDate, selectedTime }) => {
  // Para páginas do tipo escritório, buscar advogados colaboradores
  const [collaborators, setCollaborators] = useState([]);
  const [selectedLawyerId, setSelectedLawyerId] = useState('');
  const { user, userData, isAuthenticated } = useAuth();
  const [showLoginMessage, setShowLoginMessage] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [caseDescription, setCaseDescription] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [acceptedPrice, setAcceptedPrice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Login check, 2: Case details, 3: Price acceptance, 4: Confirmation
  
  useEffect(() => {
    if (isOpen && lawyerData?.tipoPagina === 'escritorio' && lawyerData?.id) {
      // Buscar colaboradores advogados da página escritório
      const fetchCollaborators = async () => {
        try {
          const result = await collaborationService.getOwnedCollaborations(lawyerData.userId);
          if (result.success) {
            // Filtrar só advogados desta página
            const lawyers = result.data.filter(
              c => c.pageId === lawyerData.id && c.role === 'lawyer' && c.collaboratorData
            );
            setCollaborators(lawyers);
          } else {
            setCollaborators([]);
          }
        } catch {
          setCollaborators([]);
        }
      };
      fetchCollaborators();
    } else {
      setCollaborators([]);
    }
  }, [isOpen, lawyerData]);

  if (!isOpen) return null;

  // Verificar se é cliente
  const isClient = isAuthenticated && userData?.userType === 'cliente';
  console.log('=== DEBUG AppointmentModal ===');
  console.log('lawyerData:', lawyerData);
  console.log('Página de origem que será salva:', {
    id: lawyerData?.id,
    nomePagina: lawyerData?.nomePagina || lawyerData?.nomeAdvogado,
    tipoPagina: lawyerData?.tipoPagina || 'advogado',
    slug: lawyerData?.slug
  });
  console.log('===========================');

  // Função para definir usuário como cliente
  const handleSetAsClient = async () => {
    if (!user) return;
    
    try {
      const result = await userService.updateUser(user.uid, {
        userType: 'cliente',
        name: userData?.name || user.displayName || 'Cliente',
        email: user.email
      });
      
      if (result.success) {
        alert('Usuário definido como cliente. Tente novamente.');
        window.location.reload(); // Recarregar para atualizar contexto
      } else {
        alert('Erro ao definir tipo de usuário: ' + result.error);
      }
    } catch (error) {
      console.error('Erro ao definir usuário como cliente:', error);
      alert('Erro ao definir tipo de usuário.');
    }
  };

  // Função para verificar login
  const handleLoginCheck = () => {
    console.log('Debug - Estado de autenticação:', {
      isAuthenticated,
      user: user ? { uid: user.uid, email: user.email } : null,
      userData,
      userType: userData?.userType
    });
    
    if (!isAuthenticated) {
      console.log('Usuário não autenticado');
      setShowLoginMessage(true);
      return;
    }
    
    if (userData?.userType !== 'cliente') {
      console.log('Usuário não é cliente:', userData?.userType);
      alert(`Apenas clientes podem agendar consultas. Seu tipo de usuário atual: ${userData?.userType || 'não definido'}. Por favor, faça login como cliente.`);
      return;
    }
    
    console.log('Usuário verificado como cliente, indo para step 2');
    setStep(2);
  };

  // Função para continuar para preço
  const handleContinueToPrice = () => {
    if (caseDescription.trim().length < 20) {
      alert('Por favor, forneça uma descrição mais detalhada do seu caso (mínimo 20 caracteres).');
      return;
    }
    
    if (!whatsappNumber.trim()) {
      alert('O número do WhatsApp é obrigatório para contato.');
      return;
    }
    
    // Validar formato do WhatsApp (apenas números e deve ter entre 10-11 dígitos)
    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    if (cleanNumber.length < 10 || cleanNumber.length > 11) {
      alert('Por favor, insira um número de WhatsApp válido (10 ou 11 dígitos).');
      return;
    }
    
    setStep(3);
  };

  // Função para criar agendamento
  const handleCreateAppointment = async () => {
    if (!acceptedPrice) {
      alert('Você precisa aceitar o valor da consulta para prosseguir.');
      return;
    }

    setLoading(true);
    
    try {
      // Se for escritório e um advogado foi selecionado, atribuir
      let assignedLawyerId = null;
      let assignedLawyerName = null;
      if (lawyerData?.tipoPagina === 'escritorio' && selectedLawyerId) {
        const selectedLawyer = collaborators.find(c => c.collaboratorData?.uid === selectedLawyerId);
        assignedLawyerId = selectedLawyerId;
        assignedLawyerName = selectedLawyer?.collaboratorData?.name || '';
      }
      const appointmentData = {
        lawyerUserId: lawyerData.userId,
        lawyerName: lawyerData.nomeAdvogado,
        lawyerEmail: lawyerData.email,
        clientUserId: user.uid,
        clientName: userData.name,
        clientEmail: userData.email,
        clientWhatsapp: whatsappNumber.trim(),
        appointmentDate: new Date(`${selectedDate}T${selectedTime}:00`),
        caseDescription: caseDescription.trim(),
        proposedPrice: lawyerData.valorConsulta,
        status: 'pendente',
        selectedPageId: lawyerData.id,
        paginaOrigem: {
          id: lawyerData.id,
          nomePagina: lawyerData.nomePagina || lawyerData.nomeAdvogado,
          tipoPagina: lawyerData.tipoPagina || 'advogado',
          slug: lawyerData.slug
        },
        assignedLawyerId,
        assignedLawyerName
      };

      console.log('📝 Criando agendamento com dados:', appointmentData);
      const result = await appointmentService.createAppointment(appointmentData);
      if (result.success) {
        console.log('✅ Agendamento criado com sucesso! ID:', result.id);
        setStep(4);
      } else {
        alert('Erro ao criar agendamento: ' + result.error);
      }
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      alert('Erro ao criar agendamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Função para fechar modal
  const handleClose = () => {
    setStep(1);
    setCaseDescription('');
    setWhatsappNumber('');
    setAcceptedPrice(false);
    setShowLoginMessage(false);
    onClose();
  };

  // Função para ir para login
  const handleGoToLogin = () => {
    setShowAuthForm(true);
  };

  const handleAuthSuccess = () => {
    // Auth bem sucedida, fechar form e recarregar para atualizar contexto
    setShowAuthForm(false);
    window.location.reload();
  };

  // Formatação de valores
  const formatPrice = (price) => {
    if (!price) return '';
    if (price.minimo && price.maximo) {
      return `R$ ${parseFloat(price.minimo).toFixed(2).replace('.', ',')} - R$ ${parseFloat(price.maximo).toFixed(2).replace('.', ',')}`;
    }
    if (price.minimo) {
      return `A partir de R$ ${parseFloat(price.minimo).toFixed(2).replace('.', ',')}`;
    }
    if (price.maximo) {
      return `Até R$ ${parseFloat(price.maximo).toFixed(2).replace('.', ',')}`;
    }
    return 'Valor a combinar';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Agendar Consulta
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Se for escritório, mostrar seleção de advogado */}
          {lawyerData?.tipoPagina === 'escritorio' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Escolha o advogado responsável pelo atendimento</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={selectedLawyerId}
                onChange={e => setSelectedLawyerId(e.target.value)}
              >
                <option value="">Selecione um advogado</option>
                {collaborators.map(c => (
                  <option key={c.collaboratorData.uid} value={c.collaboratorData.uid}>
                    {c.collaboratorData.name} ({c.collaboratorData.email})
                  </option>
                ))}
              </select>
            </div>
          )}
          {/* Debug Info - remover em produção */}
          <div className="bg-gray-100 p-3 rounded mb-4 text-xs">
            <strong>Debug:</strong> 
            <br />Autenticado: {isAuthenticated ? 'Sim' : 'Não'}
            <br />User ID: {user?.uid || 'N/A'}
            <br />Email: {user?.email || 'N/A'}
            <br />UserData: {userData ? JSON.stringify(userData, null, 2) : 'Não carregado'}
            <br />Tipo de Usuário: {userData?.userType || 'Não definido'}
            <br />É Cliente: {isClient ? 'Sim' : 'Não'}
            
            {/* Botão para definir como cliente se não estiver definido */}
            {isAuthenticated && userData?.userType !== 'cliente' && (
              <div className="mt-2">
                <button
                  onClick={handleSetAsClient}
                  className="bg-blue-500 text-white px-3 py-1 rounded text-xs"
                >
                  Definir como Cliente
                </button>
              </div>
            )}
          </div>

          {/* Informações da consulta */}
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Detalhes da Consulta</h3>
            <div className="space-y-1 text-sm text-blue-800">
              <p><strong>Advogado:</strong> {lawyerData.nomeAdvogado}</p>
              <p><strong>Data:</strong> {new Date(selectedDate).toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                day: '2-digit', 
                month: 'long', 
                year: 'numeric' 
              })}</p>
              <p><strong>Horário:</strong> {selectedTime}</p>
              <p><strong>Valor:</strong> {formatPrice(lawyerData.valorConsulta)}</p>
            </div>
          </div>

          {/* Step 1: Login Check */}
          {step === 1 && (
            <div className="text-center">
              {showAuthForm ? (
                <InlineAuthForm 
                  onAuthSuccess={handleAuthSuccess}
                  onClose={() => setShowAuthForm(false)}
                />
              ) : isClient ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-center mb-3">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-green-800 mb-1">Bem-vindo!</h3>
                    <p className="text-green-700 mb-3">
                      ✓ Você está logado como <strong>{userData?.name || userData?.email}</strong>
                    </p>
                    <div className="space-y-3">
                      <button
                        onClick={handleLoginCheck}
                        className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        Continuar com Agendamento
                      </button>
                      <a
                        href="/dashboard-cliente"
                        className="w-full block bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                      >
                        Ir para Dashboard
                      </a>
                      <button
                        onClick={handleClose}
                        className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              ) : showLoginMessage ? (
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center justify-center mb-3">
                      <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-yellow-800 mb-2">Login Necessário</h3>
                    <p className="text-yellow-700 mb-4">
                      Para agendar uma consulta, você precisa estar logado como cliente.
                    </p>
                    <div className="space-y-3">
                      <button
                        onClick={handleGoToLogin}
                        className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        Fazer Login / Criar Conta
                      </button>
                      <button
                        onClick={handleClose}
                        className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-center mb-3">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m0 4v10a1 1 0 01-1 1H9a1 1 0 01-1-1V11a1 1 0 011-1h6a1 1 0 011 1z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-green-800 mb-2">Pronto para Agendar</h3>
                    <p className="text-green-700 mb-4">
                      Vamos iniciar o processo de agendamento da sua consulta.
                    </p>
                    <button
                      onClick={handleLoginCheck}
                      className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Case Description */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Descreva seu Caso</h3>
                <p className="text-gray-600 mb-4">
                  Para que o advogado possa se preparar adequadamente para a consulta, 
                  descreva brevemente seu caso ou a situação jurídica que precisa de orientação.
                </p>
                <textarea
                  value={caseDescription}
                  onChange={(e) => setCaseDescription(e.target.value)}
                  placeholder="Ex: Preciso de orientação sobre um contrato de trabalho, tenho dúvidas sobre meus direitos em uma rescisão..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={6}
                  maxLength={1000}
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-500">
                    Mínimo 20 caracteres
                  </span>
                  <span className="text-sm text-gray-400">
                    {caseDescription.length}/1000
                  </span>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">WhatsApp para Contato</h3>
                <p className="text-gray-600 mb-4">
                  Informe seu número do WhatsApp para que o advogado possa entrar em contato caso necessário.
                </p>
                <input
                  type="tel"
                  value={whatsappNumber}
                  onChange={(e) => {
                    // Permitir apenas números, parênteses, espaços e hífen
                    const value = e.target.value.replace(/[^\d\s\-\(\)]/g, '');
                    setWhatsappNumber(value);
                  }}
                  placeholder="Ex: (11) 99999-9999"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={15}
                />
                <p className="text-sm text-gray-500 mt-2">
                  Formato: (XX) XXXXX-XXXX ou apenas números
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={handleContinueToPrice}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                  disabled={caseDescription.trim().length < 20 || !whatsappNumber.trim()}
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Price Acceptance */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Valor da Consulta</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 mb-2">
                      {formatPrice(lawyerData.valorConsulta)}
                    </div>
                    <p className="text-gray-600 text-sm">
                      O valor final será confirmado pelo advogado antes da consulta
                    </p>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-blue-800">
                      <h4 className="font-semibold mb-1">Como funciona:</h4>
                      <ul className="space-y-1">
                        <li>• Sua solicitação será enviada ao advogado</li>
                        <li>• O advogado analisará seu caso e confirmará o valor</li>
                        <li>• Você receberá uma confirmação com o valor final</li>
                        <li>• A consulta só é confirmada após sua aprovação</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedPrice}
                    onChange={(e) => setAcceptedPrice(e.target.checked)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                  />
                  <span className="text-gray-700">
                    Aceito o valor apresentado e entendo que o valor final será confirmado pelo advogado
                  </span>
                </label>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={handleCreateAppointment}
                  disabled={!acceptedPrice || loading}
                  className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Agendando...' : 'Confirmar Agendamento'}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 4 && (
            <div className="text-center space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-green-800 mb-2">
                  Agendamento Solicitado com Sucesso!
                </h3>
                <p className="text-green-700 mb-4">
                  Sua solicitação de consulta foi enviada para {lawyerData.nomeAdvogado}.
                </p>
                
                <div className="bg-white border border-green-200 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-green-800 mb-2">Próximos Passos:</h4>
                  <ul className="text-left text-green-700 space-y-1 text-sm">
                    <li>• O advogado analisará sua solicitação</li>
                    <li>• Você receberá uma confirmação por email</li>
                    <li>• O valor final será confirmado antes da consulta</li>
                    <li>• Acompanhe o status no seu painel de cliente</li>
                  </ul>
                </div>
                
                <button
                  onClick={handleClose}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Ir para Meus Agendamentos
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppointmentModal;
