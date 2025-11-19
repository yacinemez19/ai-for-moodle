// ============================================
// 1. EXTRACTION DOM
// ============================================

function extractMultichoiceQuestion(questionDiv) {
  // Texte de la question
  const questionText = questionDiv.querySelector('.qtext')?.innerText.trim();
  if (!questionText) return null;
  
  // Type de question
  const hasCheckbox = questionDiv.querySelector('input[type="checkbox"]') !== null;
  const type = hasCheckbox ? 'multiple' : 'single';
  
  // Options
  const optionDivs = questionDiv.querySelectorAll('.answer > div[class^="r"]');
  const options = [];
  
  optionDivs.forEach(div => {
    const letter = div.querySelector('.answernumber')?.innerText.trim();
    const text = div.querySelector('.flex-fill')?.innerText.trim();
    if (letter && text) {
      options.push({ letter, text });
    }
  });
  
  if (options.length === 0) return null;
  
  return { questionText, type: 'multichoice', subtype: type, options };
}

function extractMatchQuestion(questionDiv) {
  // Texte de la question
  const questionText = questionDiv.querySelector('.qtext')?.innerText.trim();
  if (!questionText) return null;
  
  // Extraire les paires à associer
  const rows = questionDiv.querySelectorAll('.answer tbody tr');
  const items = [];
  const choices = [];
  
  rows.forEach((row, index) => {
    // Texte de l'élément à gauche
    const itemText = row.querySelector('.text')?.innerText.trim();
    if (!itemText) return;
    
    // Menu déroulant avec les options
    const select = row.querySelector('select');
    if (!select) return;
    
    // Extraire les options du menu déroulant (sauf "Choisir…")
    if (index === 0) {
      const options = select.querySelectorAll('option');
      options.forEach(opt => {
        const value = opt.value;
        const text = opt.textContent.trim();
        if (value !== '0' && text !== 'Choisir…') {
          choices.push({ value, text });
        }
      });
    }
    
    items.push({
      text: itemText,
      selectName: select.name
    });
  });
  
  if (items.length === 0 || choices.length === 0) return null;
  
  return { 
    questionText, 
    type: 'match', 
    items,
    choices
  };
}

function extractTrueFalseQuestion(questionDiv) {
  // Texte de la question
  const questionText = questionDiv.querySelector('.qtext')?.innerText.trim();
  if (!questionText) return null;
  
  // Vérifier la présence des deux options Vrai/Faux
  const trueOption = questionDiv.querySelector('input[id*="answertrue"]');
  const falseOption = questionDiv.querySelector('input[id*="answerfalse"]');
  
  if (!trueOption || !falseOption) return null;
  
  return { 
    questionText, 
    type: 'truefalse'
  };
}

function extractQuestion() {
  // Essayer de détecter une question multichoice
  let questionDiv = document.querySelector('.que.multichoice');
  if (questionDiv) {
    return extractMultichoiceQuestion(questionDiv);
  }
  
  // Essayer de détecter une question match
  questionDiv = document.querySelector('.que.match');
  if (questionDiv) {
    return extractMatchQuestion(questionDiv);
  }
  
  // Essayer de détecter une question vrai/faux
  questionDiv = document.querySelector('.que.truefalse');
  if (questionDiv) {
    return extractTrueFalseQuestion(questionDiv);
  }
  
  return null;
}

// ============================================
// 2. RACCOURCI CLAVIER
// ============================================

function setupKeyboardShortcut() {
  // Écouter le raccourci Ctrl+K (ou Cmd+K sur Mac)
  document.addEventListener('keydown', (event) => {
    // Vérifier si Ctrl+K (ou Cmd+K sur Mac) est pressé
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      // Empêcher le comportement par défaut du navigateur
      event.preventDefault();
      
      // Vérifier qu'on est bien sur une page de quiz
      if (document.querySelector('.que.multichoice') || 
          document.querySelector('.que.match') || 
          document.querySelector('.que.truefalse')) {
        handleAnalyze();
      }
    }
  });
}

// ============================================
// 3. ANALYSE DE LA QUESTION
// ============================================

async function handleAnalyze() {
  // Afficher un indicateur de chargement
  showLoadingIndicator();
  
  try {
    // Extraire la question
    const questionData = extractQuestion();
    
    if (!questionData) {
      hideLoadingIndicator();
      alert('❌ Aucune question détectée sur cette page');
      return;
    }
    
    // Envoyer au background script
    chrome.runtime.sendMessage(
      { action: 'analyze', data: questionData },
      (response) => {
        hideLoadingIndicator();
        if (response.success) {
          showModal(questionData, response.data);
        } else {
          alert(`❌ Erreur: ${response.error}`);
        }
      }
    );
    
  } catch (error) {
    hideLoadingIndicator();
    alert(`❌ Erreur: ${error.message}`);
  }
}

