import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { appointmentService } from '../firebase/firestore';
import PaymentModal from './PaymentModal';
import AppointmentChat from './AppointmentChat';

const ClientAppointments = () => {
  const { user, userData } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todos'); // todos, pendente, confirmado, cancelado
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  // Carregar agendamentos
  useEffect(() => {
    if (user && userData?.userType === 'cliente') {
      loadAppointments();
    }
  }, [user, userData]);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const result = await appointmentService.getAppointmentsByClient(user.uid);
      if (result.success) {
        setAppointments(result.data);
      } else {
        console.error('Erro ao carregar agendamentos:', result.error);
      }
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar agendamentos
  const filteredAppointments = appointments.filter(appointment => {
    if (filter === 'todos') return true;
    return appointment.status === filter;
  });

  // Contar agendamentos por status
  const appointmentCounts = {
    todos: appointments.length,
    pendente: appointments.filter(a => a.status === 'pendente').length,
    aguardando_pagamento: appointments.filter(a => a.status === 'aguardando_pagamento').length,
    pago: appointments.filter(a => a.status === 'pago').length,
    confirmado: appointments.filter(a => a.status === 'confirmado').length,
    cancelado: appointments.filter(a => a.status === 'cancelado').length,
    finalizado: appointments.filter(a => a.status === 'finalizado').length,
    concluido: appointments.filter(a => a.status === 'concluido').length
  };

  // Abrir modal de pagamento
  const openPaymentModal = (appointment) => {
    setSelectedAppointment(appointment);
    setShowPaymentModal(true);
  };

  // Fechar modal de pagamento
  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedAppointment(null);
  };

  // Callback quando pagamento for bem-sucedido
  const handlePaymentSuccess = () => {
    loadAppointments(); // Recarregar lista
  };

  // Gerar evento para agenda
  const generateCalendarEvent = async (appointment) => {
    try {
      const result = await appointmentService.generateCalendarEvent(appointment.id);
      if (result.success) {
        const event = result.data;
        
        // Criar URL para adicionar ao Google Calendar
        const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${event.startDate.replace(/[-:]/g, '').replace('.000Z', 'Z')}/${event.endDate.replace(/[-:]/g, '').replace('.000Z', 'Z')}&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(event.location)}`;
        
        // Criar arquivo .ics para outras agendas
        const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//DireitoHub//Calendar//PT
BEGIN:VEVENT
UID:${appointment.id}@direitohub.com
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:${event.startDate.replace(/[-:]/g, '').replace('.000Z', 'Z')}
DTEND:${event.endDate.replace(/[-:]/g, '').replace('.000Z', 'Z')}
SUMMARY:${event.title}
DESCRIPTION:${event.description}
LOCATION:${event.location}
URL:${event.url || ''}
END:VEVENT
END:VCALENDAR`;

        // Oferecer opções de agenda
        const choice = confirm('Escolha como adicionar à agenda:\n\nOK = Google Calendar\nCancelar = Baixar arquivo .ics para outras agendas');
        
        if (choice) {
          // Abrir Google Calendar
          window.open(googleCalendarUrl, '_blank');
        } else {
          // Baixar arquivo .ics
          const blob = new Blob([icsContent], { type: 'text/calendar' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `consulta-${appointment.id}.ics`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } else {
        alert('Erro ao gerar evento de agenda: ' + result.error);
      }
    } catch (error) {
      console.error('Erro ao gerar evento de agenda:', error);
      alert('Erro ao gerar evento de agenda.');
    }
  };

  // Cancelar agendamento
  const handleCancelAppointment = async (appointmentId) => {
    if (!confirm('Tem certeza que deseja cancelar este agendamento?')) {
      return;
    }

    try {
      const result = await appointmentService.cancelAppointment(appointmentId, 'Cancelado pelo cliente');
      if (result.success) {
        await loadAppointments();
        alert('Agendamento cancelado com sucesso.');
      } else {
        alert('Erro ao cancelar agendamento: ' + result.error);
      }
    } catch (error) {
      console.error('Erro ao cancelar agendamento:', error);
      alert('Erro ao cancelar agendamento.');
    }
  };

  // Finalizar consulta
  const handleFinalizeAppointment = async (appointmentId) => {
    const confirmed = window.confirm(
      'Tem certeza que deseja marcar esta consulta como realizada?\n\n' +
      'Esta ação confirmará que a consulta foi realizada com sucesso e encerrará definitivamente o agendamento.'
    );
    
    if (!confirmed) return;

    try {
      const result = await appointmentService.finalizeAppointment(appointmentId, 'cliente');
      if (result.success) {
        await loadAppointments();
        alert('Consulta marcada como realizada com sucesso!');
      } else {
        alert('Erro ao finalizar consulta: ' + result.error);
      }
    } catch (error) {
      console.error('Erro ao finalizar consulta:', error);
      alert('Erro ao finalizar consulta.');
    }
  };

  // Formatação
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

  const formatDateTime = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'aguardando_pagamento':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'pago':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'confirmado':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelado':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'finalizado':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'concluido':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pendente':
        return 'Aguardando Aprovação';
      case 'aguardando_pagamento':
        return 'Aguardando Pagamento';
      case 'pago':
        return 'Pago - Aguardando Consulta';
      case 'confirmado':
        return 'Confirmado';
      case 'cancelado':
        return 'Cancelado';
      case 'finalizado':
        return 'Consulta Realizada';
      case 'concluido':
        return 'Concluído';
      default:
        return status;
    }
  };

  const getStatusDescription = (status) => {
    switch (status) {
      case 'pendente':
        return 'O advogado ainda não respondeu à sua solicitação';
      case 'aguardando_pagamento':
        return 'Agendamento aprovado! Efetue o pagamento para confirmar';
      case 'pago':
        return 'Pagamento confirmado! Aguarde a data da consulta';
      case 'confirmado':
        return 'Agendamento confirmado pelo advogado';
      case 'cancelado':
        return 'Agendamento foi cancelado';
      case 'finalizado':
        return 'Consulta foi realizada com sucesso';
      case 'concluido':
        return 'Consulta foi realizada';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando seus agendamentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Meus Agendamentos</h1>
          <p className="text-gray-600 mt-2">Acompanhe suas consultas jurídicas agendadas</p>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-8">
          {[
            { key: 'todos', label: 'Total', icon: '📊', color: 'blue' },
            { key: 'pendente', label: 'Aguardando', icon: '⏳', color: 'yellow' },
            { key: 'aguardando_pagamento', label: 'Pagar', icon: '💳', color: 'orange' },
            { key: 'pago', label: 'Pagos', icon: '💰', color: 'green' },
            { key: 'confirmado', label: 'Confirmados', icon: '✅', color: 'blue' },
            { key: 'finalizado', label: 'Finalizados', icon: '🎯', color: 'purple' },
            { key: 'cancelado', label: 'Cancelados', icon: '❌', color: 'red' }
          ].map(({ key, label, icon, color }) => (
            <div
              key={key}
              onClick={() => setFilter(key)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                filter === key
                  ? `border-${color}-500 bg-${color}-50`
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-1">{icon}</div>
                <div className="text-2xl font-bold text-gray-900">{appointmentCounts[key]}</div>
                <div className="text-sm text-gray-600">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Lista de Agendamentos */}
        <div className="space-y-6">
          {filteredAppointments.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <div className="text-gray-400 text-6xl mb-4">📅</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum agendamento encontrado
              </h3>
              <p className="text-gray-600">
                {filter === 'todos' 
                  ? 'Você ainda não fez nenhum agendamento. Procure por advogados e agende sua consulta!'
                  : `Não há agendamentos com status "${getStatusText(filter)}".`
                }
              </p>
            </div>
          ) : (
            filteredAppointments.map((appointment) => (
              <div key={appointment.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Header do Card */}
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Consulta com {appointment.lawyerName}
                      </h3>
                      <p className="text-sm text-gray-600">{appointment.lawyerEmail}</p>
                    </div>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(appointment.status)}`}>
                      {getStatusText(appointment.status)}
                    </span>
                  </div>
                </div>

                {/* Conteúdo do Card */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Informações da Consulta */}
                    <div className="space-y-4">
                      <div className="flex items-center text-gray-600">
                        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m0 4v10a1 1 0 01-1 1H9a1 1 0 01-1-1V11a1 1 0 011-1h6a1 1 0 011 1z" />
                        </svg>
                        <div>
                          <p className="font-medium">Data e Horário</p>
                          <p className="text-sm">{formatDateTime(appointment.appointmentDate)}</p>
                        </div>
                      </div>

                      <div className="flex items-center text-gray-600">
                        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                        <div>
                          <p className="font-medium">Valor</p>
                          <p className="text-sm">{formatPrice(appointment.proposedPrice)}</p>
                        </div>
                      </div>

                      <div className="flex items-start text-gray-600">
                        <svg className="w-5 h-5 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="font-medium">Status</p>
                          <p className="text-sm">{getStatusDescription(appointment.status)}</p>
                        </div>
                      </div>

                      {/* Página de Origem */}
                      {appointment.paginaOrigem && (
                        <div className="flex items-start text-gray-600">
                          <svg className="w-5 h-5 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                          </svg>
                          <div className="flex-1">
                            <p className="font-medium">Página de Origem</p>
                            <p className="text-sm">
                              {appointment.paginaOrigem.nomePagina} 
                              <span className="text-gray-500 ml-1">
                                ({appointment.paginaOrigem.tipoPagina === 'escritorio' ? 'Escritório de Advocacia' : 'Página de Advogado'})
                              </span>
                            </p>
                            {appointment.paginaOrigem.slug && (
                              <div className="flex items-center gap-2 mt-2">
                                <p className="text-xs text-gray-500">
                                  /{appointment.paginaOrigem.slug}
                                </p>
                                <a
                                  href={`/advogado/${appointment.paginaOrigem.slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                                >
                                  Acessar
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Descrição do Caso */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Descrição do Caso</h4>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-700">{appointment.caseDescription}</p>
                      </div>
                    </div>
                  </div>

                  {/* Chat de Mensagens */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-3">Comunicação</h4>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 overflow-hidden">
                      <AppointmentChat 
                        appointmentId={appointment.id}
                        lawyerName={appointment.lawyerName}
                        clientName={userData?.name || 'Você'}
                      />
                    </div>
                  </div>

                  {/* Informações Adicionais por Status */}
                  {appointment.status === 'pendente' && (
                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <div>
                          <h4 className="font-medium text-yellow-800">Aguardando Resposta</h4>
                          <p className="text-sm text-yellow-700 mt-1">
                            Sua solicitação foi enviada para o advogado. Você receberá uma notificação quando ele responder.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {appointment.status === 'aguardando_pagamento' && (
                    <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-orange-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                        <div>
                          <h4 className="font-medium text-orange-800">Pagamento Necessário</h4>
                          <p className="text-sm text-orange-700 mt-1">
                            O advogado aprovou sua consulta! Efetue o pagamento para confirmar o agendamento.
                          </p>
                          {appointment.finalPrice && (
                            <p className="text-sm font-semibold text-orange-800 mt-2">
                              Valor final: R$ {parseFloat(appointment.finalPrice).toFixed(2).replace('.', ',')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {appointment.status === 'pago' && (
                    <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-green-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <h4 className="font-medium text-green-800">Pagamento Confirmado!</h4>
                          <p className="text-sm text-green-700 mt-1">
                            Sua consulta está confirmada! Acesse o link da chamada no horário agendado.
                          </p>
                          {appointment.videoCallLink && (
                            <div className="mt-3">
                              <a
                                href={appointment.videoCallLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                Acessar Chamada de Vídeo
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {appointment.status === 'finalizado' && (
                    <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-purple-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <h4 className="font-medium text-purple-800">Consulta Realizada</h4>
                          <p className="text-sm text-purple-700 mt-1">
                            A consulta foi finalizada com sucesso. Obrigado por usar nossos serviços!
                          </p>
                          {appointment.finalizedAt && (
                            <p className="text-xs text-purple-600 mt-2">
                              Finalizada em: {new Date(appointment.finalizedAt.seconds * 1000).toLocaleString('pt-BR')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {appointment.status === 'cancelado' && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-red-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <div>
                          <h4 className="font-medium text-red-800">Agendamento Cancelado</h4>
                          <p className="text-sm text-red-700 mt-1">
                            {appointment.cancelReason || 'Este agendamento foi cancelado.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Ações */}
                  <div className="mt-6 flex flex-wrap gap-3">
                    {appointment.status === 'pendente' && (
                      <button
                        onClick={() => handleCancelAppointment(appointment.id)}
                        className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        Cancelar Agendamento
                      </button>
                    )}
                    
                    {appointment.status === 'aguardando_pagamento' && (
                      <>
                        <button
                          onClick={() => openPaymentModal(appointment)}
                          className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
                        >
                          Efetuar Pagamento
                        </button>
                        <button
                          onClick={() => handleCancelAppointment(appointment.id)}
                          className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          Cancelar
                        </button>
                      </>
                    )}
                    
                    {(appointment.status === 'pago' || appointment.status === 'confirmado') && (
                      <div className="flex flex-wrap gap-3">
                        {appointment.videoCallLink && (
                          <a
                            href={appointment.videoCallLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Entrar na Chamada
                          </a>
                        )}
                        <button
                          onClick={() => generateCalendarEvent(appointment)}
                          className="px-4 py-2 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          Adicionar à Agenda
                        </button>
                        <button
                          onClick={() => handleFinalizeAppointment(appointment.id)}
                          className="px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                        >
                          Consulta Realizada
                        </button>
                        <button
                          onClick={() => window.open(`mailto:${appointment.lawyerEmail}`, '_blank')}
                          className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          Contatar Advogado
                        </button>
                        <button
                          onClick={() => handleCancelAppointment(appointment.id)}
                          className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}

                    {appointment.status === 'finalizado' && (
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => generateCalendarEvent(appointment)}
                          className="px-4 py-2 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          Baixar Comprovante
                        </button>
                        <button
                          onClick={() => window.open(`mailto:${appointment.lawyerEmail}`, '_blank')}
                          className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          Contatar Advogado
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Informações da Solicitação */}
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Solicitação enviada em {formatDateTime(appointment.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal de Pagamento */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={closePaymentModal}
        appointment={selectedAppointment}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
};

export default ClientAppointments;
