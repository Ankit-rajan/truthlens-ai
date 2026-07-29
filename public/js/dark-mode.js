// Dark mode toggle
const toggleBtn = document.getElementById('darkModeToggle');
if (toggleBtn) {
  const currentMode = localStorage.getItem('darkMode') === 'true';
  if (currentMode) {
    document.body.classList.add('dark-mode');
    toggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
  }
  console.log('[TruthLens] dark mode initialized:', currentMode);

  toggleBtn.addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    this.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    console.log('[TruthLens] dark mode toggled ->', isDark);
  });
} else {
  console.warn('[TruthLens] #darkModeToggle button not found on this page');
}
