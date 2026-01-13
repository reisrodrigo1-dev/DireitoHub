import React, { useState, useEffect } from 'react';

const EventModal = ({ event, selectedDate, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    priority: 'medium',
    reminder: '15',
    category: 'meeting',
    location: '',
    attendees: '',
    videoCallLink: ''
  });

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title || '',
        description: event.description || '',
        date: event.date || '',
        time: event.time || '',
        priority: event.priority || 'medium',
        reminder: event.reminder || '15',
        category: event.category || 'meeting',
        location: event.location || '',
        attendees: event.attendees || '',
        videoCallLink: event.videoCallLink || ''
      });
    } else if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        date: selectedDate.toISOString().split('T')[0]
      }));
    }
  }, [event, selectedDate]);

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

  const categoryOptions = [
    { value: 'meeting', label: 'Reunião', icon: '👥' },
    { value: 'court', label: 'Audiência', icon: '⚖️' },
    { value: 'deadline', label: 'Prazo', icon: '⏰' },
    { value: 'client', label: 'Cliente', icon: '🤝' },
    { value: 'personal', label: 'Pessoal', icon: '👤' },
    { value: 'other', label: 'Outro', icon: '📝' }
  ];

  const priorityOptions = [
    { value: 'low', label: 'Baixa', color: 'text-green-600' },
    { value: 'medium', label: 'Média', color: 'text-yellow-600' },
    { value: 'high', label: 'Alta', color: 'text-red-600' }
  ];

  const reminderOptions = [
    { value: '0', label: 'Sem lembrete' },
    { value: '15', label: '15 minutos antes' },
    { value: '30', label: '30 minutos antes' },
    { value: '60', label: '1 hora antes' },
    { value: '1440', label: '1 dia antes' },
    { value: '10080', label: '1 semana antes' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {event ? 'Editar Compromisso' : 'Novo Compromisso'}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Digite o título do compromisso"
              />
            </div>

            {/* Categoria */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Categoria
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {categoryOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.icon} {option.label}
                  </option>
                ))}
              </select>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
                  Hora *
                </label>
                <input
                  type="time"
                  id="time"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Prioridade */}
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                Prioridade
              </label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {priorityOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Local */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                Local
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Endereço ou local do compromisso"
              />
            </div>

            {/* Participantes */}
            <div>
              <label htmlFor="attendees" className="block text-sm font-medium text-gray-700 mb-1">
                Participantes
              </label>
              <input
                type="text"
                id="attendees"
                name="attendees"
                value={formData.attendees}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nomes dos participantes (separados por vírgula)"
              />
            </div>

            {/* Lembrete */}
            <div>
              <label htmlFor="reminder" className="block text-sm font-medium text-gray-700 mb-1">
                Lembrete
              </label>
              <select
                id="reminder"
                name="reminder"
                value={formData.reminder}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {reminderOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Descrição */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Detalhes adicionais sobre o compromisso"
              />
            </div>

            {/* Link da Chamada */}
            {formData.videoCallLink && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  🎥 Link da Chamada
                </label>
                <div className="flex items-center gap-2">
                  <a
                    href={formData.videoCallLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-3 py-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 truncate"
                  >
                    {formData.videoCallLink}
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(formData.videoCallLink);
                      alert('Link copiado!');
                    }}
                    className="px-3 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Copiar
                  </button>
                </div>
              </div>
            )}

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
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                {event ? 'Atualizar' : 'Criar'} Compromisso
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EventModal;
