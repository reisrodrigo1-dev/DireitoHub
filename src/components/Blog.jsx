
import React, { useEffect, useState } from 'react';
import { fetchLegalNews } from '../services/newsService';


const Blog = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadNews = async () => {
      setLoading(true);
      setError(null);
      try {
        const newsData = await fetchLegalNews(3);
        setNews(newsData);
      } catch (err) {
        setError('Erro ao carregar notícias jurídicas');
      } finally {
        setLoading(false);
      }
    };
    loadNews();
  }, []);

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Blog
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Mantenha-se atualizado com as últimas novidades do direito
          </p>
        </div>
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500 text-lg">Carregando notícias...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-red-700">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {news.slice(0, 3).map((article, idx) => (
              <article
                key={article.id || idx}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow overflow-hidden cursor-pointer group"
              >
                <div className="aspect-w-16 aspect-h-9 bg-gray-200">
                  <img
                    src={article.image || 'https://via.placeholder.com/400x250?text=Notícia+Jurídica'}
                    alt={article.title}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={e => { e.target.src = 'https://via.placeholder.com/400x250?text=Notícia+Jurídica'; }}
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center mb-3">
                    <span className="bg-blue-100 text-blue-600 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {article.source}
                    </span>
                    <span className="text-gray-500 text-sm ml-auto">
                      {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('pt-BR') : ''}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {article.description}
                  </p>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 font-medium text-sm group-hover:underline"
                  >
                    Ler matéria →
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Blog;
