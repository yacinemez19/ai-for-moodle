#!/usr/bin/env node

/**
 * Script d'indexation des cours pour Moodle Gemini Assistant
 * 
 * Usage: node upload_courses.mjs <API_KEY> <FOLDER_PATH>
 * 
 * Ce script :
 * 1. Crée un File Store sur Gemini
 * 2. Upload tous les fichiers PDF/TXT/MD du dossier
 * 3. Attend l'indexation complète
 * 4. Génère un fichier rag_config.json à importer dans l'extension
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// CONFIGURATION
// ============================================

const API_KEY = process.argv[2];
const FOLDER_PATH = process.argv[3];

const SUPPORTED_EXTENSIONS = ['.pdf', '.txt', '.md'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

// ============================================
// VALIDATION DES ARGUMENTS
// ============================================

if (!API_KEY || !FOLDER_PATH) {
  console.error('❌ Usage: node upload_courses.mjs <API_KEY> <FOLDER_PATH>');
  console.error('');
  console.error('Exemple:');
  console.error('  node upload_courses.mjs AIzaSy... ./mes_cours');
  console.error('');
  process.exit(1);
}

if (!fs.existsSync(FOLDER_PATH)) {
  console.error(`❌ Le dossier "${FOLDER_PATH}" n'existe pas`);
  process.exit(1);
}

// ============================================
// UTILITAIRES
// ============================================

function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.md': 'text/markdown'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// FONCTIONS PRINCIPALES
// ============================================

async function createFileStore() {
  console.log('📚 Création du File Store...');
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/fileStores?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: 'Cours_Moodle_Assistant'
      })
    }
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur création store (${response.status}): ${errorText}`);
  }
  
  const store = await response.json();
  console.log('✅ Store créé :', store.name);
  console.log('');
  
  return store.name;
}

async function uploadFile(fileStoreId, filepath) {
  const filename = path.basename(filepath);
  const stats = fs.statSync(filepath);
  
  // Vérifier la taille
  if (stats.size > MAX_FILE_SIZE) {
    throw new Error(`Le fichier ${filename} dépasse la taille maximale (${formatFileSize(MAX_FILE_SIZE)})`);
  }
  
  console.log(`  ⏳ ${filename} (${formatFileSize(stats.size)})...`);
  
  // Lire et encoder en base64
  const content = fs.readFileSync(filepath);
  const base64 = content.toString('base64');
  const mimeType = getMimeType(filename);
  
  // Upload via l'API
  const uploadResponse = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file: {
          displayName: filename,
          mimeType: mimeType
        }
      })
    }
  );
  
  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Erreur upload: ${errorText}`);
  }
  
  const uploadData = await uploadResponse.json();
  const uploadUrl = uploadData.file?.uploadUrl;
  
  if (!uploadUrl) {
    throw new Error('Pas d\'URL d\'upload retournée');
  }
  
  // Envoyer le contenu
  const contentResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Type': mimeType,
      'X-Goog-Upload-Protocol': 'raw'
    },
    body: content
  });
  
  if (!contentResponse.ok) {
    const errorText = await contentResponse.text();
    throw new Error(`Erreur envoi contenu: ${errorText}`);
  }
  
  const fileData = await contentResponse.json();
  
  // Attacher au file store
  const attachResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${fileData.file.name}?key=${API_KEY}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileStoreId: fileStoreId
      })
    }
  );
  
  if (!attachResponse.ok) {
    console.log(`  ⚠️ Avertissement : impossible d'attacher au store`);
  }
  
  return fileData.file;
}

async function waitForIndexing(fileName) {
  let attempts = 0;
  const maxAttempts = 30; // 1 minute max
  
  while (attempts < maxAttempts) {
    const statusResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${API_KEY}`
    );
    
    if (!statusResponse.ok) {
      throw new Error('Erreur vérification statut');
    }
    
    const fileStatus = await statusResponse.json();
    
    if (fileStatus.state === 'ACTIVE') {
      return fileStatus;
    }
    
    if (fileStatus.state === 'FAILED') {
      throw new Error('Indexation échouée');
    }
    
    // État PROCESSING, on attend
    await sleep(2000);
    attempts++;
  }
  
  throw new Error('Timeout : indexation trop longue');
}

async function processAllFiles(fileStoreId, folderPath) {
  // Lister les fichiers supportés
  const allFiles = fs.readdirSync(folderPath);
  const files = allFiles.filter(f => {
    const ext = path.extname(f).toLowerCase();
    return SUPPORTED_EXTENSIONS.includes(ext);
  });
  
  if (files.length === 0) {
    console.error('❌ Aucun fichier PDF/TXT/MD trouvé dans le dossier');
    process.exit(1);
  }
  
  console.log(`📤 Upload de ${files.length} fichier(s)...\n`);
  
  const uploadedFiles = [];
  const errors = [];
  
  for (const filename of files) {
    try {
      const filepath = path.join(folderPath, filename);
      
      // Upload
      const fileData = await uploadFile(fileStoreId, filepath);
      
      // Attendre l'indexation
      process.stdout.write('     Indexation en cours');
      const indexedFile = await waitForIndexing(fileData.name);
      process.stdout.write('\r');
      
      console.log(`  ✅ ${filename} indexé`);
      
      uploadedFiles.push({
        name: filename,
        uri: indexedFile.name,
        state: 'ACTIVE',
        mimeType: indexedFile.mimeType
      });
      
    } catch (error) {
      console.log(`  ❌ ${filename} : ${error.message}`);
      errors.push({ filename, error: error.message });
    }
  }
  
  console.log('');
  
  return { uploadedFiles, errors };
}

function generateConfig(fileStoreId, uploadedFiles) {
  const config = {
    fileStoreId: fileStoreId,
    fileStoreStatus: 'active',
    fileStoreFiles: uploadedFiles,
    lastIndexDate: new Date().toISOString()
  };
  
  const configPath = path.join(__dirname, '..', 'rag_config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  return configPath;
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║  Moodle Gemini Assistant - Indexation     ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');
  
  try {
    // 1. Créer le File Store
    const fileStoreId = await createFileStore();
    
    // 2. Uploader et indexer les fichiers
    const { uploadedFiles, errors } = await processAllFiles(fileStoreId, FOLDER_PATH);
    
    // 3. Générer la configuration
    if (uploadedFiles.length === 0) {
      console.error('❌ Aucun fichier n\'a pu être indexé');
      process.exit(1);
    }
    
    const configPath = generateConfig(fileStoreId, uploadedFiles);
    
    // 4. Résumé
    console.log('═══════════════════════════════════════════════');
    console.log('✅ Indexation terminée !');
    console.log('');
    console.log(`📊 Résultat :`);
    console.log(`   - Fichiers indexés : ${uploadedFiles.length}`);
    if (errors.length > 0) {
      console.log(`   - Erreurs : ${errors.length}`);
    }
    console.log('');
    console.log(`📋 Configuration générée :`);
    console.log(`   ${configPath}`);
    console.log('');
    console.log('📌 Prochaines étapes :');
    console.log('   1. Ouvrez l\'extension Chrome');
    console.log('   2. Cliquez sur "Importer la configuration"');
    console.log('   3. Sélectionnez le fichier rag_config.json');
    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('');
    
    if (errors.length > 0) {
      console.log('⚠️ Fichiers en erreur :');
      errors.forEach(e => {
        console.log(`   - ${e.filename}: ${e.error}`);
      });
      console.log('');
    }
    
  } catch (error) {
    console.error('');
    console.error('❌ Erreur fatale :', error.message);
    console.error('');
    process.exit(1);
  }
}

main();

