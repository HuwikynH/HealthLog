// Keep Render alive - ping every 10 minutes
setInterval(() => {
  fetch('/api/health')
    .catch(() => {}) // Ignore errors
}, 10 * 60 * 1000); // 10 minutes


