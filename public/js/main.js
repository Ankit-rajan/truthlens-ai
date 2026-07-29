// Common JS for all pages
// Toast notifications with SweetAlert2
window.showToast = (icon, title, timer = 3000) => {
  Swal.fire({
    icon,
    title,
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer,
    timerProgressBar: true
  });
};

// Log every failed API call to console so issues are visible during dev/debugging,
// without having to instrument every single axios.post/get call by hand.
if (window.axios) {
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      console.error(
        '[TruthLens] API error:',
        error.config?.method?.toUpperCase(),
        error.config?.url,
        '->',
        error.response?.status,
        error.response?.data?.message || error.message
      );
      return Promise.reject(error);
    }
  );
}

// Handle logout
document.querySelectorAll('.logout-btn').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    console.log('[TruthLens] logout requested');
    try {
      await axios.get('/api/auth/logout');
      console.log('[TruthLens] logout successful, redirecting to /login');
      window.location.href = '/login';
    } catch (err) {
      console.error('[TruthLens] logout failed:', err);
      showToast('error', 'Logout failed');
    }
  });
});