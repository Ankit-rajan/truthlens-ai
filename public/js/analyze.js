document.getElementById('analyzeForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const content = document.getElementById('contentInput').value.trim();
  const url = document.getElementById('urlInput').value.trim();
  const category = document.getElementById('categorySelect').value;

  if (!content && !url) {
    showToast('warning', 'Please paste article content or provide a URL.');
    return;
  }

  const btn = document.getElementById('detectBtn');
  const loading = document.getElementById('loadingIndicator');
  const resultDiv = document.getElementById('analysisResult');

  btn.disabled = true;
  loading.classList.remove('d-none');
  resultDiv.classList.add('d-none');

  try {
    const payload = { content, url, category };
    const res = await axios.post('/api/news/detect', payload);
    if (res.data.success) {
      const analysis = res.data.analysis;
      // Render result
      resultDiv.innerHTML = `
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-${analysis.prediction === 'True' ? 'success' : (analysis.prediction === 'Partially True' ? 'warning' : 'danger')} text-white">
            <h4 class="mb-0"><i class="fas fa-flag me-2"></i>${analysis.prediction}</h4>
          </div>
          <div class="card-body">
            <p><strong>Confidence:</strong> ${analysis.confidence}%</p>
            <div class="progress mb-3">
              <div class="progress-bar bg-${analysis.confidence > 70 ? 'success' : (analysis.confidence > 40 ? 'warning' : 'danger')}" style="width: ${analysis.confidence}%"></div>
            </div>
            <h6>Reasons:</h6>
            <ul>${analysis.reasons.map(r => `<li>${r}</li>`).join('')}</ul>
            ${analysis.evidence ? `<h6>Evidence:</h6><ul>${analysis.evidence.map(e => `<li>${e}</li>`).join('')}</ul>` : ''}
          </div>
        </div>
      `;
      resultDiv.classList.remove('d-none');
      showToast('success', 'Analysis complete!');
    }
  } catch (err) {
    showToast('error', err.response?.data?.message || 'Analysis failed');
  } finally {
    btn.disabled = false;
    loading.classList.add('d-none');
  }
});

// Character counter
document.getElementById('contentInput').addEventListener('input', function() {
  document.getElementById('charCount').textContent = this.value.length + ' characters';
});