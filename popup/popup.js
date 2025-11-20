// ============================================
// VARIABLES GLOBALES
// ============================================

let selectedFiles = [];

// ============================================
// INITIALISATION
// ============================================

async function init() {
  await loadConfiguration();
  setupEventListeners();
}

// Charger la configuration existante
async function loadConfiguration() {
  const result = await chrome.storage.local.get([
    'apiKey',
    'fileStoreId',
    'fileStoreStatus',
    'fileStoreFiles',
    'lastIndexDate'
  ]);
  
  // Charger la clé API
  if (result.apiKey) {
    document.getElementById('api-key').value = result.apiKey;
  }
  
  // Mettre à jour l'interface RAG
  updateRAGInterface(result);
}

// ============================================
// MISE À JOUR DE L'INTERFACE
// ============================================

function updateRAGInterface(config) {
  const { fileStoreStatus, fileStoreFiles, lastIndexDate } = config;
  
  // Cacher toutes les sections
  document.getElementById('no-courses-section').style.display = 'none';
  document.getElementById('files-selected-section').style.display = 'none';
  document.getElementById('indexing-section').style.display = 'none';
  document.getElementById('courses-indexed-section').style.display = 'none';
  
  if (fileStoreStatus === 'active' && fileStoreFiles && fileStoreFiles.length > 0) {
    // Afficher les cours indexés
    showIndexedCourses(fileStoreFiles, lastIndexDate);
  } else if (fileStoreStatus === 'indexing') {
    // Afficher la progression
    document.getElementById('indexing-section').style.display = 'block';
  } else {
    // Aucun cours
    document.getElementById('no-courses-section').style.display = 'block';
  }
}

function showIndexedCourses(files, lastIndexDate) {
  const statusIcon = document.getElementById('status-icon');
  const statusText = document.getElementById('status-text');
  const section = document.getElementById('courses-indexed-section');
  const list = document.getElementById('indexed-files-list');
  const dateEl = document.getElementById('index-date');
  
  // Mettre à jour le statut
  statusIcon.textContent = '🟢';
  statusText.textContent = `${files.length} fichier(s) indexé(s)`;
  
  // Afficher la liste
  list.innerHTML = files.map(file => 
    `<li>✅ ${file.name}</li>`
  ).join('');
  
  // Afficher la date
  const date = new Date(lastIndexDate);
  dateEl.textContent = `Dernière indexation : ${date.toLocaleDateString('fr-FR')} à ${date.toLocaleTimeString('fr-FR')}`;
  
  section.style.display = 'block';
}

// ============================================
// GESTION DES ÉVÉNEMENTS
// ============================================

function setupEventListeners() {
  // Bouton de sélection de fichiers
  document.getElementById('select-files-btn').addEventListener('click', () => {
    document.getElementById('file-input').click();
  });
  
  // Changement de fichiers sélectionnés
  document.getElementById('file-input').addEventListener('change', handleFileSelection);
  
  // Bouton d'upload
  document.getElementById('upload-btn').addEventListener('click', handleUpload);
  
  // Bouton d'annulation
  document.getElementById('cancel-selection-btn').addEventListener('click', cancelSelection);
  
  // Bouton de réindexation
  document.getElementById('reindex-btn').addEventListener('click', handleReindex);
  
  // Bouton de suppression
  document.getElementById('delete-courses-btn').addEventListener('click', handleDelete);
  
  // Bouton de sauvegarde
  document.getElementById('save-btn').addEventListener('click', handleSave);
}

// ============================================
// GESTION DE LA SÉLECTION DE FICHIERS
// ============================================

function handleFileSelection(e) {
  selectedFiles = Array.from(e.target.files);
  
  if (selectedFiles.length === 0) return;
  
  // Valider les fichiers
  const validFiles = selectedFiles.filter(file => {
    const ext = file.name.split('.').pop().toLowerCase();
    return ['pdf', 'txt', 'md'].includes(ext);
  });
  
  if (validFiles.length === 0) {
    showStatus('❌ Aucun fichier valide sélectionné (PDF, TXT, MD uniquement)', 'error');
    return;
  }
  
  selectedFiles = validFiles;
  
  // Afficher la liste
  const list = document.getElementById('files-list');
  list.innerHTML = selectedFiles.map(file => 
    `<li>📄 ${file.name} (${formatFileSize(file.size)})</li>`
  ).join('');
  
  // Afficher la section
  document.getElementById('no-courses-section').style.display = 'none';
  document.getElementById('files-selected-section').style.display = 'block';
  
  // Mettre à jour le statut
  document.getElementById('status-icon').textContent = '🔵';
  document.getElementById('status-text').textContent = `${selectedFiles.length} fichier(s) sélectionné(s)`;
}

function cancelSelection() {
  selectedFiles = [];
  document.getElementById('file-input').value = '';
  document.getElementById('files-selected-section').style.display = 'none';
  document.getElementById('no-courses-section').style.display = 'block';
  
  // Réinitialiser le statut
  document.getElementById('status-icon').textContent = '⚪';
  document.getElementById('status-text').textContent = 'Aucun cours indexé';
}

