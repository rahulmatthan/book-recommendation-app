import React, { useState } from 'react';
import { Book, Calendar, Star, ExternalLink, RefreshCw, Sparkles } from 'lucide-react';
import Head from 'next/head';

export default function BookRecommendationApp() {
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [readwiseData, setReadwiseData] = useState(null);
  const [error, setError] = useState(null);

  // Fetch real Readwise data via our API endpoint
  const fetchReadwiseData = async () => {
    try {
      const response = await fetch('/api/readwise');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch Readwise data');
      }
      const data = await response.json();
      
      // Process the Readwise data to extract preferences  
      const recentBooks = data.results.slice(0, 50).map(book => ({
        title: book.title,
        author: book.author,
        notes: book.highlights?.map(h => h.text).join('. ') || book.summary || "No notes available"
      }));

      return {
        recentBooks,
        totalBooks: data.results.length
      };
    } catch (error) {
      console.error('Error fetching Readwise data:', error);
      throw error;
    }
  };

  const generateRecommendations = async () => {
    setLoading(true);
    setError(null);
    setRecommendations([]);
    setLoadingStage('Connecting to your Readwise library...');
    
    try {
      // Fetch Readwise data
      const readwise = await fetchReadwiseData();
      setReadwiseData(readwise);
      
      setLoadingStage('Analyzing your reading patterns and preferences...');
      
      // Add a small delay to show the progress
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setLoadingStage('Searching the web for recently published books...');

      // Generate recommendations using our web-searching API
      const recommendResponse = await fetch('/api/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          readingHistory: readwise.recentBooks
        })
      });

      if (!recommendResponse.ok) {
        const errorData = await recommendResponse.json();
        throw new Error(errorData.message || 'Failed to generate recommendations');
      }

      setLoadingStage('Matching books to your interests...');
      
      const data = await recommendResponse.json();
      
      // Sort by publication year (newest first)
      const sortedRecommendations = data.recommendations.sort((a, b) => b.publicationYear - a.publicationYear);
      setRecommendations(sortedRecommendations);
      
    } catch (error) {
      console.error('Error generating recommendations:', error);
      setError(error.message || 'Failed to generate recommendations');
    }
    
    setLoading(false);
    setLoadingStage('');
  };

  const getAmazonInLink = (title, author) => {
    const searchQuery = encodeURIComponent(`${title} ${author}`);
    return `https://www.amazon.in/s?k=${searchQuery}&i=stripbooks`;
  };

  const getReviewLink = (title, source) => {
    const searchQuery = encodeURIComponent(title);
    if (source === "Goodreads") {
      return `https://www.goodreads.com/search?q=${searchQuery}`;
    }
    return `https://www.amazon.in/s?k=${searchQuery}&i=stripbooks#customerReviews`;
  };

  return (
    <>
      <Head>
        <title>The Literary Gazette - Personalized Book Recommendations</title>
        <meta name="description" content="AI-powered book recommendations based on your Readwise reading history" />
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
              <p className="text-lg text-gray-700 italic">Curated Book Recommendations • Est. 2025</p>
            </div>
            <div className="flex items-center justify-center">
              <Book className="w-6 h-6 text-black mr-2" />
              <span className="text-sm font-semibold tracking-widest uppercase">Personalized Literary Discovery</span>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="border-2 border-red-600 bg-red-50 p-6 mb-8">
              <div className="flex items-center justify-center">
                <span className="text-red-800 font-bold text-sm tracking-wide uppercase">Configuration Error</span>
              </div>
              <p className="text-red-700 text-center mt-2 text-sm">{error}</p>
              <p className="text-red-600 text-center mt-2 text-xs">Please check your Readwise API token configuration in Vercel.</p>
            </div>
          )}

          {/* Action Button */}
          <div className="text-center mb-12">
            <div className="border-2 border-black p-8 bg-gray-50">
              <h2 className="text-2xl font-bold mb-4 text-black">DISCOVER YOUR NEXT LITERARY PURSUIT</h2>
              <button
                onClick={generateRecommendations}
                disabled={loading}
                className="bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white px-12 py-4 border-2 border-black font-bold text-sm tracking-widest uppercase transition-colors duration-200 flex items-center mx-auto"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-3 animate-spin" />
                    {loadingStage || 'Searching for your perfect books...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-3" />
                    Generate Recommendations
                  </>
                )}
              </button>
              {loading && (
                <div className="mt-4 text-center">
                  <p className="text-gray-600 text-sm italic">
                    This may take 1-2 minutes as we search the web for the latest publications...
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Readwise Status */}
          {readwiseData && !error && (
            <div className="border-2 border-black bg-gray-50 p-6 mb-8">
              <div className="flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-black mr-3" />
                <span className="text-black font-bold text-sm tracking-wide uppercase">Library Analysis Complete</span>
                <span className="text-black ml-4 text-sm">• {readwiseData.recentBooks.length} volumes examined</span>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && !error && (
            <div className="space-y-8">
              <div className="text-center border-b-2 border-black pb-4 mb-8">
                <h2 className="text-3xl font-bold text-black mb-2">RECOMMENDED READING</h2>
                <div className="flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-black mr-2" />
                  <span className="text-sm font-semibold tracking-widest uppercase">Arranged by Publication Date</span>
                </div>
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
                        {book.genre}
                      </span>
                      <span className="flex items-center font-semibold">
                        <Star className="w-4 h-4 mr-1 fill-black text-black" />
                        {book.rating}/5
                      </span>
                    </div>
                  </header>

                  <div className="mb-6">
                    <p className="text-gray-800 leading-relaxed text-justify mb-4">{book.description}</p>
                    
                    <div className="border-l-4 border-black pl-4 bg-gray-50 p-4">
                      <h4 className="font-bold text-black text-sm tracking-wide uppercase mb-2">Editorial Recommendation</h4>
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
                      href={getReviewLink(book.title, book.reviewSource)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white hover:bg-gray-100 text-black border-2 border-black px-6 py-3 text-sm font-bold tracking-wide uppercase transition-colors duration-200 flex items-center"
                    >
                      Critical Reviews
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                  </footer>
                </article>
              ))}
            </div>
          )}

          {recommendations.length === 0 && !loading && !error && (
            <div className="text-center py-16 border-2 border-black bg-gray-50">
              <Book className="w-24 h-24 text-black mx-auto mb-6" />
              <h3 className="text-xl font-bold text-black mb-2 tracking-wide uppercase">Awaiting Your Command</h3>
              <p className="text-gray-700 italic">Generate personalized recommendations above to begin your literary journey</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
