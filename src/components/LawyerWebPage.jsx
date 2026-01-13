import React, { useState, useEffect } from 'react';
import AppointmentModal from './AppointmentModal';
import { appointmentService } from '../firebase/firestore';

const LawyerWebPage = ({ lawyerData, isPreview = false }) => {
  const [appointmentModal, setAppointmentModal] = useState({
    isOpen: false,
    selectedDate: null,
    selectedTime: null
  });
  const [occupiedSlots, setOccupiedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(true);

  // Carregar agendamentos ocupados quando a página carregar
  useEffect(() => {
    if (lawyerData?.userId && !isPreview) {
      loadOccupiedSlots();
    } else {
      setLoadingSlots(false);
    }
  }, [lawyerData?.userId, isPreview]);

  // Função para carregar horários ocupados
  const loadOccupiedSlots = async () => {
    try {
      setLoadingSlots(true);
      const result = await appointmentService.getPublicAppointmentsByLawyer(lawyerData.userId);
      
      if (result.success) {
        // Filtrar apenas agendamentos pendentes e pagos (que devem bloquear horários)
        const activeAppointments = result.data.filter(appointment => 
          appointment.status === 'pendente' || 
          appointment.status === 'aguardando_pagamento' || 
          appointment.status === 'pago' ||
          appointment.status === 'confirmado'
        );

        // Converter para formato de slots ocupados
        const slots = activeAppointments.map(appointment => {
          try {
            let date;
            
            // Se for um Firestore Timestamp
            if (appointment.appointmentDate && typeof appointment.appointmentDate.toDate === 'function') {
              date = appointment.appointmentDate.toDate();
            } else {
              // Se for uma string ou Date object
              date = new Date(appointment.appointmentDate);
            }
            
            // Verificar se a data é válida
            if (isNaN(date.getTime())) {
              console.error('Data inválida no agendamento:', appointment.id);
              return null;
            }
            
            return {
              date: date.toISOString().split('T')[0], // YYYY-MM-DD
              time: date.toTimeString().substring(0, 5), // HH:MM
              appointmentId: appointment.id,
              status: appointment.status,
              clientName: appointment.clientName
            };
          } catch (error) {
            console.error('Erro ao processar data do agendamento:', appointment.id, error);
            return null;
          }
        }).filter(slot => slot !== null); // Remover slots inválidos

        setOccupiedSlots(slots);
      }
    } catch (error) {
      console.error('Erro ao carregar horários ocupados:', error);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Verificar se um horário específico está ocupado
  const isSlotOccupied = (date, time) => {
    const dateStr = date.toISOString().split('T')[0];
    return occupiedSlots.some(slot => 
      slot.date === dateStr && slot.time === time
    );
  };

  // Obter informações do agendamento ocupado
  const getOccupiedSlotInfo = (date, time) => {
    const dateStr = date.toISOString().split('T')[0];
    return occupiedSlots.find(slot => 
      slot.date === dateStr && slot.time === time
    );
  };
  
  if (!lawyerData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Página não encontrada</h2>
          <p className="text-gray-600 mt-2">Esta página do advogado não existe ou foi removida.</p>
        </div>
      </div>
    );
  }

  const {
    tipoPagina,
    nomePagina,
    nomeAdvogado,
    nomeEscritorio,
    cnpj,
    oab,
    telefone,
    email,
    endereco,
    areasAtuacao,
    biografia,
    experiencia,
    formacao,
    especialidades,
    valorConsulta,
    corTema,
    redesSociais,
    agenda
  } = lawyerData;

  // Determinar o nome principal baseado no tipo
  const nomeExibicao = tipoPagina === 'escritorio' ? nomeEscritorio : nomeAdvogado;
  const isEscritorio = tipoPagina === 'escritorio';

  const formatPhone = (phone) => {
    return phone?.replace(/\D/g, '').replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const getWhatsAppLink = (phone) => {
    const cleanPhone = phone?.replace(/\D/g, '');
    return `https://wa.me/55${cleanPhone}`;
  };

  const getImageSrc = (imageData) => {
    if (!imageData) return null;
    
    // Se já é uma string (base64 ou URL), retorna diretamente
    if (typeof imageData === 'string') {
      return imageData;
    }
    
    // Se é um File object (para preview), cria URL
    if (imageData instanceof File) {
      return URL.createObjectURL(imageData);
    }
    
    return null;
  };

  const enderecoCompleto = endereco ? 
    `${endereco.rua}${endereco.numero ? ', ' + endereco.numero : ''}${endereco.bairro ? ', ' + endereco.bairro : ''}, ${endereco.cidade}/${endereco.estado}` : 
    '';

  // Funções para sistema de agendamento
  const diasSemana = {
    segunda: 'Segunda-feira',
    terca: 'Terça-feira', 
    quarta: 'Quarta-feira',
    quinta: 'Quinta-feira',
    sexta: 'Sexta-feira',
    sabado: 'Sábado',
    domingo: 'Domingo'
  };

  const diasSemanaIndex = {
    0: 'domingo',
    1: 'segunda',
    2: 'terca',
    3: 'quarta',
    4: 'quinta',
    5: 'sexta',
    6: 'sabado'
  };

  const getProximosDias = (numDias = 14) => {
    const dias = [];
    const hoje = new Date();
    
    for (let i = 0; i < numDias; i++) {
      const data = new Date(hoje);
      data.setDate(hoje.getDate() + i);
      dias.push(data);
    }
    
    return dias;
  };

  // Obter todos os horários (disponíveis e ocupados) para mostrar na interface
  const getTodosHorarios = (data) => {
    if (!agenda) return { disponiveis: [], ocupados: [] };
    
    const diaSemana = diasSemanaIndex[data.getDay()];
    const configDia = agenda[diaSemana];
    
    if (!configDia || !configDia.ativo) return { disponiveis: [], ocupados: [] };
    
    const agora = new Date();
    const isHoje = data.toDateString() === agora.toDateString();
    
    const disponiveis = [];
    const ocupados = [];
    
    configDia.horarios.forEach(horario => {
      // Verificar se o horário já passou (apenas para hoje)
      let horarioPassou = false;
      if (isHoje) {
        const [hora, minuto] = horario.split(':');
        const horarioData = new Date(data);
        horarioData.setHours(parseInt(hora), parseInt(minuto), 0, 0);
        horarioPassou = horarioData <= agora;
      }
      
      // Verificar se está ocupado
      const isOcupado = !isPreview && isSlotOccupied(data, horario);
      
      if (horarioPassou) {
        // Horário já passou - não mostrar
        return;
      } else if (isOcupado) {
        // Horário ocupado
        const slotInfo = getOccupiedSlotInfo(data, horario);
        ocupados.push({
          time: horario,
          info: slotInfo
        });
      } else {
        // Horário disponível
        disponiveis.push(horario);
      }
    });
    
    return { disponiveis, ocupados };
  };

  const formatarData = (data) => {
    return data.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long'
    });
  };

  const handleAgendamento = (data, horario) => {
    if (isPreview) {
      alert('Esta é uma pré-visualização. O agendamento real estará disponível na página publicada.');
      return;
    }
    
    setAppointmentModal({
      isOpen: true,
      selectedDate: data.toISOString().split('T')[0],
      selectedTime: horario
    });
  };

  const closeAppointmentModal = () => {
    setAppointmentModal({
      isOpen: false,
      selectedDate: null,
      selectedTime: null
    });
  };

  // Processar dados para o AppointmentModal
  const processedLawyerData = React.useMemo(() => {
    // Calcular valor da consulta (usar mínimo se disponível, senão máximo)
    let valorConsultaProcessado = 0;
    if (valorConsulta) {
      if (valorConsulta.minimo) {
        valorConsultaProcessado = parseFloat(valorConsulta.minimo);
      } else if (valorConsulta.maximo) {
        valorConsultaProcessado = parseFloat(valorConsulta.maximo);
      }
    }

    return {
      ...lawyerData,
      valorConsulta: valorConsultaProcessado,
      // Garantir que todos os campos necessários existem
      nomePagina: tipoPagina === 'escritorio' ? nomeEscritorio : nomeAdvogado,
      nomeAdvogado: nomeAdvogado || nomeExibicao
    };
  }, [lawyerData, valorConsulta, tipoPagina, nomeEscritorio, nomeAdvogado, nomeExibicao]);

  return (
    <div className="min-h-screen bg-white">
      {isPreview && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-center">
          <span className="text-sm text-yellow-800">
            🔍 Modo Pré-visualização - Esta é uma prévia de como sua página aparecerá
          </span>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {lawyerData.logo && (
                <img 
                  src={getImageSrc(lawyerData.logo)}
                  alt="Logo"
                  className="h-12 w-auto"
                />
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-900">{nomePagina}</h1>
                <p className="text-sm text-gray-600">
                  {isEscritorio ? `${nomeEscritorio} - CNPJ: ${cnpj?.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')}` : `${nomeAdvogado} - ${oab}`}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href={`tel:${telefone}`}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: corTema }}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Ligar
              </a>
              {redesSociais?.whatsapp && (
                <a
                  href={getWhatsAppLink(redesSociais.whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.785"/>
                  </svg>
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16" style={{ background: `linear-gradient(135deg, ${corTema}15, ${corTema}05)` }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                {nomeExibicao}
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                {biografia || `Advogado especializado em ${areasAtuacao?.slice(0, 2).join(' e ')}, oferecendo soluções jurídicas personalizadas com excelência e comprometimento.`}
              </p>
              <div className="flex flex-wrap gap-3 mb-8">
                {areasAtuacao?.slice(0, 3).map((area, index) => (
                  <span 
                    key={index}
                    className="px-4 py-2 rounded-full text-sm font-medium text-white"
                    style={{ backgroundColor: corTema }}
                  >
                    {area}
                  </span>
                ))}
                {areasAtuacao?.length > 3 && (
                  <span className="px-4 py-2 rounded-full text-sm font-medium bg-gray-200 text-gray-700">
                    +{areasAtuacao.length - 3} áreas
                  </span>
                )}
              </div>
              <div className="flex space-x-4">
                <a
                  href={`tel:${telefone}`}
                  className="inline-flex items-center px-6 py-3 border border-transparent rounded-lg text-base font-medium text-white"
                  style={{ backgroundColor: corTema }}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {formatPhone(telefone)}
                </a>
                <a
                  href={`mailto:${email}`}
                  className="inline-flex items-center px-6 py-3 border-2 rounded-lg text-base font-medium"
                  style={{ borderColor: corTema, color: corTema }}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Email
                </a>
              </div>
            </div>
            <div className="text-center">
              {lawyerData.fotoPerfil ? (
                <img 
                  src={getImageSrc(lawyerData.fotoPerfil)}
                  alt={nomeExibicao}
                  className="w-64 h-64 rounded-full object-cover mx-auto shadow-lg"
                />
              ) : (
                <div className="w-64 h-64 rounded-full bg-gray-200 mx-auto flex items-center justify-center shadow-lg">
                  <svg className="w-32 h-32 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Áreas de Atuação */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Áreas de Atuação</h3>
            <p className="text-lg text-gray-600">Especialidades jurídicas para atender suas necessidades</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {areasAtuacao?.map((area, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center hover:shadow-md transition-shadow">
                <div 
                  className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
                  style={{ backgroundColor: `${corTema}20` }}
                >
                  <svg className="w-6 h-6" style={{ color: corTema }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900">{area}</h4>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sobre o Advogado */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h3 className="text-3xl font-bold text-gray-900 mb-6">
                {isEscritorio ? 'Sobre o Escritório' : 'Sobre o Advogado'}
              </h3>
              <div className="space-y-6">
                {isEscritorio && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Informações Institucionais</h4>
                    <p className="text-gray-600 mb-2"><strong>CNPJ:</strong> {cnpj?.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')}</p>
                    <p className="text-gray-600"><strong>Advogado Responsável:</strong> {nomeAdvogado} - {oab}</p>
                  </div>
                )}
                
                {formacao && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Formação Acadêmica</h4>
                    <p className="text-gray-600">{formacao}</p>
                  </div>
                )}
                {experiencia && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Experiência Profissional</h4>
                    <p className="text-gray-600">{experiencia}</p>
                  </div>
                )}
                {especialidades && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Especialidades e Diferenciais</h4>
                    <p className="text-gray-600">{especialidades}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-gray-50 p-8 rounded-lg">
              <h4 className="text-xl font-semibold text-gray-900 mb-6">Informações de Contato</h4>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-gray-400 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900">Endereço</p>
                    <p className="text-gray-600">{enderecoCompleto}</p>
                    {endereco?.cep && <p className="text-gray-600">CEP: {endereco.cep}</p>}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900">Telefone</p>
                    <a href={`tel:${telefone}`} className="text-blue-600 hover:text-blue-700">
                      {formatPhone(telefone)}
                    </a>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900">Email</p>
                    <a href={`mailto:${email}`} className="text-blue-600 hover:text-blue-700">
                      {email}
                    </a>
                  </div>
                </div>

                {/* Valor da Consulta */}
                {valorConsulta && (valorConsulta.minimo || valorConsulta.maximo) && (
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    <div>
                      <p className="font-medium text-gray-900">Valor da Consulta</p>
                      <p className="text-gray-600">
                        {valorConsulta.minimo && valorConsulta.maximo ? (
                          `R$ ${parseFloat(valorConsulta.minimo).toFixed(2).replace('.', ',')} - R$ ${parseFloat(valorConsulta.maximo).toFixed(2).replace('.', ',')}`
                        ) : valorConsulta.minimo ? (
                          `A partir de R$ ${parseFloat(valorConsulta.minimo).toFixed(2).replace('.', ',')}`
                        ) : valorConsulta.maximo ? (
                          `Até R$ ${parseFloat(valorConsulta.maximo).toFixed(2).replace('.', ',')}`
                        ) : ''}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Redes Sociais */}
      {(redesSociais?.linkedin || redesSociais?.instagram || redesSociais?.facebook || redesSociais?.whatsapp) && (
        <section className="py-12 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-8">Conecte-se Comigo</h3>
            <div className="flex justify-center space-x-6">
              {redesSociais?.linkedin && (
                <a
                  href={redesSociais.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              )}
              {redesSociais?.whatsapp && (
                <a
                  href={getWhatsAppLink(redesSociais.whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.785"/>
                  </svg>
                </a>
              )}
              {redesSociais?.instagram && (
                <a
                  href={redesSociais.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-pink-600 text-white rounded-full hover:bg-pink-700 transition-colors"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
              )}
              {redesSociais?.facebook && (
                <a
                  href={redesSociais.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition-colors"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Seção de Agendamento */}
      {agenda && Object.values(agenda).some(dia => dia.ativo && dia.horarios.length > 0) && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold text-gray-900 mb-4">Agende sua Consulta</h3>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Escolha o melhor dia e horário para sua consulta jurídica. 
                Clique no horário desejado para agendar via WhatsApp.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {getProximosDias(14).map((data, index) => {
                const { disponiveis, ocupados } = getTodosHorarios(data);
                
                // Não mostrar o dia se não há horários configurados
                if (disponiveis.length === 0 && ocupados.length === 0) return null;

                return (
                  <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="mb-4">
                      <h4 className="text-lg font-semibold text-gray-900 capitalize">
                        {formatarData(data)}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {data.toLocaleDateString('pt-BR')}
                      </p>
                      {!loadingSlots && (
                        <div className="mt-2 flex items-center text-xs text-gray-500">
                          <div className="flex items-center mr-4">
                            <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded mr-1"></div>
                            Disponível
                          </div>
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-red-100 border border-red-200 rounded mr-1"></div>
                            Ocupado
                          </div>
                        </div>
                      )}
                    </div>

                    {loadingSlots && !isPreview ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p className="text-sm text-gray-500">Carregando horários...</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        {/* Horários disponíveis */}
                        {disponiveis.map((horario) => (
                          <button
                            key={`disponivel-${horario}`}
                            onClick={() => handleAgendamento(data, horario)}
                            className="px-4 py-3 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          >
                            {horario}
                          </button>
                        ))}
                        
                        {/* Horários ocupados */}
                        {ocupados.map((slot) => (
                          <div
                            key={`ocupado-${slot.time}`}
                            className="relative px-4 py-3 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg cursor-not-allowed"
                            title={`Ocupado - ${slot.info?.clientName || 'Cliente'} (${slot.info?.status || 'agendado'})`}
                          >
                            <span className="line-through">{slot.time}</span>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Mostrar mensagem se não há horários disponíveis nem ocupados */}
                    {!loadingSlots && disponiveis.length === 0 && ocupados.length === 0 && (
                      <p className="text-gray-500 text-sm text-center py-4">
                        Nenhum horário configurado para esta data
                      </p>
                    )}

                    {/* Mostrar mensagem se só há horários ocupados */}
                    {!loadingSlots && disponiveis.length === 0 && ocupados.length > 0 && (
                      <p className="text-gray-500 text-sm text-center py-2 mt-2">
                        Todos os horários estão ocupados
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-12 text-center">
              <div className="inline-flex items-center px-6 py-3 bg-blue-100 rounded-lg">
                <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-blue-800 text-sm font-medium">
                  Clique em um horário para agendar sua consulta online
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Modal de Agendamento */}
      <AppointmentModal
        isOpen={appointmentModal.isOpen}
        onClose={closeAppointmentModal}
        lawyerData={processedLawyerData}
        selectedDate={appointmentModal.selectedDate}
        selectedTime={appointmentModal.selectedTime}
      />

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © {new Date().getFullYear()} {nomePagina}. Todos os direitos reservados.
          </p>
          <p className="text-gray-400 mt-2 text-sm">
            Página criada com DireitoHub
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LawyerWebPage;