// ============================================
// UPLOAD ET INDEXATION
// ============================================

async function handleUpload() {
  const apiKey = document.getElementById('api-key').value.trim();
  
  if (!apiKey) {
    showStatus('❌ Veuillez d\'abord entrer votre clé API', 'error');
    return;
  }
  
  if (selectedFiles.length === 0) {
    showStatus('❌ Aucun fichier sélectionné', 'error');
    return;
  }
  
  // Afficher la progression
  document.getElementById('files-selected-section').style.display = 'none';
  document.getElementById('indexing-section').style.display = 'block';
  document.getElementById('status-icon').textContent = '⏳';
  document.getElementById('status-text').textContent = 'Indexation en cours...';
  
  try {
    // Convertir les fichiers en base64
    updateProgress(10, 'Préparation des fichiers...');
    const filesData = await Promise.all(
      selectedFiles.map(async (file) => {
        const base64 = await fileToBase64(file);
        return {
          name: file.name,
          mimeType: file.type || getMimeType(file.name),
          data: base64.split(',')[1], // Enlever le préfixe data:...
          size: file.size
        };
      })
    );
    
    updateProgress(30, 'Envoi à l\'API Gemini...');
    
    // Envoyer au background pour traitement
    const response = await chrome.runtime.sendMessage({
      action: 'indexCourses',
      apiKey: apiKey,
      filesData: filesData
    });
    
    if (!response.success) {
      throw new Error(response.error);
    }
    
    // Succès !
    updateProgress(100, 'Indexation terminée !');
    showStatus('✅ Cours indexés avec succès !', 'success');
    
    // Recharger la configuration
    setTimeout(async () => {
      await loadConfiguration();
    }, 1500);
    
  } catch (error) {
    console.error('Erreur d\'indexation:', error);
    showStatus(`❌ Erreur : ${error.message}`, 'error');
    
    // Revenir à la sélection
    document.getElementById('indexing-section').style.display = 'none';
    document.getElementById('files-selected-section').style.display = 'block';
  }
}

function updateProgress(percent, text) {
  document.getElementById('progress-fill').style.width = percent + '%';
  document.getElementById('progress-text').textContent = text;
  
  if (percent < 100) {
    document.getElementById('progress-details').textContent = `${percent}%`;
  } else {
    document.getElementById('progress-details').textContent = '✅ Terminé';
  }
}

// ============================================
// RÉINDEXATION
// ============================================

async function handleReindex() {
  if (!confirm('Voulez-vous réindexer vos cours ? Les anciens cours seront supprimés.')) {
    return;
  }
  
  try {
    // Supprimer l'ancienne configuration
    await chrome.storage.local.remove([
      'fileStoreId',
      'fileStoreStatus',
      'fileStoreFiles',
      'lastIndexDate'
    ]);
    
    showStatus('✅ Configuration supprimée', 'success');
    
    // Recharger l'interface
    setTimeout(async () => {
      await loadConfiguration();
    }, 1000);
    
  } catch (error) {
    showStatus(`❌ Erreur : ${error.message}`, 'error');
  }
}

// ============================================
// SUPPRESSION
// ============================================

async function handleDelete() {
  if (!confirm('Voulez-vous vraiment supprimer tous les cours indexés ?')) {
    return;
  }
  
  try {
    await chrome.storage.local.remove([
      'fileStoreId',
      'fileStoreStatus',
      'fileStoreFiles',
      'lastIndexDate'
    ]);
    
    showStatus('✅ Cours supprimés', 'success');
    await loadConfiguration();
    
  } catch (error) {
    showStatus(`❌ Erreur : ${error.message}`, 'error');
  }
}

// ============================================
// SAUVEGARDE DE LA CLÉ API
// ============================================

async function handleSave() {
  const apiKey = document.getElementById('api-key').value.trim();
  
  if (!apiKey) {
    showStatus('❌ Veuillez entrer une clé API', 'error');
    return;
  }
  
  try {
    await chrome.storage.local.set({ apiKey });
    showStatus('✅ Configuration sauvegardée !', 'success');
    
    setTimeout(() => {
      window.close();
    }, 1500);
    
  } catch (error) {
    showStatus(`❌ Erreur : ${error.message}`, 'error');
  }
}

// ============================================
// UTILITAIRES
// ============================================

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getMimeType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const mimeTypes = {
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'md': 'text/markdown'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = 'status-message show ' + type;
  
  // Cacher après 5 secondes
  setTimeout(() => {
    status.className = 'status-message';
  }, 5000);
}

// ============================================
// PAGE DE TEST
// ============================================

document.getElementById('open-test-page-btn').addEventListener('click', () => {
  chrome.tabs.create({
    url: chrome.runtime.getURL('test/test.html')
  });
});

// ============================================
// LANCEMENT
// ============================================

init();


