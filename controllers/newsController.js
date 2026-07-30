const NewsHistory = require('../models/NewsHistory');
const aiService = require('../services/aiService');
const factCheckService = require('../services/factCheckService');
const sourceAnalysisService = require('../services/sourceAnalysisService');
const pdfGenerator = require('../services/pdfGenerator');
const path = require('path');
const fs = require('fs');

exports.detectNews = async (req, res) => {
  try {
    const { content, url, title, category } = req.body;

    if (!content && !url) {
      return res.status(400).json({ success: false, message: 'Please provide article content or URL' });
    }

    // If URL provided, fetch content (simplified)
    let articleContent = content;
    let articleTitle = title || 'Untitled Article';
    if (url) {
      // In production, use a service to extract article text from URL
      // For now, we'll use the URL as content
      articleContent = `URL: ${url}\nContent not extracted. Please paste text directly.`;
    }

    // Step 1: AI Analysis
    const aiResult = await aiService.analyzeNews(articleContent, {
      userId: req.user ? req.user.id : null,
      source: 'analyze'
    });

    // Step 2: Fact Check (if claims exist)
    let factCheckResults = [];
    if (aiResult.claims && aiResult.claims.length) {
      factCheckResults = await factCheckService.checkFacts(aiResult.claims);
    }

    // Step 3: Source Analysis (if url provided)
    let sourceAnalysis = null;
    if (url) {
      sourceAnalysis = await sourceAnalysisService.analyzeDomain(url);
    }

    // Build analysis object
    const analysis = {
      title: articleTitle,
      content: articleContent,
      prediction: aiResult.verdict || 'Likely Fake',
      confidence: aiResult.confidence || 0,
      reasons: aiResult.reasons || [],
      claims: aiResult.claims || [],
      evidence: aiResult.evidence || [],
      bias: aiResult.bias || 'Neutral',
      emotionalTone: aiResult.emotionalTone || 'Neutral',
      clickbaitScore: aiResult.clickbaitScore || 0,
      factConsistency: aiResult.factConsistency || 'Unknown',
      sourceTrustScore: sourceAnalysis ? sourceAnalysis.reputation : 0,
      misleadingStatements: aiResult.misleadingStatements || [],
      hallucinationProbability: aiResult.hallucinationProbability || 0,
      source: sourceAnalysis || {
        domain: url ? new URL(url).hostname : 'Unknown',
        reputation: 0,
        age: 'Unknown',
        ssl: false,
        country: 'Unknown',
        blacklisted: false,
        spamScore: 0
      },
      category: category || 'Other',
      factCheck: factCheckResults
    };

    // Save to history if user logged in
    if (req.user) {
      const historyEntry = new NewsHistory({
        title: analysis.title,
        content: analysis.content,
        prediction: analysis.prediction,
        confidence: analysis.confidence,
        reasons: analysis.reasons,
        claims: analysis.claims,
        evidence: analysis.evidence,
        bias: analysis.bias,
        emotionalTone: analysis.emotionalTone,
        clickbaitScore: analysis.clickbaitScore,
        factConsistency: analysis.factConsistency,
        sourceTrustScore: analysis.sourceTrustScore,
        misleadingStatements: analysis.misleadingStatements,
        hallucinationProbability: analysis.hallucinationProbability,
        source: analysis.source,
        category: analysis.category,
        user: req.user.id
      });
      await historyEntry.save();
      // Add to user's history
      req.user.history.push(historyEntry._id);
      await req.user.save();
      analysis.id = historyEntry._id;
    }

    res.status(200).json({ success: true, analysis });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to analyze news' });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const history = await NewsHistory.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await NewsHistory.findOne({ _id: id, user: req.user.id });
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Entry not found' });
    }
    await entry.deleteOne();
    res.status(200).json({ success: true, message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.bookmark = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    if (user.bookmarks.includes(id)) {
      user.bookmarks = user.bookmarks.filter(b => b.toString() !== id);
    } else {
      user.bookmarks.push(id);
    }
    await user.save();
    res.status(200).json({ success: true, bookmarks: user.bookmarks });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.generateReport = async (req, res) => {
  try {
    const { id } = req.params;
    const history = await NewsHistory.findOne({ _id: id, user: req.user.id });
    if (!history) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    // Generate PDF
    const outputDir = path.join(__dirname, '../uploads/reports');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const pdfPath = path.join(outputDir, `report-${id}.pdf`);
    await pdfGenerator.generateReport(history, req.user, pdfPath);

    res.download(pdfPath);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to generate report' });
  }
};


// Export history as CSV
exports.exportCSV = async (req, res) => {
  try {
    const history = await NewsHistory.find({ user: req.user.id }).sort({ createdAt: -1 });
    if (history.length === 0) {
      return res.status(404).json({ success: false, message: 'No data to export' });
    }

    // CSV headers
    const headers = ['Title', 'Verdict', 'Confidence', 'Category', 'Date'];
    const rows = history.map(item => [
      `"${item.title}"`,
      item.prediction,
      item.confidence,
      item.category,
      new Date(item.createdAt).toLocaleDateString()
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=history-${Date.now()}.csv`);
    res.status(200).send(csvContent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Export failed' });
  }
};

// Flag an analysis result for admin review (feeds admin/reports.ejs).
const ContentReport = require('../models/ContentReport');

exports.reportContent = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, message } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'A reason is required' });
    }

    const entry = await NewsHistory.findById(id);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Analysis not found' });
    }

    const report = await ContentReport.create({
      reporter: req.user.id,
      targetType: 'NewsHistory',
      targetId: id,
      reason,
      message
    });

    res.status(201).json({ success: true, report });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to submit report' });
  }
};