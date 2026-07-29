// Load trending via API with filters
// Supports two host pages that share this script:
//   - views/trending.ejs  -> #trendingContainer (full page, with search/filter UI)
//   - views/index.ejs     -> #trendingFeed      (homepage preview, no filter UI)
const container = document.getElementById('trendingContainer') || document.getElementById('trendingFeed');
const isHomepagePreview = !document.getElementById('trendingContainer') && !!document.getElementById('trendingFeed');

async function loadTrending(search = '', category = '') {
  if (!container) {
    // Script included on a page with neither container; nothing to do.
    return;
  }
  try {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category) params.append('category', category);
    // Homepage preview only needs a handful of cards, not the full list.
    if (isHomepagePreview) params.append('limit', '3');
    const res = await axios.get(`/api/trending?${params.toString()}`);
    const items = res.data.trending;
    if (items.length === 0) {
      container.innerHTML = '<div class="col-12 text-center text-muted">No trending news found.</div>';
      return;
    }
   container.innerHTML = items.map(item => `
<div class="col-md-4">
  <div class="card h-100 glass-card border-0">
    <img src="${item.image || '/images/default-news.jpg'}"
         class="card-img-top"
         alt="${item.title}"
         style="height:200px;object-fit:cover;">

    <div class="card-body">

      <span class="badge bg-danger mb-2">
        ${item.prediction || 'Unknown'}
      </span>

      <span class="badge bg-secondary mb-2">
        ${item.source || 'Unknown Source'}
      </span>

      <h5 class="card-title">${item.title}</h5>

      <p class="card-text text-muted">
        ${item.description
          ? item.description.substring(0,100)
          : 'No description available'}
      </p>

      <div class="d-flex justify-content-between align-items-center">

        <small class="text-muted">
          <i class="fas fa-clock me-1"></i>
          ${
            item.publishedAt
              ? new Date(item.publishedAt).toLocaleDateString()
              : 'Unknown Date'
          }
        </small>

        <small class="fw-bold text-primary">
          ${item.confidence ?? 0}%
        </small>

      </div>

      <a href="${item.url}"
         target="_blank"
         class="btn btn-outline-primary btn-sm mt-3 w-100">
         Read Original
      </a>

    </div>
  </div>
</div>
`).join('');
  } catch (err) {
    showToast('error', 'Failed to load trending');
  }
}

// Filter button
document.getElementById('applyFilters')?.addEventListener('click', function() {
  const search = document.getElementById('searchTrending').value;
  const category = document.getElementById('filterCategory').value;
  loadTrending(search, category);
});

// Initial load
loadTrending();

// Admin add trending
document.getElementById('saveTrendingBtn')?.addEventListener('click', async function() {
  const form = document.getElementById('addTrendingForm');
  const data = {
    title: form.title.value,
    description: form.description.value,
    category: form.category.value,
    prediction: form.prediction.value,
    image: form.image.value
  };
  try {
    await axios.post('/api/admin/trending', data);
    $('#addTrendingModal').modal('hide');
    showToast('success', 'Trending news added');
    loadTrending();
  } catch (err) {
    showToast('error', err.response?.data?.message || 'Failed to add');
  }
});