function showLoadingIndicator() {
  // Supprimer l'indicateur existant s'il y en a un
  hideLoadingIndicator();
  
  const loader = document.createElement('div');
  loader.id = 'gemini-loading-indicator';
  loader.innerHTML = '⏳ Analyse en cours...';
  loader.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
    z-index: 9999;
    font-size: 16px;
    font-weight: 500;
    animation: fadeIn 0.3s ease-in;
  `;
  
  document.body.appendChild(loader);
}

function hideLoadingIndicator() {
  const loader = document.getElementById('gemini-loading-indicator');
  if (loader) {
    loader.remove();
  }
}

// ============================================
// 4. MODAL DE RÉPONSE
// ============================================

function showModal(questionData, responseData) {
  // Supprimer le modal existant s'il y en a un
  const existingModal = document.getElementById('gemini-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Créer le modal
  const modal = document.createElement('div');
  modal.id = 'gemini-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
  
  // Générer le HTML en fonction du type de question
  let optionsHTML = '';
  
  if (questionData.type === 'multichoice') {
    optionsHTML = `
      <div style="margin: 16px 0;">
        <h3 style="color: #333;">📋 Options:</h3>
        <ul style="color: #555;">
          ${questionData.options.map(opt => `<li>${opt.letter} ${opt.text}</li>`).join('')}
        </ul>
      </div>
    `;
  } else if (questionData.type === 'match') {
    optionsHTML = `
      <div style="margin: 16px 0;">
        <h3 style="color: #333;">📋 Éléments à associer:</h3>
        <ul style="color: #555;">
          ${questionData.items.map(item => `<li>${item.text}</li>`).join('')}
        </ul>
      </div>
      
      <div style="margin: 16px 0;">
        <h3 style="color: #333;">🎯 Catégories disponibles:</h3>
        <ul style="color: #555;">
          ${questionData.choices.map(choice => `<li>${choice.text}</li>`).join('')}
        </ul>
      </div>
    `;
  } else if (questionData.type === 'truefalse') {
    optionsHTML = `
      <div style="margin: 16px 0;">
        <h3 style="color: #333;">📋 Options:</h3>
        <ul style="color: #555;">
          <li>✅ Vrai</li>
          <li>❌ Faux</li>
        </ul>
      </div>
    `;
  }
  
  modal.innerHTML = `
    <div style="
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    ">
      <h2 style="margin-top: 0; color: #667eea;">🤖 Réponse Gemini AI</h2>
      
      <div style="margin: 16px 0;">
        <h3 style="color: #333;">📝 Question:</h3>
        <p style="color: #555; line-height: 1.5;">${questionData.questionText}</p>
      </div>
      
      ${optionsHTML}
      
      <div style="
        background: #f0fdf4;
        padding: 16px;
        border-radius: 8px;
        border-left: 4px solid #22c55e;
        margin: 16px 0;
      ">
        <h3 style="color: #16a34a; margin-top: 0;">✅ Réponse suggérée:</h3>
        <div style="
          font-size: 1.1em;
          color: #16a34a;
          margin: 8px 0;
          line-height: 1.6;
        ">${responseData.answer}</div>
      </div>
      
      <div style="margin: 16px 0;">
        <h3 style="color: #333;">💡 Justification:</h3>
        <p style="color: #555; line-height: 1.6;">${responseData.reasoning}</p>
      </div>
      
      <div style="
        background: #fef3c7;
        padding: 12px;
        border-radius: 8px;
        border: 1px solid #fbbf24;
        margin: 16px 0;
      ">
        <p style="margin: 0; color: #92400e; font-size: 0.9em;">
          ⚠️ Cette réponse est générée par IA et peut contenir des erreurs. Vérifiez toujours.
        </p>
      </div>
      
      <button id="close-modal-btn" style="
        background: #667eea;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        cursor: pointer;
        width: 100%;
        font-size: 16px;
        margin-top: 8px;
      ">
        Fermer
      </button>
    </div>
  `;
  
  // Ajouter au DOM
  document.body.appendChild(modal);
  
  // Event listeners
  document.getElementById('close-modal-btn').addEventListener('click', () => {
    modal.remove();
  });
  
  // Fermer au clic sur le backdrop
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// ============================================
// 5. GESTIONNAIRE DE MESSAGES DU BACKGROUND
// ============================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'trigger-analyze') {
    handleAnalyze();
  }
});

// ============================================
// 6. INITIALISATION
// ============================================

// Activer le raccourci clavier sur toutes les pages
setupKeyboardShortcut();

// Afficher une notification si on est sur une page de quiz
if (document.querySelector('.que.multichoice') || 
    document.querySelector('.que.match') || 
    document.querySelector('.que.truefalse')) {
  showShortcutHint();
}

function showShortcutHint() {
  const hint = document.createElement('div');
  hint.id = 'gemini-shortcut-hint';
  hint.innerHTML = '💡 Appuyez sur <kbd>Ctrl+K</kbd> pour analyser la question';
  hint.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 16px;
    background: rgba(102, 126, 234, 0.95);
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
    z-index: 9999;
    font-size: 14px;
    animation: fadeInOut 4s ease-in-out;
  `;
  
  document.body.appendChild(hint);
  
  // Supprimer après 4 secondes
  setTimeout(() => {
    hint.remove();
  }, 4000);
}

