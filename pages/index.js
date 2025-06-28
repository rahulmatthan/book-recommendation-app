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
    setLoadingStage('Fetching your book library...');
    
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
    setLoadingStage('Finding similar books from review sources...');
    
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
        <title>Book Discovery - Curated Recommendations</title>
        <meta name="description" content="Discover your next great read through curated recommendations from prestigious book review sources" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-6 font-sans">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-8">
              <Book className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-bold text-gray-800 mb-4">Book Discovery</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Find your next great read through personalized recommendations from leading book critics and review sources
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-6 mb-8 rounded-lg">
              <div className="flex items-center">
                <div className="text-red-700">
                  <h3 className="text-lg font-semibold">Something went wrong</h3>
                  <p className="mt-2 text-red-600">{error}</p>
                  <button 
                    onClick={startOver}
                    className="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Start */}
          {step === 'start' && !error && (
            <div className="text-center mb-16">
              <div className="bg-white rounded-2xl p-12 shadow-lg max-w-2xl mx-auto">
                <h2 className="text-3xl font-bold text-gray-800 mb-6">Let's Find Your Next Book</h2>
                <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                  We'll show you 5 books from your Readwise library. Choose one that represents 
                  the type of book you'd like to read next, and we'll find similar recommendations 
                  from prestigious review sources.
                </p>
                <button
                  onClick={fetchRandomBooks}
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg disabled:opacity-50 flex items-center mx-auto"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-6 h-6 mr-3 animate-spin" />
                      {loadingStage}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-6 h-6 mr-3" />
                      Start Discovery
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Book Selection */}
          {step === 'selecting' && (
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-gray-800 mb-4">Choose Your Direction</h2>
                <p className="text-xl text-gray-600">Which type of book would you like to explore?</p>
              </div>

              <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2">
                {readwiseBooks.map((book, index) => (
                  <div 
                    key={book.id} 
                    className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl cursor-pointer transition-all duration-300 hover:scale-105 border border-gray-100"
                    onClick={() => findSimilarBooks(book)}
                  >
                    <div className="flex space-x-6">
                      <div className="flex-shrink-0">
                        {book.cover ? (
                          <img 
                            src={book.cover} 
                            alt={book.title}
                            className="w-24 h-36 object-cover rounded-lg shadow-md"
                          />
                        ) : (
                          <div className="w-24 h-36 bg-gradient-to-b from-gray-200 to-gray-300 rounded-lg flex items-center justify-center shadow-md">
                            <Book className="w-8 h-8 text-gray-500" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-gray-800 mb-2 leading-tight">{book.title}</h3>
                        <p className="text-lg text-gray-600 mb-4 font-medium">by {book.author}</p>
                        <p className="text-gray-600 text-sm leading-relaxed mb-6 line-clamp-3">
                          {book.notes.slice(0, 200)}...
                        </p>
                        <div className="flex items-center text-blue-600 font-semibold">
                          <span>Choose this style</span>
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center mt-12">
                <button 
                  onClick={fetchRandomBooks}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold transition-colors"
                >
                  Show Different Books
                </button>
              </div>
            </div>
          )}

          {/* Loading for Step 2 */}
          {loading && step === 'selecting' && (
            <div className="text-center py-20">
              <div className="bg-white rounded-2xl p-12 shadow-lg max-w-lg mx-auto">
                <RefreshCw className="w-16 h-16 text-blue-500 mx-auto mb-6 animate-spin" />
                <h3 className="text-2xl font-bold text-gray-800 mb-4">{loadingStage}</h3>
                <p className="text-gray-600">Searching through review sources and literary publications...</p>
              </div>
            </div>
          )}

          {/* Step 3: Recommendations */}
          {step === 'recommendations' && recommendations.length > 0 && (
            <div className="space-y-12">
              <div className="text-center mb-12">
                <div className="inline-flex items-center bg-green-100 text-green-800 px-6 py-3 rounded-full mb-6">
                  <Check className="w-5 h-5 mr-2" />
                  <span className="font-semibold">Based on: "{selectedBook?.title}"</span>
                </div>
                <h2 className="text-4xl font-bold text-gray-800 mb-4">Your Curated Recommendations</h2>
                <p className="text-xl text-gray-600">From Financial Times, Literary Reviews, and other prestigious sources</p>
              </div>

              <div className="space-y-8">
                {recommendations.map((book, index) => (
                  <div key={index} className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
                    <div className="grid md:grid-cols-4 gap-8">
                      {/* Book Cover */}
                      <div className="md:col-span-1">
                        <div className="w-full max-w-48 mx-auto">
                          {book.image ? (
                            <img 
                              src={book.image} 
                              alt={book.title}
                              className="w-full aspect-[3/4] object-cover rounded-lg shadow-lg"
                            />
                          ) : (
                            <div className="w-full aspect-[3/4] bg-gradient-to-b from-gray-200 to-gray-300 rounded-lg flex items-center justify-center shadow-lg">
                              <Book className="w-12 h-12 text-gray-500" />
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Book Details */}
                      <div className="md:col-span-3 space-y-6">
                        <div>
                          <h3 className="text-2xl font-bold text-gray-800 mb-2 leading-tight">{book.title}</h3>
                          <p className="text-xl text-gray-600 font-semibold mb-4">by {book.author}</p>
                          
                          <div className="flex flex-wrap items-center gap-4 mb-6">
                            <span className="flex items-center text-gray-600">
                              <Calendar className="w-4 h-4 mr-2" />
                              {book.publicationDate}
                            </span>
                            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                              {book.source}
                            </span>
                            {book.rating > 0 && (
                              <span className="flex items-center text-gray-600">
                                <Star className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
                                {book.rating}/5
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-4">
                          <h4 className="text-lg font-semibold text-gray-800">About this book</h4>
                          <p className="text-gray-700 leading-relaxed">{book.description}</p>
                        </div>
                        
                        {/* Why you'll like it */}
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
                          <h4 className="text-lg font-semibold text-gray-800 mb-3">Why you'll love this</h4>
                          <p className="text-gray-700 leading-relaxed italic">{book.reason}</p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-4 pt-4">
                          <a
                            href={getAmazonInLink(book.title, book.author)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-red-600 transition-all duration-200 flex items-center shadow-lg"
                          >
                            Buy on Amazon.in
                            <ExternalLink className="w-4 h-4 ml-2" />
                          </a>
                          <a
                            href={getReviewLink(book.reviewUrl, book.title)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold transition-colors flex items-center"
                          >
                            Read Reviews
                            <ExternalLink className="w-4 h-4 ml-2" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center pt-12">
                <button 
                  onClick={startOver}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg"
                >
                  Find More Recommendations
                </button>
              </div>
            </div>
          )}

          {step === 'recommendations' && recommendations.length === 0 && !loading && (
            <div className="text-center py-20">
              <div className="bg-white rounded-2xl p-12 shadow-lg max-w-lg mx-auto">
                <Book className="w-20 h-20 text-gray-400 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-gray-800 mb-4">No Recommendations Found</h3>
                <p className="text-gray-600 mb-6">We couldn't find similar books in our review sources</p>
                <button 
                  onClick={startOver}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
                >
                  Try Different Selection
                </button>
              </div>
            </div>
          )}

          {/* Initial state */}
          {step === 'start' && !loading && !error && recommendations.length === 0 && readwiseBooks.length === 0 && (
            <div className="text-center py-20">
              <div className="bg-white rounded-2xl p-12 shadow-lg max-w-lg mx-auto">
                <Book className="w-20 h-20 text-gray-400 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Ready to Discover</h3>
                <p className="text-gray-600">Click above to begin your personalized book discovery journey</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
