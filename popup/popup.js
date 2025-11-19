document.getElementById('save-btn').addEventListener('click', async () => {
  const apiKey = document.getElementById('api-key').value.trim();
  const status = document.getElementById('status');
  
  if (!apiKey) {
    status.textContent = '❌ Veuillez entrer une clé API';
    status.style.color = 'red';
    return;
  }
  
  // Sauvegarder
  await chrome.storage.local.set({ apiKey });
  
  status.textContent = '✅ Clé API sauvegardée !';
  status.style.color = 'green';
  
  setTimeout(() => {
    window.close();
  }, 1000);
});

// Charger la clé existante
chrome.storage.local.get(['apiKey'], (result) => {
  if (result.apiKey) {
    document.getElementById('api-key').value = result.apiKey;
  }
});


