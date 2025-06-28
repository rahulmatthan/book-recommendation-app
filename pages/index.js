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

  // Fetch random selection from Readwise library
  const fetchRandomBooks = async () => {
    setLoading(true);
    setError(null);
    setLoadingStage('Fetching your reading library...');
    
    try {
      const response = await fetch('/api/readwise');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch Readwise data');
      }
      const data = await response.json();
      
      // Get a random selection of 5 books
      const shuffled = data.results.sort(() => 0.5 - Math.random());
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
    setLoadingStage('Searching prestigious book review sites...');
    
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
        <title>The Literary Gazette - Curated Book Discovery</title>
        <meta name="description" content="Discover your next great read through curated recommendations from prestigious book review sources" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-white py-12 px-6 font-serif">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12 border-b-4 border-black pb-8">
            <div className="mb-6">
              <h1 className="text-5xl font-bold text-black mb-2 tracking-wide">THE LITERARY GAZETTE</h1>
              <div className="w-32 h-0.5 bg-black mx-auto mb-4"></div>
              <p className="text-lg text-gray-700 italic">Curated by Leading Review Publications • Est. 2025</p>
            </div>
            <div className="flex items-center justify-center">
              <Book className="w-6 h-6 text-black mr-2" />
              <span className="text-sm font-semibold tracking-widest uppercase">Expert-Curated Literary Discovery</span>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="border-2 border-red-600 bg-red-50 p-6 mb-8">
              <div className="flex items-center justify-center">
                <span className="text-red-800 font-bold text-sm tracking-wide uppercase">Configuration Error</span>
              </div>
              <p className="text-red-700 text-center mt-2 text-sm">{error}</p>
              <button 
                onClick={startOver}
                className="mt-4 mx-auto block bg-red-600 text-white px-4 py-2 text-sm uppercase tracking-wide"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Step 1: Start */}
          {step === 'start' && !error && (
            <div className="text-center mb-12">
              <div className="border-2 border-black p-8 bg-gray-50">
                <h2 className="text-2xl font-bold mb-4 text-black">DISCOVER YOUR NEXT LITERARY PURSUIT</h2>
                <p className="text-gray-700 mb-6 italic">
                  We'll show you 5 books from your library. Choose one that represents the type of book you'd like to read next, 
                  and we'll find similar recommendations from prestigious review sources.
                </p>
                <button
                  onClick={fetchRandomBooks}
                  disabled={loading}
                  className="bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white px-12 py-4 border-2 border-black font-bold text-sm tracking-widest uppercase transition-colors duration-200 flex items-center mx-auto"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 mr-3 animate-spin" />
                      {loadingStage}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-3" />
                      Begin Discovery
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Book Selection */}
          {step === 'selecting' && (
            <div className="mb-12">
              <div className="text-center border-b-2 border-black pb-4 mb-8">
                <h2 className="text-3xl font-bold text-black mb-2">CHOOSE YOUR DIRECTION</h2>
                <p className="text-gray-700 italic">Select the book that best represents what you'd like to read next</p>
              </div>

              <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                {readwiseBooks.map((book, index) => (
                  <div 
                    key={book.id} 
                    className="border-2 border-black p-6 bg-white hover:bg-gray-50 cursor-pointer transition-all duration-200 hover:shadow-lg"
                    onClick={() => findSimilarBooks(book)}
                  >
                    <div className="flex items-start space-x-4">
                      {book.cover && (
                        <img 
                          src={book.cover} 
                          alt={book.title}
                          className="w-16 h-24 object-cover border border-gray-300"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-black mb-1 leading-tight">{book.title}</h3>
                        <p className="text-gray-800 font-semibold mb-3">by {book.author}</p>
                        <p className="text-gray-700 text-sm line-clamp-3 mb-4">
                          {book.notes.slice(0, 150)}...
                        </p>
                        <div className="flex items-center text-black">
                          <span className="text-sm font-bold tracking-wide uppercase">Choose This Direction</span>
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center mt-8">
                <button 
                  onClick={fetchRandomBooks}
                  className="bg-white hover:bg-gray-100 text-black border-2 border-black px-6 py-3 text-sm font-bold tracking-wide uppercase"
                >
                  Show Different Books
                </button>
              </div>
            </div>
          )}

          {/* Loading for Step 2 */}
          {loading && step === 'selecting' && (
            <div className="text-center py-16 border-2 border-black bg-gray-50">
              <RefreshCw className="w-12 h-12 text-black mx-auto mb-4 animate-spin" />
              <h3 className="text-xl font-bold text-black mb-2 tracking-wide uppercase">{loadingStage}</h3>
              <p className="text-gray-700 italic">Consulting FT Reviews, LRB, and other prestigious sources...</p>
            </div>
          )}

          {/* Step 3: Recommendations */}
          {step === 'recommendations' && recommendations.length > 0 && (
            <div className="space-y-8">
              <div className="text-center border-b-2 border-black pb-4 mb-8">
                <h2 className="text-3xl font-bold text-black mb-2">CURATED RECOMMENDATIONS</h2>
                <div className="flex items-center justify-center mb-4">
                  <Check className="w-5 h-5 text-black mr-2" />
                  <span className="text-sm font-semibold tracking-widest uppercase">Based on: "{selectedBook?.title}"</span>
                </div>
                <p className="text-gray-700 italic">From Financial Times, London Review of Books, and other leading critics</p>
              </div>

              {recommendations.map((book, index) => (
                <article key={index} className="border-2 border-black p-8 bg-white mb-8 hover:bg-gray-50 transition-colors duration-200">
                  <header className="mb-6 pb-4 border-b border-gray-300">
                    <h3 className="text-2xl font-bold text-black mb-2 leading-tight">{book.title}</h3>
                    <p className="text-lg text-gray-800 font-semibold mb-3">by {book.author}</p>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-black">
                      <span className="flex items-center font-semibold">
                        <Calendar className="w-4 h-4 mr-1" />
                        {book.publicationDate}
                      </span>
                      <span className="px-3 py-1 border border-black text-black text-xs font-bold tracking-wide uppercase">
                        {book.source}
                      </span>
                      {book.rating > 0 && (
                        <span className="flex items-center font-semibold">
                          <Star className="w-4 h-4 mr-1 fill-black text-black" />
                          {book.rating}/5
                        </span>
                      )}
                    </div>
                  </header>

                  <div className="mb-6">
                    <p className="text-gray-800 leading-relaxed text-justify mb-4">{book.description}</p>
                    
                    <div className="border-l-4 border-black pl-4 bg-gray-50 p-4">
                      <h4 className="font-bold text-black text-sm tracking-wide uppercase mb-2">Critical Assessment</h4>
                      <p className="text-gray-800 italic leading-relaxed">
                        {book.reason}
                      </p>
                    </div>
                  </div>

                  <footer className="flex gap-4 pt-4 border-t border-gray-300">
                    <a
                      href={getAmazonInLink(book.title, book.author)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-black hover:bg-gray-800 text-white px-6 py-3 border-2 border-black text-sm font-bold tracking-wide uppercase transition-colors duration-200 flex items-center"
                    >
                      Purchase • Amazon.in
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                    <a
                      href={getReviewLink(book.reviewUrl, book.title)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white hover:bg-gray-100 text-black border-2 border-black px-6 py-3 text-sm font-bold tracking-wide uppercase transition-colors duration-200 flex items-center"
                    >
                      Read Review
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                  </footer>
                </article>
              ))}

              <div className="text-center pt-8 border-t-2 border-black">
                <button 
                  onClick={startOver}
                  className="bg-black hover:bg-gray-800 text-white px-8 py-3 border-2 border-black text-sm font-bold tracking-wide uppercase"
                >
                  Find More Recommendations
                </button>
              </div>
            </div>
          )}

          {step === 'recommendations' && recommendations.length === 0 && !loading && (
            <div className="text-center py-16 border-2 border-black bg-gray-50">
              <Book className="w-24 h-24 text-black mx-auto mb-6" />
              <h3 className="text-xl font-bold text-black mb-2 tracking-wide uppercase">No Recommendations Found</h3>
              <p className="text-gray-700 italic mb-4">We couldn't find similar books in our review sources</p>
              <button 
                onClick={startOver}
                className="bg-black hover:bg-gray-800 text-white px-6 py-3 text-sm font-bold tracking-wide uppercase"
              >
                Try Different Selection
              </button>
            </div>
          )}

          {/* Initial state */}
          {step === 'start' && !loading && !error && recommendations.length === 0 && readwiseBooks.length === 0 && (
            <div className="text-center py-16 border-2 border-black bg-gray-50">
              <Book className="w-24 h-24 text-black mx-auto mb-6" />
              <h3 className="text-xl font-bold text-black mb-2 tracking-wide uppercase">Ready to Discover</h3>
              <p className="text-gray-700 italic">Click above to begin your curated literary journey</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
