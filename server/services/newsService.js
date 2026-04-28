/**
 * newsService.js — Multi-Source Live Crime News Aggregator
 * =========================================================
 * Fetches crime news from multiple APIs and caches results.
 * Sources: GNews, NewsData.io, NewsAPI.org, BBC News API
 */
const axios = require('axios');
const NodeCache = require('node-cache');

// Cache with 5-minute TTL to avoid hitting API rate limits
const newsCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

const GNEWS_KEY = process.env.GNEWS_API_KEY;
const NEWSDATA_KEY = process.env.NEWSDATA_API_KEY;
const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
const BBC_API = process.env.BBC_NEWS_API || 'https://bbc-news-api.vercel.app';

// ========= GNEWS =========
async function fetchGNews() {
  try {
    const url = `https://gnews.io/api/v4/search?q=crime+india&lang=en&country=in&max=10&apikey=${GNEWS_KEY}`;
    const res = await axios.get(url, { timeout: 8000 });
    return (res.data.articles || []).map(a => ({
      title: a.title,
      description: a.description,
      url: a.url,
      image: a.image,
      publishedAt: a.publishedAt,
      source: a.source?.name || 'GNews',
      provider: 'gnews'
    }));
  } catch (err) {
    console.log('⚠️ GNews fetch error:', err.message);
    return [];
  }
}

// ========= NEWSDATA.IO =========
async function fetchNewsData() {
  try {
    const url = `https://newsdata.io/api/1/latest?apikey=${NEWSDATA_KEY}&country=in&category=crime&language=en&size=10`;
    const res = await axios.get(url, { timeout: 8000 });
    return (res.data.results || []).map(a => ({
      title: a.title,
      description: a.description || '',
      url: a.link,
      image: a.image_url,
      publishedAt: a.pubDate,
      source: a.source_name || 'NewsData',
      provider: 'newsdata'
    }));
  } catch (err) {
    console.log('⚠️ NewsData fetch error:', err.message);
    return [];
  }
}

// ========= NEWSAPI.ORG =========
async function fetchNewsAPI() {
  try {
    const url = `https://newsapi.org/v2/everything?q=crime+india&language=en&sortBy=publishedAt&pageSize=10&apiKey=${NEWSAPI_KEY}`;
    const res = await axios.get(url, { timeout: 8000 });
    return (res.data.articles || []).map(a => ({
      title: a.title,
      description: a.description || '',
      url: a.url,
      image: a.urlToImage,
      publishedAt: a.publishedAt,
      source: a.source?.name || 'NewsAPI',
      provider: 'newsapi'
    }));
  } catch (err) {
    console.log('⚠️ NewsAPI fetch error:', err.message);
    return [];
  }
}

// ========= BBC NEWS =========
async function fetchBBCNews() {
  try {
    const url = `${BBC_API}/news?lang=english`;
    const res = await axios.get(url, { timeout: 8000 });
    const sections = res.data || {};
    const articles = [];
    // BBC API returns section-keyed arrays
    for (const key of Object.keys(sections)) {
      if (Array.isArray(sections[key])) {
        sections[key].forEach(a => {
          if (a.title && (
            a.title.toLowerCase().includes('india') ||
            a.title.toLowerCase().includes('crime') ||
            a.title.toLowerCase().includes('police') ||
            a.title.toLowerCase().includes('murder') ||
            a.title.toLowerCase().includes('arrest')
          )) {
            articles.push({
              title: a.title,
              description: a.summary || '',
              url: a.news_link,
              image: a.image_link,
              publishedAt: new Date().toISOString(),
              source: 'BBC News',
              provider: 'bbc'
            });
          }
        });
      }
    }
    return articles.slice(0, 10);
  } catch (err) {
    console.log('⚠️ BBC News fetch error:', err.message);
    return [];
  }
}

// ========= AGGREGATED FETCH =========
async function fetchAllNews() {
  const cached = newsCache.get('allNews');
  if (cached) {
    return cached;
  }

  console.log('📰 Fetching live crime news from all sources...');
  
  // Fetch all sources in parallel
  const [gnews, newsdata, newsapi, bbc] = await Promise.allSettled([
    fetchGNews(),
    fetchNewsData(),
    fetchNewsAPI(),
    fetchBBCNews()
  ]);

  const allArticles = [
    ...(gnews.status === 'fulfilled' ? gnews.value : []),
    ...(newsdata.status === 'fulfilled' ? newsdata.value : []),
    ...(newsapi.status === 'fulfilled' ? newsapi.value : []),
    ...(bbc.status === 'fulfilled' ? bbc.value : []),
  ];

  // Sort by date, deduplicate by title
  const seen = new Set();
  const unique = allArticles
    .filter(a => {
      if (!a.title || seen.has(a.title)) return false;
      seen.add(a.title);
      return true;
    })
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  const result = {
    articles: unique,
    totalResults: unique.length,
    sources: {
      gnews: (gnews.status === 'fulfilled' ? gnews.value : []).length,
      newsdata: (newsdata.status === 'fulfilled' ? newsdata.value : []).length,
      newsapi: (newsapi.status === 'fulfilled' ? newsapi.value : []).length,
      bbc: (bbc.status === 'fulfilled' ? bbc.value : []).length,
    },
    lastUpdated: new Date().toISOString()
  };

  newsCache.set('allNews', result);
  console.log(`   ✅ ${result.totalResults} articles aggregated from ${Object.values(result.sources).filter(v => v > 0).length} sources`);
  
  return result;
}

module.exports = { fetchAllNews, fetchGNews, fetchNewsData, fetchNewsAPI, fetchBBCNews };
