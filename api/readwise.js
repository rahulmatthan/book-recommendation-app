// api/readwise.js - Vercel serverless function to fetch Readwise data

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the Readwise API token from environment variables
    const readwiseToken = process.env.READWISE_API_TOKEN;
    
    if (!readwiseToken) {
      return res.status(500).json({ 
        error: 'Readwise API token not configured',
        message: 'Please add READWISE_API_TOKEN to your environment variables'
      });
    }

    // Get books from Readwise (filter for books only)
    const booksResponse = await fetch('https://readwise.io/api/v2/books/?category=books', {
      headers: {
        'Authorization': `Token ${readwiseToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!booksResponse.ok) {
      throw new Error(`Readwise API error: ${booksResponse.status}`);
    }

    const booksData = await booksResponse.json();
    
    // Get highlights for each book (analyzing more books for better recommendations)
    const recentBooks = booksData.results
      .filter(book => {
        // Additional filtering to ensure we only get actual books
        const hasAuthor = book.author && book.author.trim() !== '' && !book.author.includes('http');
        const hasTitle = book.title && book.title.trim() !== '' && !book.title.includes('http');
        const notWebContent = !book.source_url?.includes('twitter.com') && 
                             !book.source_url?.includes('x.com') &&
                             !book.source_url?.includes('medium.com') &&
                             !book.source_url?.includes('substack.com');
        const authorReasonableLength = book.author && book.author.length < 100; // Authors usually have shorter names
        
        return hasAuthor && hasTitle && notWebContent && authorReasonableLength;
      })
      .slice(0, 50);
    const booksWithHighlights = [];

    for (const book of recentBooks) {
      try {
        const highlightsResponse = await fetch(`https://readwise.io/api/v2/highlights/?book_id=${book.id}`, {
          headers: {
            'Authorization': `Token ${readwiseToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (highlightsResponse.ok) {
          const highlightsData = await highlightsResponse.json();
          booksWithHighlights.push({
            ...book,
            highlights: highlightsData.results
          });
        } else {
          // If highlights fail, still include the book without highlights
          booksWithHighlights.push({
            ...book,
            highlights: []
          });
        }
      } catch (error) {
        console.error(`Error fetching highlights for book ${book.id}:`, error);
        // Include book without highlights if highlights fetch fails
        booksWithHighlights.push({
          ...book,
          highlights: []
        });
      }
    }

    // Return the processed data
    res.status(200).json({
      results: booksWithHighlights,
      count: booksWithHighlights.length
    });

  } catch (error) {
    console.error('Error fetching Readwise data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Readwise data',
      message: error.message 
    });
  }
}
