const axios = require("axios");
const aiService = require("../services/aiService");
const TrendingNews = require("../models/TrendingNews");

// Get trending news with search & category filter
exports.getTrending = async (req, res) => {
  try {
    const { search = "", category = "general", limit = 10 } = req.query;

    const apiKey = process.env.NEWS_API_KEY;

    let url = `https://newsapi.org/v2/top-headlines?country=us&pageSize=${limit}&apiKey=${apiKey}`;

    if (category !== "All") {
      url += `&category=${category.toLowerCase()}`;
    }

    if (search) {
      url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
        search,
      )}&pageSize=${limit}&sortBy=publishedAt&apiKey=${apiKey}`;
    }

    const response = await axios.get(url);

    const articles = response.data.articles || [];

    const trending = await Promise.all(
      articles.map(async (article) => {
        try {
          const articleText = `
            Title: ${article.title}

            Source: ${article.source?.name || "Unknown"}

            Description:
            ${article.description || ""}

             Content:
              ${article.content || ""}
            `;

          const analysis = await aiService.analyzeNews(articleText, { source: "trending" });

          return {
            title: article.title,
            description: article.description,
            image: article.urlToImage,
            source: article.source?.name,
            publishedAt: article.publishedAt,
            url: article.url,

            category: category === "All" ? "General" : category,

            prediction: analysis.verdict,
            confidence: analysis.confidence,
            reasons: analysis.reasons,
          };
        } catch (err) {
          return {
            title: article.title,
            description: article.description,
            image: article.urlToImage,
            source: article.source?.name,
            url: article.url,
            publishedAt: article.publishedAt,

            prediction: "Unknown",
            confidence: 0,
            reasons: [],
          };
        }
      }),
    );

    res.json({
      success: true,
      trending,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Unable to fetch trending news",
    });
  }
};

// Get single trending news by ID
exports.getTrendingById = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await TrendingNews.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    res.status(200).json({ success: true, item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
