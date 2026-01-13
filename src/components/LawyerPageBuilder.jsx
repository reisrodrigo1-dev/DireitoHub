import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { lawyerPageService } from '../firebase/firestore';

const AREAS_JURIDICAS = [
  'Direito Civil',
  'Direito Criminal',
  'Direito Trabalhista',
  'Direito Tributário',
  'Direito Empresarial',
  'Direito Administrativo',
  'Direito Constitucional',
  'Direito Previdenciário',
  'Direito do Consumidor',
  'Direito de Família',
  'Direito Sucessório',
  'Direito Imobiliário',
  'Direito Ambiental',
  'Direito Digital',
  'Direito Bancário',
  'Direito Internacional',
  'Direito Médico',
  'Direito Eleitoral',
  'Direito Agrário',
  'Direito da Propriedade Intelectual',
  'Direito Marítimo',
  'Direito Aeronáutico',
  'Direito Desportivo',
  'Direito do Entretenimento',
  'Direito Educacional'
];

const LawyerPageBuilder = ({ onBack, onPageCreated, onPageUpdated, editingPage = null }) => {
  const { user } = useAuth();
  const isEditing = !!editingPage;
  
  // Estrutura padrão da agenda
  const defaultAgenda = {
    segunda: { ativo: false, horarios: [] },
    terca: { ativo: false, horarios: [] },
    quarta: { ativo: false, horarios: [] },
    quinta: { ativo: false, horarios: [] },
    sexta: { ativo: false, horarios: [] },
    sabado: { ativo: false, horarios: [] },
    domingo: { ativo: false, horarios: [] }
  };

  // Estrutura padrão do formulário
  const defaultFormData = {
    tipoPagina: 'advogado', // 'advogado' ou 'escritorio'
    nomePagina: '',
    nomeAdvogado: '',
    nomeEscritorio: '', // Para quando for escritório
    cnpj: '', // Para escritórios
    oab: '',
    telefone: '',
    email: user?.email || '',
    slug: '', // Slug único da página
    endereco: {
      rua: '',
      numero: '',
      bairro: '',
      cidade: '',
      estado: '',
      cep: ''
    },
    areasAtuacao: [],
    biografia: '',
    experiencia: '',
    formacao: '',
    especialidades: '',
    valorConsulta: {
      minimo: '',
      maximo: ''
    },
    logo: null,
    fotoPerfil: null,
    corTema: '#0ea5e9',
    redesSociais: {
      linkedin: '',
      instagram: '',
      facebook: '',
      whatsapp: ''
    },
    agenda: defaultAgenda
  };

  // Mesclar dados existentes com estrutura padrão
  const initialFormData = isEditing ? {
    ...defaultFormData,
    ...editingPage,
    agenda: {
      ...defaultAgenda,
      ...(editingPage.agenda || {})
    }
  } : defaultFormData;

  const [formData, setFormData] = useState(initialFormData);

  const [logoPreview, setLogoPreview] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [slugStatus, setSlugStatus] = useState(''); // 'available', 'taken', 'invalid', ''
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleAreaToggle = (area) => {
    setFormData(prev => ({
      ...prev,
      areasAtuacao: prev.areasAtuacao.includes(area)
        ? prev.areasAtuacao.filter(a => a !== area)
        : [...prev.areasAtuacao, area]
    }));
  };

  const handleFileUpload = (type, event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (type === 'logo') {
          setLogoPreview(e.target.result);
          setFormData(prev => ({ ...prev, logo: file }));
        } else if (type === 'foto') {
          setFotoPreview(e.target.result);
          setFormData(prev => ({ ...prev, fotoPerfil: file }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Função para formatar CNPJ
  const formatCNPJ = (value) => {
    const numbers = value.replace(/[^\d]/g, '');
    
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
    if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
    if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
  };

  // Função para validar CNPJ
  const validateCNPJ = (cnpj) => {
    const numbers = cnpj.replace(/[^\d]/g, '');
    if (numbers.length !== 14) return false;
    
    if (/^(\d)\1+$/.test(numbers)) return false;
    
    let sum = 0;
    let weight = 5;
    
    for (let i = 0; i < 12; i++) {
      sum += parseInt(numbers[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    
    let digit = sum % 11;
    digit = digit < 2 ? 0 : 11 - digit;
    
    if (parseInt(numbers[12]) !== digit) return false;
    
    sum = 0;
    weight = 6;
    
    for (let i = 0; i < 13; i++) {
      sum += parseInt(numbers[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    
    digit = sum % 11;
    digit = digit < 2 ? 0 : 11 - digit;
    
    return parseInt(numbers[13]) === digit;
  };

  // Função para validar step 1
  const validateStep1 = () => {
    if (!formData.nomePagina || !formData.oab || !formData.telefone) {
      return false;
    }
    
    if (formData.tipoPagina === 'escritorio') {
      return formData.nomeEscritorio && formData.cnpj && validateCNPJ(formData.cnpj);
    } else {
      return formData.nomeAdvogado;
    }
  };

  // Função para gerar slug automaticamente a partir do nome
  const generateSlug = (name) => {
    if (!name) return '';
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-') // Substituir espaços por hífen
      .replace(/[^a-z0-9-]/g, '') // Remover caracteres especiais
      .replace(/-+/g, '-') // Remover hífens múltiplos
      .replace(/^-|-$/g, ''); // Remover hífens das extremidades
  };

  // Função para verificar disponibilidade do slug
  const checkSlugAvailability = async (slug, excludePageId = null) => {
    if (!slug || slug.length < 3) {
      setSlugStatus('invalid');
      return false;
    }

    try {
      setIsCheckingSlug(true);
      const isAvailable = await lawyerPageService.isSlugAvailable(slug, excludePageId || (isEditing ? editingPage.id : null));
      
      if (isAvailable) {
        setSlugStatus('available');
        return true;
      } else {
        setSlugStatus('taken');
        return false;
      }
    } catch (error) {
      console.error('Erro ao verificar slug:', error);
      setSlugStatus('');
      return false;
    } finally {
      setIsCheckingSlug(false);
    }
  };

  // Efeito para atualizar slug automaticamente quando o nome muda
  useEffect(() => {
    const nameField = formData.tipoPagina === 'escritorio' ? formData.nomeEscritorio : formData.nomeAdvogado;
    const newSlug = generateSlug(nameField);
    
    if (newSlug && newSlug !== formData.slug) {
      setFormData(prev => ({ ...prev, slug: newSlug }));
      if (newSlug.length >= 3) {
        checkSlugAvailability(newSlug);
      } else {
        setSlugStatus('invalid');
      }
    }
  }, [formData.nomeAdvogado, formData.nomeEscritorio, formData.tipoPagina]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Só permitir submit se estiver no passo 5
    if (currentStep !== 5) {
      e.stopPropagation();
      return;
    }
    
    setIsSubmitting(true);

    try {
      // Validação adicional para escritório
      if (formData.tipoPagina === 'escritorio') {
        if (!formData.cnpj || !validateCNPJ(formData.cnpj)) {
          alert('Por favor, insira um CNPJ válido.');
          setIsSubmitting(false);
          return;
        }
      }
      
      // Converter arquivos para base64 antes de salvar
      const processedData = { ...formData };
      
      // Converter logo para base64 se existir e for um arquivo novo
      if (formData.logo && formData.logo instanceof File) {
        processedData.logo = await convertFileToBase64(formData.logo);
      }
      
      // Converter foto para base64 se existir e for um arquivo novo
      if (formData.fotoPerfil && formData.fotoPerfil instanceof File) {
        processedData.fotoPerfil = await convertFileToBase64(formData.fotoPerfil);
      }

      if (isEditing) {
        // Atualizar página existente
        const result = await lawyerPageService.updatePage(editingPage.id, processedData);
        
        if (result.success) {
          console.log('Página atualizada com sucesso no Firebase:', result.data);
          
          // Callback para notificar que a página foi atualizada
          if (onPageUpdated) {
            onPageUpdated(result.data);
          }
          
          alert('Página atualizada com sucesso!');
        } else {
          throw new Error(result.error);
        }
      } else {
        // Criar nova página
        // Usar slug customizado do usuário se disponível, caso contrário gerar um novo
        let slug = formData.slug;
        
        // Se o slug foi customizado, validar se está disponível
        if (slug && slug.length >= 3) {
          const isAvailable = await lawyerPageService.isSlugAvailable(slug);
          if (!isAvailable) {
            alert('O slug escolhido não está disponível. Por favor, choose outro.');
            setIsSubmitting(false);
            return;
          }
        } else {
          // Gerar slug único automático
          const baseSlug =
            formData.tipoPagina === 'escritorio'
              ? formData.nomeEscritorio.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
              : formData.nomeAdvogado.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          slug = baseSlug;
          let counter = 1;
          
          // Verificar se slug está disponível
          while (!(await lawyerPageService.isSlugAvailable(slug))) {
            slug = `${baseSlug}-${counter}`;
            counter++;
          }
        }

        const pageData = {
          ...processedData,
          slug,
          isActive: true
        };

        // Salvar no Firebase
        if (user?.uid) {
          const result = await lawyerPageService.createPage(user.uid, pageData);
          
          if (result.success) {
            console.log('Página criada com sucesso no Firebase:', result.data);
            
            // Callback para notificar que a página foi criada
            if (onPageCreated) {
              onPageCreated(result.data);
            }
            
            alert('Página criada com sucesso! Você pode visualizá-la agora.');
          } else {
            throw new Error(result.error);
          }
        } else {
          throw new Error('Usuário não autenticado');
        }
      }

    } catch (error) {
      console.error('Erro ao salvar página:', error);
      alert('Erro ao criar página: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Função auxiliar para converter File para base64
  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const nextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, 5));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    e.stopPropagation();
    nextStep();
  };

  const handlePrevStep = (e) => {
    e.preventDefault();
    e.stopPropagation();
    prevStep();
  };

  const buscarCep = async (cep) => {
    // Remove caracteres não numéricos do CEP
    const cepLimpo = cep.replace(/\D/g, '');
    
    // Verifica se o CEP tem 8 dígitos
    if (cepLimpo.length !== 8) {
      return;
    }

    setIsLoadingCep(true);
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        alert('CEP não encontrado. Verifique se o CEP está correto.');
        return;
      }

      // Preenche os campos automaticamente
      setFormData(prev => ({
        ...prev,
        endereco: {
          ...prev.endereco,
          cep: cep,
          rua: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          estado: data.uf || ''
        }
      }));
      
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      alert('Erro ao buscar CEP. Tente novamente.');
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handleCepChange = (value) => {
    // Formatação do CEP (00000-000)
    const cepFormatado = value
      .replace(/\D/g, '') // Remove tudo que não é número
      .replace(/^(\d{5})(\d)/, '$1-$2') // Adiciona hífen
      .substring(0, 9); // Limita a 9 caracteres

    handleInputChange('endereco.cep', cepFormatado);
    
    // Busca automática quando o CEP estiver completo
    if (cepFormatado.length === 9) {
      buscarCep(cepFormatado);
    }
  };

  // Funções para gerenciar agenda
  const diasSemana = {
    segunda: 'Segunda-feira',
    terca: 'Terça-feira',
    quarta: 'Quarta-feira',
    quinta: 'Quinta-feira',
    sexta: 'Sexta-feira',
    sabado: 'Sábado',
    domingo: 'Domingo'
  };

  const horariosDisponiveis = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', 
    '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
  ];

  const handleDiaToggle = (dia) => {
    setFormData(prev => ({
      ...prev,
      agenda: {
        ...prev.agenda,
        [dia]: {
          ...prev.agenda[dia],
          ativo: !prev.agenda[dia].ativo,
          horarios: !prev.agenda[dia].ativo ? [] : prev.agenda[dia].horarios
        }
      }
    }));
  };

  const handleHorarioToggle = (dia, horario) => {
    setFormData(prev => {
      const horariosAtuais = prev.agenda[dia].horarios;
      const novosHorarios = horariosAtuais.includes(horario)
        ? horariosAtuais.filter(h => h !== horario)
        : [...horariosAtuais, horario].sort();

      return {
        ...prev,
        agenda: {
          ...prev.agenda,
          [dia]: {
            ...prev.agenda[dia],
            horarios: novosHorarios
          }
        }
      };
    });
  };

  const handleSelectAllHorarios = (dia) => {
    setFormData(prev => ({
      ...prev,
      agenda: {
        ...prev.agenda,
        [dia]: {
          ...prev.agenda[dia],
          horarios: [...horariosDisponiveis]
        }
      }
    }));
  };

  const handleClearHorarios = (dia) => {
    setFormData(prev => ({
      ...prev,
      agenda: {
        ...prev.agenda,
        [dia]: {
          ...prev.agenda[dia],
          horarios: []
        }
      }
    }));
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Informações Básicas</h3>
      
      {/* Seleção do Tipo de Página */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Tipo de Página
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div 
            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              formData.tipoPagina === 'advogado' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onClick={() => handleInputChange('tipoPagina', 'advogado')}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full border-2 ${
                formData.tipoPagina === 'advogado' 
                  ? 'border-blue-500 bg-blue-500' 
                  : 'border-gray-300'
              }`}>
                {formData.tipoPagina === 'advogado' && (
                  <div className="w-2 h-2 bg-white rounded-full m-auto mt-0.5"></div>
                )}
              </div>
              <div>
                <div className="font-medium text-gray-900">Advogado Individual</div>
                <div className="text-sm text-gray-600">Página pessoal de um advogado</div>
              </div>
            </div>
          </div>
          
          <div 
            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              formData.tipoPagina === 'escritorio' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onClick={() => handleInputChange('tipoPagina', 'escritorio')}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full border-2 ${
                formData.tipoPagina === 'escritorio' 
                  ? 'border-blue-500 bg-blue-500' 
                  : 'border-gray-300'
              }`}>
                {formData.tipoPagina === 'escritorio' && (
                  <div className="w-2 h-2 bg-white rounded-full m-auto mt-0.5"></div>
                )}
              </div>
              <div>
                <div className="font-medium text-gray-900">Escritório de Advocacia</div>
                <div className="text-sm text-gray-600">Página institucional com CNPJ</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome da Página
          </label>
          <input
            type="text"
            value={formData.nomePagina}
            onChange={(e) => handleInputChange('nomePagina', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={
              formData.tipoPagina === 'escritorio' 
                ? "Ex: Silva & Associados Advocacia" 
                : "Ex: Dr. João Silva - Advogado"
            }
            required
          />
        </div>

        {formData.tipoPagina === 'escritorio' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Escritório
            </label>
            <input
              type="text"
              value={formData.nomeEscritorio}
              onChange={(e) => handleInputChange('nomeEscritorio', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Razão social do escritório"
              required
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Advogado
            </label>
            <input
              type="text"
              value={formData.nomeAdvogado}
              onChange={(e) => handleInputChange('nomeAdvogado', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Seu nome completo"
              required
            />
          </div>
        )}

        {formData.tipoPagina === 'escritorio' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CNPJ *
            </label>
            <input
              type="text"
              value={formData.cnpj}
              onChange={(e) => handleInputChange('cnpj', formatCNPJ(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="00.000.000/0001-00"
              maxLength="18"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              O CNPJ deve ser único no sistema
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {formData.tipoPagina === 'escritorio' ? 'OAB do Responsável' : 'OAB'}
          </label>
          <input
            type="text"
            value={formData.oab}
            onChange={(e) => handleInputChange('oab', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="OAB/SP 123456"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Telefone
          </label>
          <input
            type="tel"
            value={formData.telefone}
            onChange={(e) => handleInputChange('telefone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="(11) 99999-9999"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="seu@email.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cor do Tema
          </label>
          <div className="flex space-x-2">
            <input
              type="color"
              value={formData.corTema}
              onChange={(e) => handleInputChange('corTema', e.target.value)}
              className="w-16 h-10 border border-gray-300 rounded-lg cursor-pointer"
            />
            <input
              type="text"
              value={formData.corTema}
              onChange={(e) => handleInputChange('corTema', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Campo de Slug */}
      <div className="border-t pt-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          URL da Página (Slug)
        </label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded-lg font-medium">
              seusite.com/
            </span>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => {
                const newSlug = generateSlug(e.target.value);
                setFormData(prev => ({ ...prev, slug: newSlug }));
                if (newSlug.length >= 3) {
                  checkSlugAvailability(newSlug);
                } else {
                  setSlugStatus('invalid');
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder="nome-da-pagina"
            />
          </div>

          {/* Status do Slug */}
          <div className="flex items-center space-x-2">
            {isCheckingSlug && (
              <>
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-blue-600">Verificando disponibilidade...</span>
              </>
            )}
            {!isCheckingSlug && slugStatus === 'available' && (
              <>
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-green-600">Slug disponível ✓</span>
              </>
            )}
            {!isCheckingSlug && slugStatus === 'taken' && (
              <>
                <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-red-600">Slug já está em uso</span>
              </>
            )}
            {!isCheckingSlug && slugStatus === 'invalid' && formData.slug && (
              <>
                <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-yellow-600">Slug deve ter pelo menos 3 caracteres</span>
              </>
            )}
          </div>

          <p className="text-xs text-gray-500 mt-2">
            O slug é gerado automaticamente a partir do seu nome e pode ser customizado. Ele deve ser único no sistema.
          </p>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Endereço</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CEP - Primeiro campo para busca automática */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            CEP *
          </label>
          <div className="relative">
            <input
              type="text"
              value={formData.endereco.cep}
              onChange={(e) => handleCepChange(e.target.value)}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="12345-678"
              maxLength={9}
              required
            />
            {isLoadingCep && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Digite o CEP para preencher automaticamente o endereço
          </p>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rua *
          </label>
          <input
            type="text"
            value={formData.endereco.rua}
            onChange={(e) => handleInputChange('endereco.rua', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Nome da rua"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Número *
          </label>
          <input
            type="text"
            value={formData.endereco.numero}
            onChange={(e) => handleInputChange('endereco.numero', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="123"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bairro *
          </label>
          <input
            type="text"
            value={formData.endereco.bairro}
            onChange={(e) => handleInputChange('endereco.bairro', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Nome do bairro"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cidade *
          </label>
          <input
            type="text"
            value={formData.endereco.cidade}
            onChange={(e) => handleInputChange('endereco.cidade', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="São Paulo"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Estado *
          </label>
          <select
            value={formData.endereco.estado}
            onChange={(e) => handleInputChange('endereco.estado', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">Selecione o estado</option>
            <option value="AC">Acre</option>
            <option value="AL">Alagoas</option>
            <option value="AP">Amapá</option>
            <option value="AM">Amazonas</option>
            <option value="BA">Bahia</option>
            <option value="CE">Ceará</option>
            <option value="DF">Distrito Federal</option>
            <option value="ES">Espírito Santo</option>
            <option value="GO">Goiás</option>
            <option value="MA">Maranhão</option>
            <option value="MT">Mato Grosso</option>
            <option value="MS">Mato Grosso do Sul</option>
            <option value="MG">Minas Gerais</option>
            <option value="PA">Pará</option>
            <option value="PB">Paraíba</option>
            <option value="PR">Paraná</option>
            <option value="PE">Pernambuco</option>
            <option value="PI">Piauí</option>
            <option value="RJ">Rio de Janeiro</option>
            <option value="RN">Rio Grande do Norte</option>
            <option value="RS">Rio Grande do Sul</option>
            <option value="RO">Rondônia</option>
            <option value="RR">Roraima</option>
            <option value="SC">Santa Catarina</option>
            <option value="SP">São Paulo</option>
            <option value="SE">Sergipe</option>
            <option value="TO">Tocantins</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Áreas de Atuação</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {AREAS_JURIDICAS.map((area) => (
          <div
            key={area}
            onClick={() => handleAreaToggle(area)}
            className={`p-3 rounded-lg border-2 cursor-pointer transition-all text-sm text-center ${
              formData.areasAtuacao.includes(area)
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}
          >
            {area}
          </div>
        ))}
      </div>

      {formData.areasAtuacao.length === 0 && (
        <p className="text-red-500 text-sm">Selecione pelo menos uma área de atuação</p>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Perfil Profissional</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upload de Logo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Logo do Escritório
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            {logoPreview ? (
              <div className="space-y-2">
                <img 
                  src={logoPreview} 
                  alt="Logo preview" 
                  className="mx-auto h-20 w-auto"
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('logo-upload').click()}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  Alterar logo
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <button
                  type="button"
                  onClick={() => document.getElementById('logo-upload').click()}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  Fazer upload do logo
                </button>
              </div>
            )}
            <input
              id="logo-upload"
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload('logo', e)}
              className="hidden"
            />
          </div>
        </div>

        {/* Upload de Foto de Perfil */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Foto de Perfil
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            {fotoPreview ? (
              <div className="space-y-2">
                <img 
                  src={fotoPreview} 
                  alt="Foto preview" 
                  className="mx-auto h-20 w-20 rounded-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('foto-upload').click()}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  Alterar foto
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <button
                  type="button"
                  onClick={() => document.getElementById('foto-upload').click()}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  Fazer upload da foto
                </button>
              </div>
            )}
            <input
              id="foto-upload"
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload('foto', e)}
              className="hidden"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Biografia / Apresentação
          </label>
          <textarea
            value={formData.biografia}
            onChange={(e) => handleInputChange('biografia', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Conte um pouco sobre você e sua experiência profissional..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Formação Acadêmica
          </label>
          <textarea
            value={formData.formacao}
            onChange={(e) => handleInputChange('formacao', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Graduação, pós-graduação, especializações..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Experiência Profissional
          </label>
          <textarea
            value={formData.experiencia}
            onChange={(e) => handleInputChange('experiencia', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Principais experiências e atuações..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Especialidades e Diferenciais
          </label>
          <textarea
            value={formData.especialidades}
            onChange={(e) => handleInputChange('especialidades', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="O que te diferencia dos demais advogados..."
          />
        </div>

        {/* Valor da Consulta */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Valor da Consulta (R$)
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Valor Mínimo</label>
              <input
                type="number"
                value={formData.valorConsulta.minimo}
                onChange={(e) => handleInputChange('valorConsulta.minimo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: 150"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Valor Máximo</label>
              <input
                type="number"
                value={formData.valorConsulta.maximo}
                onChange={(e) => handleInputChange('valorConsulta.maximo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: 300"
                min="0"
                step="0.01"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Digite os valores mínimo e máximo que você cobra por consulta
          </p>
        </div>
      </div>

      {/* Redes Sociais */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Redes Sociais (Opcional)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              LinkedIn
            </label>
            <input
              type="url"
              value={formData.redesSociais.linkedin}
              onChange={(e) => handleInputChange('redesSociais.linkedin', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://linkedin.com/in/seuperfil"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              WhatsApp
            </label>
            <input
              type="tel"
              value={formData.redesSociais.whatsapp}
              onChange={(e) => handleInputChange('redesSociais.whatsapp', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="(11) 99999-9999"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instagram
            </label>
            <input
              type="url"
              value={formData.redesSociais.instagram}
              onChange={(e) => handleInputChange('redesSociais.instagram', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://instagram.com/seuperfil"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Facebook
            </label>
            <input
              type="url"
              value={formData.redesSociais.facebook}
              onChange={(e) => handleInputChange('redesSociais.facebook', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://facebook.com/seuperfil"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-6">Configuração de Agenda</h3>
      
      <div className="space-y-6">
        {/* Agenda */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">
            Horários Disponíveis para Agendamento
          </h4>
          <p className="text-sm text-gray-600 mb-6">
            Configure os dias e horários em que você estará disponível para atendimentos. 
            Cada slot tem duração de 1 hora.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.keys(diasSemana).map((dia) => (
              <div key={dia} className="border rounded-lg p-4 bg-white shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="text-sm font-semibold text-gray-800">
                    {diasSemana[dia]}
                  </h5>
                  <button
                    type="button"
                    onClick={() => handleDiaToggle(dia)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      formData.agenda[dia].ativo
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {formData.agenda[dia].ativo ? 'Ativo' : 'Inativo'}
                  </button>
                </div>

                {formData.agenda[dia].ativo && (
                  <div>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {horariosDisponiveis.map((horario) => (
                        <button
                          key={horario}
                          type="button"
                          onClick={() => handleHorarioToggle(dia, horario)}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            formData.agenda[dia].horarios.includes(horario)
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {horario}
                        </button>
                      ))}
                    </div>

                    <div className="flex justify-between">
                      <button
                        type="button"
                        onClick={() => handleSelectAllHorarios(dia)}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-all"
                      >
                        Selecionar Todos
                      </button>
                      <button
                        type="button"
                        onClick={() => handleClearHorarios(dia)}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-all"
                      >
                        Limpar Seleção
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isEditing ? 'Editar Página do Advogado' : 'Criar Página do Advogado'}
              </h1>
              <p className="text-gray-600 mt-1">
                Crie sua página profissional personalizada em poucos passos
              </p>
            </div>
            <button
              onClick={onBack}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Voltar
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((step) => (
                <React.Fragment key={step}>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    step <= currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step}
                  </div>
                  {step < 5 && (
                    <div className={`flex-1 h-1 mx-2 ${
                      step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-600">
              <span>Básico</span>
              <span>Endereço</span>
              <span>Áreas</span>
              <span>Imagens</span>
              <span>Agenda</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handlePrevStep}
              disabled={currentStep === 1}
              className={`px-6 py-2 rounded-lg text-sm font-medium ${
                currentStep === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Anterior
            </button>

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={handleNextStep}
                disabled={
                  (currentStep === 1 && !validateStep1()) ||
                  (currentStep === 2 && (!formData.endereco.rua || !formData.endereco.cidade || !formData.endereco.estado)) ||
                  (currentStep === 3 && formData.areasAtuacao.length === 0)
                }
                className={`px-6 py-2 rounded-lg text-sm font-medium ${
                  (currentStep === 1 && !validateStep1()) ||
                  (currentStep === 2 && (!formData.endereco.rua || !formData.endereco.cidade || !formData.endereco.estado)) ||
                  (currentStep === 3 && formData.areasAtuacao.length === 0)
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Próximo
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting || formData.areasAtuacao.length === 0}
                className={`px-8 py-2 rounded-lg text-sm font-medium ${
                  isSubmitting || formData.areasAtuacao.length === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {isSubmitting 
                  ? (isEditing ? 'Atualizando...' : 'Criando...') 
                  : (isEditing ? 'Atualizar Página' : 'Criar Página')
                }
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default LawyerPageBuilder;
