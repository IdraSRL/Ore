// utils.js v=1.0.0

// utils.js – funzioni comuni centralizzate

export function showMessage(message, type = 'success') {
  const container = document.getElementById('messageContainer');
  if (!container) return;
  container.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
  setTimeout(() => container.innerHTML = '', 3000);
}

export function showProgress(text) {
  let progressContainer = document.getElementById('progressContainer');
  if (!progressContainer) {
    progressContainer = document.createElement('div');
    progressContainer.id = 'progressContainer';
    progressContainer.className = 'progress-container';
    document.body.appendChild(progressContainer);
  }
  progressContainer.innerHTML = `
    <div class="data-stream">
      <div class="server-icon">
        <div class="server-light active"></div>
      </div>
      <div class="progress-text">${text}</div>
    </div>
  `;
}

export function hideProgress() {
  const progressContainer = document.getElementById('progressContainer');
  if (progressContainer) {
    progressContainer.remove();
  }
}

export function formatISO(date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${y}-${m}-${d}`;
}
