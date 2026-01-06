// ============================================
// VARIABLES GLOBALES
// ============================================

let selectedFiles = [];

// ============================================
// INITIALISATION
// ============================================

document.addEventListener('DOMContentLoaded', init);

async function init() {
    setupEventListeners();
    await checkApiKey();
}

async function checkApiKey() {
    const result = await chrome.storage.local.get(['apiKey']);
    if (!result.apiKey) {
        showError('Veuillez d\'abord configurer votre clé API dans la popup de l\'extension.');
    }
}

// ============================================
// GESTION DES ÉVÉNEMENTS
// ============================================

function setupEventListeners() {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    const selectBtn = document.getElementById('select-files-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const retryBtn = document.getElementById('retry-btn');

    // Click sur le bouton de sélection
    selectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });

    // Click sur la dropzone
    dropzone.addEventListener('click', () => {
        fileInput.click();
    });

    // Changement de fichiers
    fileInput.addEventListener('change', handleFileSelection);

    // Drag & Drop
    dropzone.addEventListener('dragover', handleDragOver);
    dropzone.addEventListener('dragleave', handleDragLeave);
    dropzone.addEventListener('drop', handleDrop);

    // Boutons d'action
    uploadBtn.addEventListener('click', handleUpload);
    cancelBtn.addEventListener('click', handleCancel);
    retryBtn.addEventListener('click', handleRetry);
}

// ============================================
// DRAG & DROP
// ============================================

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');

    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
}

// ============================================
// SÉLECTION DE FICHIERS
// ============================================

function handleFileSelection(e) {
    const files = Array.from(e.target.files);
    processFiles(files);
}

function processFiles(files) {
    // Filtrer les fichiers valides
    const validFiles = files.filter(file => {
        const ext = file.name.split('.').pop().toLowerCase();
        return ['pdf', 'txt', 'md'].includes(ext);
    });

    if (validFiles.length === 0) {
        showError('Aucun fichier valide sélectionné. Formats acceptés : PDF, TXT, MD');
        return;
    }

    // Ajouter aux fichiers sélectionnés (éviter les doublons)
    validFiles.forEach(file => {
        if (!selectedFiles.find(f => f.name === file.name && f.size === file.size)) {
            selectedFiles.push(file);
        }
    });

    updateFilesList();
}

function updateFilesList() {
    const filesSection = document.getElementById('files-section');
    const filesList = document.getElementById('files-list');
    const dropzone = document.getElementById('dropzone');

    if (selectedFiles.length === 0) {
        filesSection.style.display = 'none';
        dropzone.style.display = 'block';
        return;
    }

    // Construire la liste
    filesList.innerHTML = selectedFiles.map((file, index) => `
        <li>
            <span class="file-icon">${getFileIcon(file.name)}</span>
            <div class="file-info">
                <div class="file-name">${file.name}</div>
                <div class="file-size">${formatFileSize(file.size)}</div>
            </div>
            <button class="remove-btn" data-index="${index}" title="Supprimer">×</button>
        </li>
    `).join('');

    // Ajouter les événements de suppression
    filesList.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(e.target.dataset.index);
            selectedFiles.splice(index, 1);
            updateFilesList();
        });
    });

    filesSection.style.display = 'block';
}

function handleCancel() {
    selectedFiles = [];
    document.getElementById('file-input').value = '';
    updateFilesList();
    hideAllSections();
    document.getElementById('dropzone').style.display = 'block';
}

function handleRetry() {
    hideAllSections();
    document.getElementById('dropzone').style.display = 'block';
    if (selectedFiles.length > 0) {
        document.getElementById('files-section').style.display = 'block';
    }
}

// ============================================
// UPLOAD ET INDEXATION
// ============================================

async function handleUpload() {
    const result = await chrome.storage.local.get(['apiKey']);
    const apiKey = result.apiKey;

    if (!apiKey) {
        showError('Veuillez d\'abord configurer votre clé API dans la popup de l\'extension.');
        return;
    }

    if (selectedFiles.length === 0) {
        showError('Aucun fichier sélectionné.');
        return;
    }

    // Afficher la progression
    hideAllSections();
    document.getElementById('progress-section').style.display = 'block';
    updateProgress(5, 'Préparation des fichiers...');

    try {
        // Convertir les fichiers en base64
        updateProgress(10, 'Lecture des fichiers...');
        const filesData = await Promise.all(
            selectedFiles.map(async (file) => {
                const base64 = await fileToBase64(file);
                return {
                    name: file.name,
                    mimeType: file.type || getMimeType(file.name),
                    data: base64.split(',')[1],
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
        showSuccess(selectedFiles.length);

        // Fermer la page après 3 secondes
        setTimeout(() => {
            window.close();
        }, 3000);

    } catch (error) {
        console.error('Erreur d\'indexation:', error);
        showError(error.message);
    }
}

function updateProgress(percent, text) {
    document.getElementById('progress-fill').style.width = percent + '%';
    document.getElementById('progress-text').textContent = text;
    document.getElementById('progress-details').textContent = `${percent}%`;
}

// ============================================
// AFFICHAGE DES ÉTATS
// ============================================

function hideAllSections() {
    document.getElementById('dropzone').style.display = 'none';
    document.getElementById('files-section').style.display = 'none';
    document.getElementById('progress-section').style.display = 'none';
    document.getElementById('success-section').style.display = 'none';
    document.getElementById('error-section').style.display = 'none';
}

function showSuccess(fileCount) {
    hideAllSections();
    document.getElementById('success-section').style.display = 'block';
    document.getElementById('success-message').textContent =
        `${fileCount} fichier(s) ont été indexés avec succès.`;
}

function showError(message) {
    hideAllSections();
    document.getElementById('error-section').style.display = 'block';
    document.getElementById('error-message').textContent = message;
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

function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
        'pdf': '📕',
        'txt': '📄',
        'md': '📝'
    };
    return icons[ext] || '📄';
}
