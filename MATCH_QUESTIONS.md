# 🔗 Support des questions de type "Match" (Association)

## Vue d'ensemble

L'extension supporte maintenant les questions de type "match" (association/correspondance) de Moodle, où l'utilisateur doit associer des éléments à des catégories via des menus déroulants.

## Structure HTML détectée

Les questions de type "match" utilisent la classe CSS `.que.match` et contiennent une table avec des menus déroulants :

```html
<div class="que match">
  <div class="qtext">
    <p>Répartissez chacun des éléments dans la catégorie qui convient</p>
  </div>
  
  <div class="ablock">
    <table class="answer">
      <tbody>
        <tr class="r0">
          <td class="text">
            <p>matériel</p>
          </td>
          <td class="control">
            <select name="q520242:3_sub0">
              <option value="0">Choisir…</option>
              <option value="1">actif immobilisé</option>
              <option value="2">capitaux propres</option>
              <option value="3">dettes</option>
              <option value="4">actif circulant</option>
            </select>
          </td>
        </tr>
        <!-- Autres lignes... -->
      </tbody>
    </table>
  </div>
</div>
```

## Extraction des données

L'extension extrait :

1. **Le texte de la question** : Via `.qtext`
2. **Les éléments à associer** : Via `.answer tbody tr .text`
3. **Les catégories disponibles** : Via les `<option>` des menus déroulants (en excluant "Choisir…")

### Exemple de données extraites

```javascript
{
  type: 'match',
  questionText: 'Répartissez chacun des éléments dans la catégorie qui convient',
  items: [
    { text: 'matériel', selectName: 'q520242:3_sub0' },
    { text: 'Capital', selectName: 'q520242:3_sub1' },
    { text: 'véhicule', selectName: 'q520242:3_sub2' },
    // ...
  ],
  choices: [
    { value: '1', text: 'actif immobilisé' },
    { value: '2', text: 'capitaux propres' },
    { value: '3', text: 'dettes' },
    { value: '4', text: 'actif circulant' }
  ]
}
```

## Construction du prompt

Le prompt pour Gemini est adapté aux questions d'association :

```
Tu es un assistant éducatif expert. Réponds à cette question d'association/correspondance de manière précise.

QUESTION:
Répartissez chacun des éléments dans la catégorie qui convient

ÉLÉMENTS À ASSOCIER:
1. matériel
2. Capital
3. véhicule
4. liquidités
5. crédit fournisseurs
6. stock
7. impayé d'un client
8. terrain
9. bâtiment

CATÉGORIES DISPONIBLES:
- actif immobilisé
- capitaux propres
- dettes
- actif circulant

INSTRUCTIONS:
1. Associe chaque élément à la catégorie appropriée
2. Justifie tes choix de manière pédagogique
3. Sois concis mais précis

FORMAT DE RÉPONSE (IMPORTANT - RESPECTE CE FORMAT):
REPONSE:
1. matériel → [nom de la catégorie]
2. Capital → [nom de la catégorie]
3. véhicule → [nom de la catégorie]
...

JUSTIFICATION: [Explication brève de tes choix]
```

## Affichage dans le modal

Le modal adapte son affichage pour les questions "match" :

- **Éléments à associer** : Liste des items à gauche
- **Catégories disponibles** : Liste des choix possibles
- **Réponse suggérée** : Associations complètes sous forme de liste
- **Justification** : Explication pédagogique

## Exemple de réponse attendue

```
REPONSE:
1. matériel → actif immobilisé
2. Capital → capitaux propres
3. véhicule → actif immobilisé
4. liquidités → actif circulant
5. crédit fournisseurs → dettes
6. stock → actif circulant
7. impayé d'un client → actif circulant
8. terrain → actif immobilisé
9. bâtiment → actif immobilisé

JUSTIFICATION: Les actifs immobilisés sont des biens durables (matériel, véhicule, terrain, bâtiment). 
Le capital fait partie des capitaux propres. Les liquidités, stocks et créances clients sont des actifs 
circulants (court terme). Les crédits fournisseurs sont des dettes.
```

## Sélecteurs CSS utilisés

| Élément | Sélecteur | Usage |
|---------|-----------|-------|
| Container question | `.que.match` | Identifier le type de question |
| Texte question | `.qtext` | Extraire la question |
| Lignes du tableau | `.answer tbody tr` | Itérer sur chaque association |
| Texte de l'élément | `.text` | Extraire l'item à associer |
| Menu déroulant | `select` | Extraire les catégories disponibles |
| Options | `option` | Liste des catégories |

## Code principal

### Extraction (content.js)

```javascript
function extractMatchQuestion(questionDiv) {
  const questionText = questionDiv.querySelector('.qtext')?.innerText.trim();
  if (!questionText) return null;
  
  const rows = questionDiv.querySelectorAll('.answer tbody tr');
  const items = [];
  const choices = [];
  
  rows.forEach((row, index) => {
    const itemText = row.querySelector('.text')?.innerText.trim();
    if (!itemText) return;
    
    const select = row.querySelector('select');
    if (!select) return;
    
    // Extraire les options (première ligne seulement)
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
```

### Construction du prompt (background.js)

```javascript
function buildPromptMatch(questionData) {
  const { questionText, items, choices } = questionData;
  
  let prompt = `Tu es un assistant éducatif expert. Réponds à cette question d'association/correspondance de manière précise.\n\n`;
  prompt += `QUESTION:\n${questionText}\n\n`;
  prompt += `ÉLÉMENTS À ASSOCIER:\n`;
  
  items.forEach((item, index) => {
    prompt += `${index + 1}. ${item.text}\n`;
  });
  
  prompt += `\nCATÉGORIES DISPONIBLES:\n`;
  
  choices.forEach(choice => {
    prompt += `- ${choice.text}\n`;
  });
  
  prompt += `\nINSTRUCTIONS:\n`;
  prompt += `1. Associe chaque élément à la catégorie appropriée\n`;
  prompt += `2. Justifie tes choix de manière pédagogique\n`;
  prompt += `3. Sois concis mais précis\n\n`;
  
  prompt += `FORMAT DE RÉPONSE (IMPORTANT - RESPECTE CE FORMAT):\n`;
  prompt += `REPONSE:\n`;
  items.forEach((item, index) => {
    prompt += `${index + 1}. ${item.text} → [nom de la catégorie]\n`;
  });
  prompt += `\nJUSTIFICATION: [Explication brève de tes choix]\n`;
  
  return prompt;
}
```

## Tests recommandés

- [ ] Détection correcte des questions `.que.match`
- [ ] Extraction du texte de la question
- [ ] Extraction de tous les éléments à associer
- [ ] Extraction de toutes les catégories disponibles
- [ ] Exclusion de l'option "Choisir…"
- [ ] Affichage correct dans le modal
- [ ] Réponse formatée correctement
- [ ] Justification claire et pédagogique

## Limitations connues

- ❌ Ne supporte pas les images dans les éléments ou catégories
- ❌ Ne supporte pas les formules mathématiques
- ❌ Assume que toutes les lignes ont les mêmes options disponibles
- ❌ Ne valide pas automatiquement la réponse

## Évolutions futures possibles

1. **Auto-fill** : Remplir automatiquement les menus déroulants avec la réponse
2. **Highlight** : Mettre en évidence les bonnes/mauvaises réponses
3. **Historique** : Sauvegarder les questions et réponses
4. **Support des variantes** : Gérer d'autres formats de questions d'association

---

**Développé avec ❤️ pour l'apprentissage**

