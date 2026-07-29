// Chart for confidence over last 10 analyses
const ctx = document.getElementById('confidenceChart')?.getContext('2d');
if (ctx) {
  // Fetch data from server or use passed data
  fetch('/api/news/history')
    .then(res => res.json())
    .then(data => {
      const history = data.history || [];
      const labels = history.map((_, i) => `#${i+1}`);
      const values = history.map(h => h.confidence);
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels.slice(-10),
          datasets: [{
            label: 'Confidence %',
            data: values.slice(-10),
            borderColor: '#6c5ce7',
            backgroundColor: 'rgba(108, 92, 231, 0.1)',
            tension: 0.3
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false }
          }
        }
      });
    });
}