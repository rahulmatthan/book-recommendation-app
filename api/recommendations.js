// api/recommendations.js - Real web-searching book recommendation engine

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { readingHistory } = req.body;

    if (!readingHistory || !Array.isArray(readingHistory)) {
      return res.status(400).json({ error: 'Invalid reading history data' });
    }

    console.log('Starting recommendation generation...');
    
    // Analyze user's reading patterns
    const userProfile = analyzeReadingPatterns(readingHistory);
    console.log('User profile:', userProfile);
    
    // Search for recent books across multiple sources
    const recentBooks = await searchForRecentBooks(userProfile);
    console.log('Found recent books:', recentBooks.length);
    
    // Generate personalized recommendations
    const recommendations = generatePersonalizedRecommendations(recentBooks, userProfile);
    console.log('Generated recommendations:', recommendations.length);

    res.status(200).json({ recommendations });

  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ 
      error: 'Failed to generate recommendations',
      message: error.message 
    });
  }
}

function analyzeReadingPatterns(books) {
  const profile = {
    genres: new Map(),
    themes: new Set(),
    authors: new Set(),
    keywords: new Map(),
    writing_styles: new Set(),
    book_lengths: [],
    preferred_topics: new Set()
  };

  books.forEach(book => {
    // Extract author preferences
    if (book.author) {
      profile.authors.add(book.author.toLowerCase().trim());
    }

    // Analyze text content from title and notes
    const content = `${book.title} ${book.notes}`.toLowerCase();
    
    // Detect genres and themes from content
    const patterns = {
      'business': /business|entrepreneur|startup|leadership|management|strategy|finance|economics|marketing|sales/g,
      'psychology': /psychology|psycholog|behavior|mental|cognitive|mind|brain|habit|decision|bias/g,
      'self-help': /self.help|improvement|productivity|success|motivation|goal|achievement|personal.development/g,
      'science': /science|research|study|data|experiment|theory|discovery|innovation|technology/g,
      'history': /history|historical|past|ancient|civilization|war|empire|culture|society/g,
      'philosophy': /philosophy|meaning|existence|wisdom|ethics|moral|truth|reality|consciousness/g,
      'biography': /biography|memoir|life.story|autobiography|personal.account|journey/g,
      'health': /health|fitness|nutrition|exercise|wellness|medical|diet|physical/g,
      'technology': /technology|digital|internet|software|computer|ai|artificial.intelligence|innovation/g,
      'fiction': /novel|story|character|plot|narrative|fiction|literary/g,
      'spirituality': /spiritual|meditation|mindfulness|zen|buddhist|religious|faith|soul/g,
      'creativity': /creative|creativity|art|design|innovation|imagination|inspiration/g
    };

    Object.entries(patterns).forEach(([genre, pattern]) => {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        profile.genres.set(genre, (profile.genres.get(genre) || 0) + matches.length);
        profile.themes.add(genre);
      }
    });

    // Extract meaningful keywords from notes
    if (book.notes && book.notes.length > 50) {
      const words = book.notes.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 4 && !isCommonWord(word))
        .slice(0, 20); // Top keywords per book
      
      words.forEach(word => {
        profile.keywords.set(word, (profile.keywords.get(word) || 0) + 1);
      });
    }
  });

  // Get top preferences
  const topGenres = Array.from(profile.genres.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre]) => genre);

  const topKeywords = Array.from(profile.keywords.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([keyword]) => keyword);

  return {
    ...profile,
    topGenres,
    topKeywords,
    totalBooks: books.length
  };
}

function isCommonWord(word) {
  const commonWords = new Set([
    'that', 'this', 'with', 'have', 'will', 'been', 'from', 'they', 'know', 
    'want', 'good', 'much', 'some', 'time', 'very', 'when', 'come', 'here',
    'just', 'like', 'long', 'make', 'many', 'over', 'such', 'take', 'than',
    'them', 'well', 'were', 'what', 'also', 'back', 'after', 'use', 'two',
    'how', 'our', 'work', 'first', 'way', 'even', 'new', 'would', 'any',
    'these', 'give', 'day', 'most', 'us'
  ]);
  return commonWords.has(word);
}

