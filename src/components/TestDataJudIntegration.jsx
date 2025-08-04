import React, { useState } from 'react';
import DataJudSearchModalSimple from './DataJudSearchModalSimple';

const TestDataJudIntegration = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [processoSelecionado, setProcessoSelecionado] = useState(null);

  const handleProcessoSelect = (processo) => {
    setProcessoSelecionado(processo);
    console.log('✅ Processo selecionado:', processo);
  };

  // Números de processo válidos para teste
  const exemplosTeste = [
    '12345678901234567890', // Número válido simulado
    '5005618-95.2020.4.03.6109', // Formato com pontuação
    '123.456.789-00', // CPF
    '12.345.678/0001-90', // CNPJ
    'João da Silva' // Nome
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          🧪 Teste - Integração DataJud
        </h1>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Esta página testa a integração com a API pública do DataJud (CNJ).
            A integração tenta buscar dados reais e, se não estiver disponível, 
            retorna dados simulados para demonstração.
          </p>
          
          <button
            onClick={() => setModalOpen(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            🔍 Abrir Modal de Busca
          </button>
        </div>

        {/* Exemplos para Teste */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">📝 Exemplos para Teste:</h3>
          <div className="space-y-2">
            {exemplosTeste.map((exemplo, index) => (
              <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                <code className="text-sm text-gray-700">{exemplo}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(exemplo);
                    alert('Copiado!');
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  📋 Copiar
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Resultado da Seleção */}
        {processoSelecionado && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-3">✅ Processo Selecionado:</h3>
            <div className="bg-white p-4 rounded border">
              <pre className="text-sm text-gray-700 overflow-auto">
                {JSON.stringify(processoSelecionado, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Logs e Informações Técnicas */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-3">ℹ️ Informações Técnicas:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• A integração tenta primeiro a API direta do DataJud</li>
            <li>• Se falhar, tenta um backend local (se disponível)</li>
            <li>• Como último recurso, retorna dados simulados</li>
            <li>• Verifique o console do navegador para logs detalhados</li>
            <li>• Dados simulados são marcados com o flag `isSimulated: true`</li>
          </ul>
        </div>
      </div>

      {/* Modal de Busca */}
      <DataJudSearchModalSimple
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onProcessoSelect={handleProcessoSelect}
      />
    </div>
  );
};

export default TestDataJudIntegration;
