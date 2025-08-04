import React, { useState } from 'react';
import { 
  buscarProcessoPorNumero, 
  buscarProcessosPorDocumento,
  buscarProcessosPorNome,
  processarEntradaUsuario,
  formatarNumeroProcesso,
  obterInfoTribunal 
} from '../services/dataJudService';

const DataJudSearchModalSimple = ({ isOpen, onClose, onProcessoSelect }) => {
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [processoSelecionado, setProcessoSelecionado] = useState(null);

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (!busca.trim()) {
      setError('Digite algo para buscar');
      return;
    }

    setLoading(true);
    setError('');
    setResultados([]);

    try {
      console.log('🔍 Iniciando busca:', busca);
      
      // Processar entrada do usuário para identificar o tipo
      const entrada = processarEntradaUsuario(busca);
      console.log('📝 Entrada processada:', entrada);

      let result;

      switch (entrada.tipo) {
        case 'numeroProcesso':
          if (!entrada.valido) {
            setError('Número de processo inválido (dígito verificador incorreto)');
            setLoading(false);
            return;
          }
          result = await buscarProcessoPorNumero(entrada.valor);
          break;

        case 'cpf':
        case 'cnpj':
          result = await buscarProcessosPorDocumento(entrada.valor);
          break;

        case 'nome':
          result = await buscarProcessosPorNome(entrada.valor);
          break;

        default:
          setError('Formato não reconhecido. Digite um número de processo (20 dígitos), CPF/CNPJ ou nome');
          setLoading(false);
          return;
      }

      console.log('📋 Resultado da busca:', result);

      if (result.success) {
        const dados = Array.isArray(result.data) ? result.data : [result.data];
        setResultados(dados);
        
        if (dados.length === 0) {
          setError('Nenhum processo encontrado');
        } else if (result.isSimulated) {
          setError('⚠️ Dados simulados - API DataJud não disponível');
        }
      } else {
        setError(result.error || 'Erro na busca');
      }
    } catch (err) {
      console.error('❌ Erro na busca:', err);
      setError('Erro inesperado na busca');
    }

    setLoading(false);
  };

  const handleProcessoClick = (processo) => {
    setProcessoSelecionado(processo);
  };

  const handleSelecionarProcesso = () => {
    if (processoSelecionado && onProcessoSelect) {
      onProcessoSelect(processoSelecionado);
    }
    onClose();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">🏛️ Consulta DataJud - CNJ</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Campo de Busca */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Digite o número do processo, CPF/CNPJ ou nome
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ex: 1234567-89.2023.8.05.0001 ou 123.456.789-00 ou João Silva"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg hover:shadow-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Buscando...
                  </div>
                ) : (
                  '🔍 Buscar'
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              📝 Formatos aceitos: Número de processo (20 dígitos), CPF (11 dígitos), CNPJ (14 dígitos) ou nome completo
            </p>
          </div>

          {/* Mensagem de Erro */}
          {error && (
            <div className={`mb-6 p-4 rounded-lg border ${
              error.includes('simulados') 
                ? 'bg-yellow-50 border-yellow-200 text-yellow-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">{error}</span>
              </div>
            </div>
          )}

          {/* Resultados */}
          {resultados.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                📋 Resultados da Busca ({resultados.length})
              </h3>
              
              {resultados.map((processo, index) => (
                <div
                  key={processo._id || index}
                  onClick={() => handleProcessoClick(processo)}
                  className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                    processoSelecionado === processo
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Cabeçalho do Processo */}
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded ${
                          processo.isSimulated 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {processo.isSimulated ? '📊 Simulado' : '🏛️ DataJud'}
                        </span>
                        {processo.numeroProcesso && (
                          <span className="text-sm text-gray-600 font-mono">
                            {formatarNumeroProcesso(processo.numeroProcesso)}
                          </span>
                        )}
                      </div>
                      
                      {/* Classe do Processo */}
                      {processo.classe && (
                        <h4 className="font-semibold text-gray-800 mb-1">
                          {typeof processo.classe === 'object' ? processo.classe.nome : processo.classe}
                        </h4>
                      )}
                      
                      {/* Assunto */}
                      {processo.assuntos && processo.assuntos.length > 0 && (
                        <p className="text-sm text-gray-600 mb-2">
                          📝 {processo.assuntos[0].nome || processo.assuntos[0]}
                        </p>
                      )}
                      
                      {/* Informações do Tribunal */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-500">
                        {processo.dataAjuizamento && (
                          <div>📅 Ajuizamento: {new Date(processo.dataAjuizamento).toLocaleDateString('pt-BR')}</div>
                        )}
                        {processo.orgaoJulgador && (
                          <div>🏛️ Órgão: {
                            typeof processo.orgaoJulgador === 'object' 
                              ? processo.orgaoJulgador.nome 
                              : processo.orgaoJulgador
                          }</div>
                        )}
                        {processo.tribunalNome && (
                          <div>⚖️ {processo.tribunalNome}</div>
                        )}
                        {processo.grau && (
                          <div>📊 {processo.grau}</div>
                        )}
                      </div>

                      {/* Última Movimentação */}
                      {processo.movimentos && processo.movimentos.length > 0 && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                          <span className="font-medium">Última movimentação:</span>
                          <br />
                          {processo.movimentos[processo.movimentos.length - 1].nome} - {
                            new Date(processo.movimentos[processo.movimentos.length - 1].dataHora).toLocaleDateString('pt-BR')
                          }
                        </div>
                      )}
                    </div>
                    
                    {/* Indicador de Seleção */}
                    {processoSelecionado === processo && (
                      <div className="ml-4">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Botões de Ação */}
          {processoSelecionado && (
            <div className="mt-6 flex justify-end space-x-4 pt-4 border-t border-gray-200">
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSelecionarProcesso}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg hover:shadow-lg transition-all duration-200"
              >
                Selecionar Processo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataJudSearchModalSimple;
