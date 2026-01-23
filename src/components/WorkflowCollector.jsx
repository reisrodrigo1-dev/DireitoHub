import React, { useState } from 'react';

const WorkflowCollector = ({
  questions,
  answers,
  onAnswerChange,
  onComplete,
  currentQuestionIndex,
  isLoading
}) => {
  const [currentAnswer, setCurrentAnswer] = useState('');

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  const handleNext = () => {
    if (currentAnswer.trim()) {
      onAnswerChange(currentQuestion.id, currentAnswer.trim());
      
      if (isLastQuestion) {
        onComplete();
      } else {
        setCurrentAnswer('');
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleNext();
    }
  };

  if (!currentQuestion) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-4">
      <div className="flex items-center mb-4">
        <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
          {currentQuestionIndex + 1}
        </div>
        <h3 className="text-lg font-semibold text-gray-800">
          Configuração Estratégica da Apelação
        </h3>
      </div>

      <div className="mb-4">
        <p className="text-gray-700 font-medium mb-2">
          {currentQuestion.question}
        </p>
        
        {currentQuestion.type === 'select' && currentQuestion.options ? (
          <select
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          >
            <option value="">Selecione uma opção...</option>
            {currentQuestion.options.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : currentQuestion.type === 'multiselect' && currentQuestion.options ? (
          <div className="space-y-2">
            {currentQuestion.options.map((option, index) => (
              <label key={index} className="flex items-center">
                <input
                  type="checkbox"
                  checked={currentAnswer.includes(option)}
                  onChange={(e) => {
                    const currentAnswers = currentAnswer ? currentAnswer.split(', ') : [];
                    if (e.target.checked) {
                      currentAnswers.push(option);
                    } else {
                      const index = currentAnswers.indexOf(option);
                      if (index > -1) currentAnswers.splice(index, 1);
                    }
                    setCurrentAnswer(currentAnswers.join(', '));
                  }}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={isLoading}
                />
                <span className="text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        ) : (
          <textarea
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua resposta..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            disabled={isLoading}
          />
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Pergunta {currentQuestionIndex + 1} de {questions.length}
        </div>
        
        <button
          onClick={handleNext}
          disabled={!currentAnswer.trim() || isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processando...
            </div>
          ) : isLastQuestion ? (
            'Finalizar Configuração'
          ) : (
            'Próxima Pergunta'
          )}
        </button>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        💡 Dica: Suas respostas personalizarão a profundidade e enfoque da apelação criminal.
      </div>
    </div>
  );
};

export default WorkflowCollector;