async function searchForRecentBooks(userProfile) {
  const allBooks = [];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  // Calculate cutoff date (last 18 months for "recent" books)
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - 18);

  try {
    // Search Google Books API for each top genre
    for (const genre of userProfile.topGenres.slice(0, 3)) {
      console.log(`Searching for recent ${genre} books...`);
      
      // Search for books in this genre published recently
      const searchQueries = [
        `${genre} ${currentYear}`,
        `${genre} books ${currentYear}`,
        `best ${genre} ${currentYear}`
      ];

      for (const query of searchQueries) {
        try {
          const books = await searchGoogleBooks(query, cutoffDate);
          allBooks.push(...books);
        } catch (error) {
          console.error(`Error searching for ${query}:`, error);
        }
      }
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Also search for books related to user's top keywords
    for (const keyword of userProfile.topKeywords.slice(0, 2)) {
      try {
        const books = await searchGoogleBooks(`${keyword} ${currentYear}`, cutoffDate);
        allBooks.push(...books);
      } catch (error) {
        console.error(`Error searching for keyword ${keyword}:`, error);
      }
    }

    // Remove duplicates based on title and author
    const uniqueBooks = removeDuplicateBooks(allBooks);
    
    console.log(`Found ${uniqueBooks.length} unique recent books`);
    return uniqueBooks;

  } catch (error) {
    console.error('Error in searchForRecentBooks:', error);
    // Return fallback books if search fails
    return getFallbackRecentBooks();
  }
}

async function searchGoogleBooks(query, cutoffDate) {
  const books = [];
  
  try {
    // Google Books API endpoint
    const encodedQuery = encodeURIComponent(query);
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodedQuery}&orderBy=newest&maxResults=20&printType=books&langRestrict=en`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Google Books API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.items) {
      for (const item of data.items) {
        const volumeInfo = item.volumeInfo;
        
        // Extract publication date
        const publishedDate = volumeInfo.publishedDate;
        if (!publishedDate) continue;
        
        const pubDate = new Date(publishedDate);
        if (pubDate < cutoffDate) continue; // Skip old books
        
        // Extract book information
        const book = {
          title: volumeInfo.title || 'Unknown Title',
          author: volumeInfo.authors ? volumeInfo.authors[0] : 'Unknown Author',
          authors: volumeInfo.authors || [],
          description: volumeInfo.description || 'No description available',
          publishedDate: publishedDate,
          publicationYear: pubDate.getFullYear(),
          publicationMonth: pubDate.getMonth() + 1,
          pageCount: volumeInfo.pageCount || 0,
          categories: volumeInfo.categories || [],
          averageRating: volumeInfo.averageRating || 0,
          ratingsCount: volumeInfo.ratingsCount || 0,
          thumbnail: volumeInfo.imageLinks?.thumbnail || '',
          previewLink: volumeInfo.previewLink || '',
          infoLink: volumeInfo.infoLink || ''
        };
        
        // Only include books with minimum quality threshold
        if (book.ratingsCount >= 5 || book.averageRating >= 3.5 || book.pageCount >= 100) {
          books.push(book);
        }
      }
    }
    
  } catch (error) {
    console.error(`Error searching Google Books for "${query}":`, error);
  }
  
  return books;
}

function removeDuplicateBooks(books) {
  const seen = new Set();
  return books.filter(book => {
    const key = `${book.title.toLowerCase().trim()}-${book.author.toLowerCase().trim()}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function generatePersonalizedRecommendations(recentBooks, userProfile) {
  // Score each book based on how well it matches the user's profile
  const scoredBooks = recentBooks.map(book => {
    let score = 0;
    let reasons = [];
    
    // Genre matching
    const bookContent = `${book.title} ${book.description} ${book.categories.join(' ')}`.toLowerCase();
    
    userProfile.topGenres.forEach((genre, index) => {
      const weight = 5 - index; // Higher weight for top genres
      if (bookContent.includes(genre)) {
        score += weight * 3;
        reasons.push(`matches your interest in ${genre}`);
      }
    });
    
    // Keyword matching
    userProfile.topKeywords.forEach((keyword, index) => {
      if (bookContent.includes(keyword)) {
        const weight = Math.max(1, 3 - Math.floor(index / 3));
        score += weight;
        if (index < 5) { // Only mention top keywords in reasons
          reasons.push(`relates to your highlighted themes about ${keyword}`);
        }
      }
    });
    
    // Publication recency bonus (prefer very recent books)
    const monthsAgo = getMonthsAgo(book.publishedDate);
    if (monthsAgo <= 3) score += 5; // Last 3 months
    else if (monthsAgo <= 6) score += 3; // Last 6 months
    else if (monthsAgo <= 12) score += 1; // Last year
    
    // Rating and popularity bonus
    if (book.averageRating >= 4.0) score += 2;
    if (book.ratingsCount >= 100) score += 1;
    if (book.ratingsCount >= 1000) score += 1;
    
    // Author diversity (slight penalty for same authors to encourage discovery)
    if (userProfile.authors.has(book.author.toLowerCase())) {
      score -= 1;
    }
    
    return {
      ...book,
      score,
      matchReasons: reasons.slice(0, 2) // Top 2 reasons
    };
  });
  
  // Select top recommendations
  const topBooks = scoredBooks
    .filter(book => book.score > 2) // Minimum relevance threshold
    .sort((a, b) => {
      // Sort by score first, then by recency
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.publishedDate) - new Date(a.publishedDate);
    })
    .slice(0, 5);
  
  // Format for frontend
  return topBooks.map(book => ({
    title: book.title,
    author: book.author,
    publicationYear: book.publicationYear,
    publicationDate: formatPublicationDate(book.publishedDate),
    genre: detectPrimaryGenre(book),
    reason: generateReasonText(book.matchReasons, book.publishedDate),
    description: truncateDescription(book.description),
    rating: book.averageRating || 4.0,
    reviewSource: "Google Books"
  }));
}

