import React, { useState } from 'react';
import { Book, Calendar, Star, ExternalLink, RefreshCw, Sparkles, ArrowRight, Check } from 'lucide-react';
import Head from 'next/head';

export default function BookRecommendationApp() {
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [step, setStep] = useState('start'); // 'start', 'selecting', 'recommendations'
  const [readwiseBooks, setReadwiseBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [error, setError] = useState(null);

  // Fetch random selection from Readwise library (books only)
  const fetchRandomBooks = async () => {
    setLoading(true);
    setError(null);
    setLoadingStage('Accessing your library...');
    
    try {
      const response = await fetch('/api/readwise');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch Readwise data');
      }
      const data = await response.json();
      
      // Filter to only include actual books (not articles, tweets, etc.)
      const booksOnly = data.results.filter(item => {
        // Filter criteria for books
        const hasAuthor = item.author && item.author.trim() !== '';
        const hasTitle = item.title && item.title.trim() !== '';
        const titleNotUrl = !item.title.includes('http') && !item.title.includes('www.');
        const notTweet = !item.source_url?.includes('twitter.com') && !item.source_url?.includes('x.com');
        const notArticle = !item.source_url?.includes('medium.com') && 
                          !item.source_url?.includes('substack.com') &&
                          !item.source_url?.includes('blog');
        const likelyBook = item.category === 'books' || 
                          (item.author && item.author.length < 50) || // Authors usually have shorter names
                          item.cover_image_url; // Books often have cover images
        
        return hasAuthor && hasTitle && titleNotUrl && notTweet && notArticle && likelyBook;
      });
      
      // Get a random selection of 5 books
      const shuffled = booksOnly.sort(() => 0.5 - Math.random());
      const randomBooks = shuffled.slice(0, 5).map(book => ({
        id: book.id,
        title: book.title,
        author: book.author,
        notes: book.highlights?.map(h => h.text).join('. ') || book.summary || "No notes available",
        cover: book.cover_image_url
      }));

      setReadwiseBooks(randomBooks);
      setStep('selecting');
      
    } catch (error) {
      console.error('Error fetching Readwise data:', error);
      setError(error.message || 'Failed to fetch your reading library');
    }
    
    setLoading(false);
    setLoadingStage('');
  };

  // Search review sites based on selected book
  const findSimilarBooks = async (book) => {
    setLoading(true);
    setSelectedBook(book);
    setLoadingStage('Finding recommendations...');
    
    try {
      const response = await fetch('/api/find-similar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          referenceBook: book
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to find recommendations');
      }

      const data = await response.json();
      setRecommendations(data.recommendations);
      setStep('recommendations');
      
    } catch (error) {
      console.error('Error finding similar books:', error);
      setError(error.message || 'Failed to find recommendations');
    }
    
    setLoading(false);
    setLoadingStage('');
  };

  const startOver = () => {
    setStep('start');
    setReadwiseBooks([]);
    setSelectedBook(null);
    setRecommendations([]);
    setError(null);
  };

  const getAmazonInLink = (title, author) => {
    const searchQuery = encodeURIComponent(`${title} ${author}`);
    return `https://www.amazon.in/s?k=${searchQuery}&i=stripbooks`;
  };

  const getReviewLink = (url, title) => {
    if (url) return url;
    const searchQuery = encodeURIComponent(title);
    return `https://www.goodreads.com/search?q=${searchQuery}`;
  };

  return (
    <>
      <Head>
        <title>Discovery</title>
        <meta name="description" content="Curated book recommendations" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="bg-white border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-6 py-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-black rounded flex items-center justify-center mr-3">
                <Book className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-medium text-gray-900">Discovery</h1>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6">
          {/* Error Display */}
          {error && (
            <div className="py-8">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-red-900 mb-2">Unable to connect</h3>
                <p className="text-red-700 mb-4">{error}</p>
                <button 
                  onClick={startOver}
                  className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* Step 1: Start */}
          {step === 'start' && !error && (
            <section className="py-20 text-center">
              <div className="max-w-2xl mx-auto">
                <h2 className="text-4xl font-semibold text-gray-900 mb-6 leading-tight">
                  Find your next great read
                </h2>
                <p className="text-xl text-gray-600 mb-12 leading-relaxed">
                  Choose a book from your library that represents what you'd like to read next. 
                  We'll find similar recommendations from award winners and critics' picks.
                </p>
                <button
                  onClick={fetchRandomBooks}
                  disabled={loading}
                  className="bg-black text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-400 inline-flex items-center"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                      {loadingStage}
                    </>
                  ) : (
                    'Get started'
                  )}
                </button>
              </div>
            </section>
          )}

          {/* Step 2: Book Selection */}
          {step === 'selecting' && (
            <section className="py-16">
              <div className="text-center mb-16">
                <h2 className="text-3xl font-semibold text-gray-900 mb-4">Choose your direction</h2>
                <p className="text-lg text-gray-600">Which style appeals to you right now?</p>
              </div>

              <div className="space-y-6 max-w-3xl mx-auto">
                {readwiseBooks.map((book, index) => (
                  <div 
                    key={book.id} 
                    className="border border-gray-200 rounded-xl p-6 hover:border-gray-300 hover:shadow-sm cursor-pointer transition-all duration-200"
                    onClick={() => findSimilarBooks(book)}
                  >
                    <div className="flex space-x-6">
                      <div className="flex-shrink-0">
                        {book.cover ? (
                          <img 
                            src={book.cover} 
                            alt={book.title}
                            className="w-20 h-28 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-20 h-28 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Book className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-gray-900 mb-1">{book.title}</h3>
                        <p className="text-gray-600 mb-3">by {book.author}</p>
                        <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                          {book.notes.slice(0, 150)}...
                        </p>
                        <div className="flex items-center text-black text-sm font-medium">
                          <span>Choose this style</span>
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center mt-12">
                <button 
                  onClick={fetchRandomBooks}
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  Show different books
                </button>
              </div>
            </section>
          )}

          {/* Loading for Step 2 */}
          {loading && step === 'selecting' && (
            <section className="py-32 text-center">
              <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-6 animate-spin" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{loadingStage}</h3>
              <p className="text-gray-600">Searching award winners and critics' picks...</p>
            </section>
          )}

          {/* Step 3: Recommendations */}
          {step === 'recommendations' && recommendations.length > 0 && (
            <section className="py-16">
              <div className="text-center mb-16">
                <div className="inline-flex items-center bg-green-50 text-green-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
                  <Check className="w-4 h-4 mr-2" />
                  Based on "{selectedBook?.title}"
                </div>
                <h2 className="text-3xl font-semibold text-gray-900 mb-4">Recommended for you</h2>
                <p className="text-lg text-gray-600">Curated from award winners and critics' selections</p>
              </div>

              <div className="space-y-12 max-w-4xl mx-auto">
                {recommendations.map((book, index) => (
                  <article key={index} className="border-b border-gray-100 pb-12 last:border-b-0">
                    <div className="grid md:grid-cols-6 gap-8">
                      {/* Book Cover */}
                      <div className="md:col-span-2">
                        {book.image ? (
                          <img 
                            src={book.image} 
                            alt={book.title}
                            className="w-full max-w-48 mx-auto aspect-[3/4] object-cover rounded-lg shadow-sm"
                          />
                        ) : (
                          <div className="w-full max-w-48 mx-auto aspect-[3/4] bg-gray-100 rounded-lg flex items-center justify-center shadow-sm">
                            <Book className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      {/* Book Details */}
                      <div className="md:col-span-4 space-y-6">
                        <div>
                          <h3 className="text-2xl font-semibold text-gray-900 mb-2">{book.title}</h3>
                          <p className="text-lg text-gray-600 mb-4">{book.author}</p>
                          
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-6">
                            <span className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {book.publicationDate}
                            </span>
                            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-medium">
                              {book.source}
                            </span>
                            {book.rating > 0 && (
                              <span className="flex items-center">
                                <Star className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
                                {book.rating}/5
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        <div>
                          <p className="text-gray-700 leading-relaxed mb-6">{book.description}</p>
                          
                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-gray-700 italic">{book.reason}</p>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-3">
                          <a
                            href={getAmazonInLink(book.title, book.author)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-black text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors inline-flex items-center"
                          >
                            Buy book
                            <ExternalLink className="w-4 h-4 ml-2" />
                          </a>
                          <a
                            href={getReviewLink(book.reviewUrl, book.title)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium hover:border-gray-400 transition-colors inline-flex items-center"
                          >
                            Read reviews
                            <ExternalLink className="w-4 h-4 ml-2" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="text-center pt-16">
                <button 
                  onClick={startOver}
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  Find more recommendations
                </button>
              </div>
            </section>
          )}

          {step === 'recommendations' && recommendations.length === 0 && !loading && (
            <section className="py-32 text-center">
              <Book className="w-12 h-12 text-gray-300 mx-auto mb-6" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No recommendations found</h3>
              <p className="text-gray-600 mb-6">We couldn't find similar books in our curated sources</p>
              <button 
                onClick={startOver}
                className="bg-black text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors"
              >
                Try different selection
              </button>
            </section>
          )}

          {/* Initial state */}
          {step === 'start' && !loading && !error && recommendations.length === 0 && readwiseBooks.length === 0 && (
            <section className="py-32 text-center">
              <Book className="w-12 h-12 text-gray-300 mx-auto mb-6" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to begin</h3>
              <p className="text-gray-600">Start your curated book discovery</p>
            </section>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-100 mt-24">
          <div className="max-w-6xl mx-auto px-6 py-8">
            <p className="text-sm text-gray-500 text-center">
              Curated recommendations from award winners and critics' selections
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
