import React, { useState, useEffect } from 'react';

const ProcessModal = ({ process, selectedDate, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    processNumber: '',
    court: '',
    description: '',
    date: '',
    time: '',
    type: 'hearing',
    status: 'pending',
    client: '',
    opposingParty: '',
    lawyer: '',
    judge: '',
    subject: '',
    priority: 'medium',
    reminder: '60'
  });

  useEffect(() => {
    if (process) {
      console.log('📋 Preenchendo formulário com processo:', process);
      console.log('📝 Tentando preencher número do processo:');
      console.log('  - process.processNumber:', process.processNumber);
      console.log('  - process.numeroProcesso:', process.numeroProcesso);
      console.log('  - process.numeroProcessoFormatado:', process.numeroProcessoFormatado);
      console.log('  - process.resumoProcesso?.numeroFormatado:', process.resumoProcesso?.numeroFormatado);
      
      const numeroProcessoFinal = 
        process.processNumber || 
        process.numeroProcessoFormatado || 
        process.numeroProcesso || 
        process.resumoProcesso?.numeroFormatado ||
        '';
      
      console.log('✅ Número final selecionado:', numeroProcessoFinal);
      
      const newFormData = {
        title: process.title || process.classeNome || process.classeCompleta?.nome || '',
        processNumber: numeroProcessoFinal,
        court: process.court || process.orgaoJulgadorNome || process.orgaoJulgadorCompleto?.nome || '',
        description: process.description || '',
        date: process.date || process.startDate || '',
        time: process.time || '',
        type: process.type || 'hearing',
        status: process.status || 'pending',
        client: process.client || '',
        opposingParty: process.opposingParty || '',
        lawyer: process.lawyer || '',
        judge: process.judge || '',
        subject: process.subject || process.classeNome || process.classeCompleta?.nome || '',
        priority: process.priority || 'medium',
        reminder: process.reminder || '60'
      };
      
      console.log('🔧 Nova formData:', newFormData);
      console.log('🔍 processNumber em newFormData:', newFormData.processNumber);
      
      setFormData(newFormData);
    } else if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        date: selectedDate.toISOString().split('T')[0]
      }));
    }
  }, [process, selectedDate]);

  // Log quando formData muda
  useEffect(() => {
    console.log('📊 formData atualizado:', formData);
    console.log('   processNumber no state:', formData.processNumber);
  }, [formData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const typeOptions = [
    { value: 'hearing', label: 'Audiência', icon: '⚖️' },
    { value: 'deadline', label: 'Prazo', icon: '⏰' },
    { value: 'filing', label: 'Protocolo', icon: '📄' },
    { value: 'judgment', label: 'Julgamento', icon: '👨‍⚖️' },
    { value: 'appeal', label: 'Recurso', icon: '🔄' },
    { value: 'sentence', label: 'Sentença', icon: '⚖️' },
    { value: 'other', label: 'Outro', icon: '📝' }
  ];

  const statusOptions = [
    { value: 'pending', label: 'Pendente', color: 'text-yellow-600' },
    { value: 'in_progress', label: 'Em Andamento', color: 'text-blue-600' },
    { value: 'completed', label: 'Concluído', color: 'text-green-600' },
    { value: 'cancelled', label: 'Cancelado', color: 'text-red-600' },
    { value: 'postponed', label: 'Adiado', color: 'text-orange-600' }
  ];

  const priorityOptions = [
    { value: 'low', label: 'Baixa', color: 'text-green-600' },
    { value: 'medium', label: 'Média', color: 'text-yellow-600' },
    { value: 'high', label: 'Alta', color: 'text-red-600' }
  ];

  const reminderOptions = [
    { value: '0', label: 'Sem lembrete' },
    { value: '30', label: '30 minutos antes' },
    { value: '60', label: '1 hora antes' },
    { value: '120', label: '2 horas antes' },
    { value: '1440', label: '1 dia antes' },
    { value: '2880', label: '2 dias antes' },
    { value: '10080', label: '1 semana antes' }
  ];

  // Log do renderização
  console.log('🎨 ProcessModal renderizando com formData.processNumber:', formData.processNumber);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {process ? 'Editar Processo' : 'Novo Processo'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Informações do DataJud */}
          {process && process.isFromDataJud && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className="inline-block px-3 py-1 bg-yellow-300 text-yellow-900 text-xs font-semibold rounded-full">DataJud</span>
                </div>
                <div className="ml-4 flex-grow">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-semibold text-gray-700">Número:</span> 
                      <span className="text-gray-900 ml-2">{process.numeroProcessoFormatado || process.numeroProcesso}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700">Tribunal:</span> 
                      <span className="text-gray-900 ml-2">{process.tribunal}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700">Classe:</span> 
                      <span className="text-gray-900 ml-2">{process.classeNome}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700">Status:</span> 
                      <span className="text-gray-900 ml-2">{process.status}</span>
                    </div>
                    {process.polos && (process.polos.autores?.length > 0 || process.polos.requeridos?.length > 0) && (
                      <>
                        {process.polos.autores?.length > 0 && (
                          <div>
                            <span className="font-semibold text-gray-700">Autores:</span> 
                            <span className="text-gray-900 ml-2">{process.polos.autores.map(a => a.nome).join(', ')}</span>
                          </div>
                        )}
                        {process.polos.requeridos?.length > 0 && (
                          <div>
                            <span className="font-semibold text-gray-700">Requeridos:</span> 
                            <span className="text-gray-900 ml-2">{process.polos.requeridos.map(r => r.nome).join(', ')}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Título */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Título *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Digite o título do processo"
              />
            </div>

            {/* Número do Processo e Tribunal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="processNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Número do Processo *
                </label>
                <input
                  type="text"
                  id="processNumber"
                  name="processNumber"
                  value={formData.processNumber}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="0000000-00.0000.0.00.0000"
                  onFocus={() => console.log('🎯 Input processNumber focused, valor atual:', formData.processNumber)}
                />
              </div>
              <div>
                <label htmlFor="court" className="block text-sm font-medium text-gray-700 mb-1">
                  Tribunal *
                </label>
                <input
                  type="text"
                  id="court"
                  name="court"
                  value={formData.court}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Ex: TJ-SP, STF, TST"
                />
              </div>
            </div>

            {/* Tipo e Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo
                </label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  {typeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.icon} {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Data e Hora */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                  Data *
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
                  Hora
                </label>
                <input
                  type="time"
                  id="time"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>

            {/* Cliente e Parte Contrária */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="client" className="block text-sm font-medium text-gray-700 mb-1">
                  Cliente
                </label>
                <input
                  type="text"
                  id="client"
                  name="client"
                  value={formData.client}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Nome do cliente"
                />
              </div>
              <div>
                <label htmlFor="opposingParty" className="block text-sm font-medium text-gray-700 mb-1">
                  Parte Contrária
                </label>
                <input
                  type="text"
                  id="opposingParty"
                  name="opposingParty"
                  value={formData.opposingParty}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Nome da parte contrária"
                />
              </div>
            </div>

            {/* Advogado e Juiz */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="lawyer" className="block text-sm font-medium text-gray-700 mb-1">
                  Advogado Responsável
                </label>
                <input
                  type="text"
                  id="lawyer"
                  name="lawyer"
                  value={formData.lawyer}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Nome do advogado"
                />
              </div>
              <div>
                <label htmlFor="judge" className="block text-sm font-medium text-gray-700 mb-1">
                  Juiz
                </label>
                <input
                  type="text"
                  id="judge"
                  name="judge"
                  value={formData.judge}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Nome do juiz"
                />
              </div>
            </div>

            {/* Assunto */}
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                Assunto
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Ex: Direito Civil, Trabalhista, Criminal"
              />
            </div>

            {/* Prioridade e Lembrete */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                  Prioridade
                </label>
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  {priorityOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="reminder" className="block text-sm font-medium text-gray-700 mb-1">
                  Lembrete
                </label>
                <select
                  id="reminder"
                  name="reminder"
                  value={formData.reminder}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  {reminderOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Observações
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Observações adicionais sobre o processo"
              />
            </div>

            {/* Botões */}
            <div className="flex justify-end space-x-3 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                {process ? 'Atualizar' : 'Criar'} Processo
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProcessModal;
