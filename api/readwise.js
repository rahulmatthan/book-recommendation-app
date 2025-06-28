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

    // Fetch books from Readwise API
    const booksResponse = await fetch('https://readwise.io/api/v2/books/', {
      headers: {
        'Authorization': `Token ${readwiseToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!booksResponse.ok) {
      throw new Error(`Readwise API error: ${booksResponse.status}`);
    }

    const booksData = await booksResponse.json();
    
    // Get highlights for each book (limited to recent books for performance)
    const recentBooks = booksData.results.slice(0, 10);
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
