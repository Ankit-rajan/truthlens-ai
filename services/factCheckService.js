const axios = require('axios');

class FactCheckService {
  // Simulate fact-checking by searching trusted sources
  async checkFacts(claims) {
    // In production, integrate with Google Fact Check API or similar
    // For now, return mock data
    const sources = ['Wikipedia', 'Reuters', 'BBC', 'AP News', 'Govt Websites'];
    const results = claims.map(claim => {
      const verified = Math.random() > 0.5 ? 'Verified' : (Math.random() > 0.5 ? 'Partially Verified' : 'Not Verified');
      return {
        claim,
        verified,
        sources: sources.slice(0, Math.floor(Math.random() * 3) + 1)
      };
    });
    return results;
  }
}

module.exports = new FactCheckService();