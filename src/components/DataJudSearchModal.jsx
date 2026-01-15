import React, { useState, useEffect } from 'react';
import { 
  buscarProcessoPorNumero, 
  buscarProcessoAvancado, 
  buscarProcessoPorTexto,
  buscarProcessosPorAdvogado,
  buscarProcessosPorParte,
  buscarEmTodosTribunais,
  converterDadosDataJud,
  obterTribunaisPorCategoria,
  TRIBUNAIS 
} from '../services/dataJudService';

const DataJudSearchModal = ({ isOpen, onClose, onSelectProcess }) => {
  const [searchType, setSearchType] = useState('numero'); // 'numero', 'avancado', 'texto', 'advogado', 'parte'
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [selectedTribunals, setSelectedTribunals] = useState([]);
  const [searchAllTribunals, setSearchAllTribunals] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState({});

  // Formulário de busca por número
  const [numeroProcesso, setNumeroProcesso] = useState('');

  // Formulário de busca avançada
  const [searchForm, setSearchForm] = useState({
    numeroProcesso: '',
    classeProcessual: '',
    orgaoJulgador: '',
    assunto: '',
    dataInicio: '',
    dataFim: '',
    grau: '',
    tamanho: 10,
    offset: 0
  });

  // Formulário de busca por texto
  const [searchText, setSearchText] = useState('');

  // Formulário de busca por advogado
  const [nomeAdvogado, setNomeAdvogado] = useState('');

  // Formulário de busca por parte
  const [nomeParte, setNomeParte] = useState('');

  const categorias = obterTribunaisPorCategoria();

  useEffect(() => {
    if (isOpen) {
      // Reset ao abrir modal
      setResults([]);
      setNumeroProcesso('');
      setSearchText('');
      setNomeAdvogado('');
      setNomeParte('');
      setSearchForm({
        numeroProcesso: '',
        classeProcessual: '',
        orgaoJulgador: '',
        assunto: '',
        dataInicio: '',
        dataFim: '',
        grau: '',
        tamanho: 10,
        offset: 0
      });
    }
  }, [isOpen]);

  const handleSearch = async () => {
    if (!validateSearch()) return;

    setLoading(true);
    setResults([]);

    try {
      let searchResults = [];
      const tribunaisParaBuscar = searchAllTribunals ? [] : selectedTribunals;

      switch (searchType) {
        case 'numero':
          // Remove formatação antes de enviar
          const cleanNumber = numeroProcesso.replace(/\D/g, '');
          searchResults = await buscarProcessoPorNumero(cleanNumber, tribunaisParaBuscar);
          break;
        case 'avancado':
          searchResults = await buscarProcessoAvancado(searchForm, tribunaisParaBuscar);
          break;
        case 'texto':
          searchResults = await buscarProcessoPorTexto(searchText, tribunaisParaBuscar);
          break;
        case 'advogado':
          searchResults = await buscarProcessosPorAdvogado(nomeAdvogado, tribunaisParaBuscar);
          break;
        case 'parte':
          searchResults = await buscarProcessosPorParte(nomeParte, tribunaisParaBuscar);
          break;
        default:
          break;
      }

      console.log('🔍 Resultado bruto da busca:', searchResults);
      
      // Garantir que searchResults.data é um array
      if (searchResults && searchResults.data && Array.isArray(searchResults.data)) {
        console.log('✅ Resultados obtidos (estrutura com .data):', searchResults.data);
        setResults(searchResults.data);
      } else if (Array.isArray(searchResults)) {
        console.log('✅ Resultados obtidos (array direto):', searchResults);
        setResults(searchResults);
      } else {
        console.warn('⚠️ Formato de resultados inesperado:', searchResults);
        setResults([]);
      }
    } catch (error) {
      console.error('Erro na busca:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const validateSearch = () => {
    switch (searchType) {
        case 'numero':
          if (!numeroProcesso.trim()) {
            alert('Por favor, informe o número do processo');
            return false;
          }
          // Remove formatação para validar
          const cleanNumber = numeroProcesso.replace(/\D/g, '');
          if (cleanNumber.length !== 20) {
            alert('O número do processo deve ter 20 dígitos');
            return false;
          }
          break;
      case 'avancado':
        if (!searchForm.numeroProcesso && !searchForm.classeProcessual && !searchForm.orgaoJulgador && !searchForm.assunto) {
          alert('Por favor, preencha pelo menos um campo para busca avançada');
          return false;
        }
        break;
      case 'texto':
        if (!searchText.trim()) {
          alert('Por favor, informe o texto para busca');
          return false;
        }
        break;
      case 'advogado':
        if (!nomeAdvogado.trim()) {
          alert('Por favor, informe o nome do advogado');
          return false;
        }
        break;
      case 'parte':
        if (!nomeParte.trim()) {
          alert('Por favor, informe o nome da parte');
          return false;
        }
        break;
      default:
        return false;
    }
    return true;
  };

  const handleTribunalToggle = (tribunal) => {
    setSelectedTribunals(prev => 
      prev.includes(tribunal) 
        ? prev.filter(t => t !== tribunal)
        : [...prev, tribunal]
    );
  };

  const handleCategoryToggle = (category) => {
    const tribunaisCategoria = categorias[category];
    const todosSeleecionados = tribunaisCategoria.every(t => selectedTribunals.includes(t));
    
    if (todosSeleecionados) {
      setSelectedTribunals(prev => prev.filter(t => !tribunaisCategoria.includes(t)));
    } else {
      setSelectedTribunals(prev => [...new Set([...prev, ...tribunaisCategoria])]);
    }
  };

  const handleSelectProcess = (process) => {
    console.log('🔍 Processo selecionado do DataJud:', process);
    const convertedProcess = converterDadosDataJud(process);
    console.log('🔄 Processo convertido:', convertedProcess);
    onSelectProcess(convertedProcess);
    onClose();
  };

  const formatProcessNumber = (number) => {
    if (!number) return '';
    // Remove todos os caracteres não numéricos
    const digits = number.replace(/\D/g, '');
    // Aplica a formatação apenas se tiver 20 dígitos
    if (digits.length === 20) {
      return `${digits.substring(0, 7)}-${digits.substring(7, 9)}.${digits.substring(9, 13)}.${digits.substring(13, 14)}.${digits.substring(14, 16)}.${digits.substring(16)}`;
    }
    return number;
  };

  const handleProcessNumberChange = (value) => {
    // Remove formatação anterior
    const cleanValue = value.replace(/\D/g, '');
    // Aplica nova formatação conforme o usuário digita
    if (cleanValue.length <= 20) {
      setNumeroProcesso(cleanValue);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Buscar Processo - DataJud</h2>
            <p className="text-sm text-gray-600 mt-1">
              Busque processos públicos de todos os tribunais do Brasil
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {/* Tipo de busca */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de busca</label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="numero"
                  checked={searchType === 'numero'}
                  onChange={(e) => setSearchType(e.target.value)}
                  className="mr-2"
                />
                Por número
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="avancado"
                  checked={searchType === 'avancado'}
                  onChange={(e) => setSearchType(e.target.value)}
                  className="mr-2"
                />
                Busca avançada
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="texto"
                  checked={searchType === 'texto'}
                  onChange={(e) => setSearchType(e.target.value)}
                  className="mr-2"
                />
                Busca por texto
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="advogado"
                  checked={searchType === 'advogado'}
                  onChange={(e) => setSearchType(e.target.value)}
                  className="mr-2"
                />
                Por advogado
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="parte"
                  checked={searchType === 'parte'}
                  onChange={(e) => setSearchType(e.target.value)}
                  className="mr-2"
                />
                Por parte
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Formulário de busca */}
            <div className="lg:col-span-2">
              {searchType === 'numero' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número do processo *
                  </label>
                  <input
                    type="text"
                    value={formatProcessNumber(numeroProcesso)}
                    onChange={(e) => handleProcessNumberChange(e.target.value)}
                    placeholder="Ex: 1234567-89.2024.8.26.0001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {searchType === 'avancado' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Número do processo
                      </label>
                      <input
                        type="text"
                        value={searchForm.numeroProcesso}
                        onChange={(e) => setSearchForm({...searchForm, numeroProcesso: e.target.value})}
                        placeholder="Ex: 1234567-89.2024.8.26.0001"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Classe processual (código)
                      </label>
                      <input
                        type="text"
                        value={searchForm.classeProcessual}
                        onChange={(e) => setSearchForm({...searchForm, classeProcessual: e.target.value})}
                        placeholder="Ex: 1116"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Órgão julgador (código)
                      </label>
                      <input
                        type="text"
                        value={searchForm.orgaoJulgador}
                        onChange={(e) => setSearchForm({...searchForm, orgaoJulgador: e.target.value})}
                        placeholder="Ex: 13597"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Assunto (código)
                      </label>
                      <input
                        type="text"
                        value={searchForm.assunto}
                        onChange={(e) => setSearchForm({...searchForm, assunto: e.target.value})}
                        placeholder="Ex: 6017"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Data início
                      </label>
                      <input
                        type="date"
                        value={searchForm.dataInicio}
                        onChange={(e) => setSearchForm({...searchForm, dataInicio: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Data fim
                      </label>
                      <input
                        type="date"
                        value={searchForm.dataFim}
                        onChange={(e) => setSearchForm({...searchForm, dataFim: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {searchType === 'texto' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Texto para busca *
                  </label>
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Ex: execução fiscal, cobrança, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {searchType === 'advogado' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do advogado *
                  </label>
                  <input
                    type="text"
                    value={nomeAdvogado}
                    onChange={(e) => setNomeAdvogado(e.target.value)}
                    placeholder="Ex: João Silva Santos"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      <strong>⚠️ Importante:</strong> Esta busca é limitada devido a restrições de privacidade do DataJud. 
                      Procura por menções ao nome em documentos públicos disponíveis.
                    </p>
                  </div>
                </div>
              )}

              {searchType === 'parte' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome da parte *
                  </label>
                  <input
                    type="text"
                    value={nomeParte}
                    onChange={(e) => setNomeParte(e.target.value)}
                    placeholder="Ex: Maria dos Santos"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      <strong>⚠️ Importante:</strong> Esta busca é limitada devido a restrições de privacidade do DataJud. 
                      Procura por menções ao nome em documentos públicos disponíveis.
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-6 flex gap-4">
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Buscando...
                    </>
                  ) : (
                    'Buscar'
                  )}
                </button>
                <button
                  onClick={() => setResults([])}
                  className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400"
                >
                  Limpar
                </button>
              </div>
            </div>

            {/* Seleção de tribunais */}
            <div className="border border-gray-300 rounded-lg p-4 max-h-96 overflow-y-auto">
              <h3 className="font-semibold text-gray-900 mb-4">Tribunais</h3>
              
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={searchAllTribunals}
                    onChange={(e) => setSearchAllTribunals(e.target.checked)}
                    className="mr-2"
                  />
                  Buscar em todos os tribunais
                </label>
              </div>

              {!searchAllTribunals && (
                <div className="space-y-3">
                  {Object.entries(categorias).map(([categoria, tribunais]) => (
                    <div key={categoria}>
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setExpandedCategories(prev => ({
                            ...prev,
                            [categoria]: !prev[categoria]
                          }))}
                          className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
                        >
                          <svg
                            className={`w-4 h-4 mr-2 transform transition-transform ${
                              expandedCategories[categoria] ? 'rotate-90' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          {categoria}
                        </button>
                        <button
                          onClick={() => handleCategoryToggle(categoria)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          {tribunais.every(t => selectedTribunals.includes(t)) ? 'Desmarcar' : 'Marcar'} todos
                        </button>
                      </div>
                      
                      {expandedCategories[categoria] && (
                        <div className="ml-6 mt-2 space-y-1">
                          {tribunais.map(tribunal => (
                            <label key={tribunal} className="flex items-center text-sm">
                              <input
                                type="checkbox"
                                checked={selectedTribunals.includes(tribunal)}
                                onChange={() => handleTribunalToggle(tribunal)}
                                className="mr-2"
                              />
                              {tribunal} - {TRIBUNAIS[tribunal]?.nome}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Resultados */}
          {results.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                ✅ Resultados encontrados ({results.length})
              </h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {results.map((process, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-gray-900">
                            {formatProcessNumber(process.numeroProcesso)}
                          </h4>
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                            {process.tribunalNome || process.tribunal}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Classe:</span>
                            <p className="text-gray-600">{process.classe?.nome || 'Não informado'}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Órgão:</span>
                            <p className="text-gray-600">{process.orgaoJulgador?.nome || 'Não informado'}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Data ajuizamento:</span>
                            <p className="text-gray-600">{formatDate(process.dataAjuizamento)}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Grau:</span>
                            <p className="text-gray-600">{process.grau || 'Não informado'}</p>
                          </div>
                        </div>
                        
                        {process.assuntos && process.assuntos.length > 0 && (
                          <div className="mt-2">
                            <span className="font-medium text-gray-700">Assuntos:</span>
                            <p className="text-gray-600 text-sm">
                              {process.assuntos.map(a => a.nome).join(', ')}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={() => handleSelectProcess(process)}
                        className="ml-4 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm"
                      >
                        Selecionar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.length === 0 && !loading && (
            <div className="mt-8 text-center text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>Nenhum resultado encontrado ou realize uma busca</p>
              <p className="text-sm mt-2">Use o formulário acima para buscar processos no DataJud</p>
            </div>
          )}

          {loading && (
            <div className="mt-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Buscando processos nos tribunais...</p>
              <p className="text-sm text-gray-500 mt-1">Isso pode levar alguns momentos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataJudSearchModal;