function getMonthsAgo(dateString) {
  const pubDate = new Date(dateString);
  const now = new Date();
  return (now.getFullYear() - pubDate.getFullYear()) * 12 + (now.getMonth() - pubDate.getMonth());
}

function formatPublicationDate(dateString) {
  const date = new Date(dateString);
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

function detectPrimaryGenre(book) {
  const categories = book.categories.map(cat => cat.toLowerCase());
  const content = `${book.title} ${book.description}`.toLowerCase();
  
  const genreMap = {
    'Business': /business|entrepreneur|management/,
    'Psychology': /psychology|behavior|mind/,
    'Self-Help': /self.help|improvement|productivity/,
    'Science': /science|research|technology/,
    'History': /history|historical/,
    'Philosophy': /philosophy|ethics|wisdom/,
    'Biography': /biography|memoir/,
    'Health': /health|fitness|wellness/,
    'Fiction': /fiction|novel|story/
  };
  
  for (const [genre, pattern] of Object.entries(genreMap)) {
    if (pattern.test(content) || categories.some(cat => pattern.test(cat))) {
      return genre;
    }
  }
  
  return book.categories[0] || 'General';
}

function generateReasonText(matchReasons, publishedDate) {
  const reasons = [...matchReasons];
  
  const monthsAgo = getMonthsAgo(publishedDate);
  if (monthsAgo <= 6) {
    reasons.push('is a very recent publication');
  }
  
  if (reasons.length === 0) {
    return 'This book offers fresh insights that complement your reading interests.';
  }
  
  return `This book ${reasons.slice(0, 2).join(' and ')}.`;
}

function truncateDescription(description) {
  if (!description) return 'No description available.';
  return description.length > 200 ? description.substring(0, 200) + '...' : description;
}

function getFallbackRecentBooks() {
  // Fallback books if API search fails
  return [
    {
      title: "The AI Revolution",
      author: "Dr. Sarah Chen",
      publicationYear: 2024,
      publicationDate: "March 2024",
      genre: "Technology",
      reason: "This is a fallback recommendation as web search encountered issues.",
      description: "A comprehensive look at how artificial intelligence is reshaping our world.",
      rating: 4.2,
      reviewSource: "Goodreads"
    }
  ];
}
