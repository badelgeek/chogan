// --- 1. LECTURE DES DONNÉES DU FICHIER CSV ---
let perfumeData = [];

// Fonction pour lire et parser le fichier CSV
async function loadCSVData() {
  try {
    const response = await fetch(
      'https://docs.google.com/spreadsheets/d/e/2PACX-1vRWkEn3roOziU4Hb1piZSYuxGUVSjHCx1ggeERvV07kyRhpX4OreKdwr8KzRv-zCu4JOT_7CUCM9iYH/pub?gid=0&single=true&output=csv'
    );
    if (!response.ok) {
      throw new Error(`Erreur HTTP! status: ${response.status}`);
    }
    const text = await response.text();
    const lines = text.split('\n');

    // Extraire l'en-tête (utilise parseCSVLine pour gérer les guillemets éventuels)
    if (lines.length === 0) return;
    const headers = parseCSVLine(lines[0]);
    console.log({ headers });

    // Parser chaque ligne
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === '') continue;

      const values = parseCSVLine(line);
      const obj = {};

      for (let j = 0; j < headers.length; j++) {
        // Nettoyage des clés et valeurs
        const key = headers[j] ? headers[j].trim() : `col_${j}`;
        const val = values[j] ? values[j].trim() : '';
        obj[key] = val;
      }

      perfumeData.push(obj);
    }

    renderProducts(); // Afficher les produits après chargement des données
  } catch (error) {
    console.error('Erreur lors du chargement du fichier CSV:', error);
    // Afficher un message d'erreur dans la grille
    const grid = document.getElementById('product-grid');
    grid.innerHTML =
      '<div style="grid-column: 1 / -1; text-align: center; padding: 50px; color: red; font-size: 1.5em; font-weight: bold;">ERREUR: Impossible de charger les données depuis Google Sheets. Veuillez vérifier votre connexion internet.</div>';
  }
}

// Fonction pour parser une ligne CSV (gère les virgules dans les champs et les guillemets)
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
      current += char; // Garder les guillemets pour l'instant
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);

  // Nettoyer les guillemets entourant les valeurs (standard CSV)
  return result.map((val) => {
    val = val.trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      // Enlever les guillemets de début et de fin, et remplacer les doubles guillemets par un simple
      return val.substring(1, val.length - 1).replace(/""/g, '"');
    }
    return val;
  });
}

// --- 2. FONCTIONS JAVASCRIPT ---

const grid = document.getElementById('product-grid');
const filterButtons = document.querySelectorAll('.filter-btn[data-filter]');
const sortButtons = document.querySelectorAll('.sort-btn');
const itemsPerRowInput = document.getElementById('items-per-row');

let currentFilter = 'all';
let currentSort = 'brand'; // Default sorting by brand

// Fonction pour générer le HTML d'une carte produit
function createCardHTML(product) {
  // Gestion du Type pour le filtrage
  const isHomme = product.Type.includes('Homme') || product.Type.includes('Mixte');
  const isFemme = product.Type.includes('Femme') || product.Type.includes('Mixte');

  // Si l'image est manquante, affichez un placeholder
  const imageUrl =
    product['Lien Image'] && product['Lien Image'].trim() !== ''
      ? product['Lien Image']
      : 'https://via.placeholder.com/150x150?text=Image+Non+Trouvée'; // Placeholder visuel

  // --- GESTION DES PRIX ET CONTENANCES ---
  // Détecter dynamiquement toutes les colonnes de contenance dans le produit
  let availableSizes = [];

  // Parcourir toutes les propriétés du produit pour trouver les contenances
  for (const key in product) {
    // Vérifier si la clé correspond à un format de contenance (ex: "70 ml", "50ml", "100 ml", etc.)
    if (
      key &&
      typeof key === 'string' &&
      (key.match(/^\d+\s*ml$/i) || key.match(/^\d+ml$/i)) && // Format: nombre + ml
      product[key] &&
      product[key].trim() !== ''
    ) {
      // Extraire le nombre de la contenance pour le tri
      const sizeValue = parseInt(key.replace(/\s+/g, '').replace('ml', ''));
      availableSizes.push({ size: key, sizeValue: sizeValue, price: product[key].trim() });
    }
  }

  // Trier par taille décroissante pour l'affichage (70ml, 50ml, 30ml, 15ml)
  availableSizes.sort((a, b) => {
    return b.sizeValue - a.sizeValue; // Décroissant
  });

  let mainPrice = '-';
  let mainSize = '';
  let sizesHtml = '';

  if (availableSizes.length > 0) {
    // La "plus grande contenance dispo" est la première du tableau trié (décroissant)
    const largestSize = availableSizes[0];
    mainPrice = largestSize.price;
    mainSize = largestSize.size;

    // Construction de la liste des prix en dessous
    sizesHtml =
      '<div style="margin-top: 10px; padding-top: 5px; border-top: 1px dashed #eee; font-size: 0.9em;">';
    availableSizes.forEach((item) => {
      const isLargest = item.size === largestSize.size;
      const style = isLargest ? 'font-weight: bold; color: var(--color-primary);' : 'color: #555;';
      sizesHtml += `<div style="display: flex; justify-content: space-between; margin-bottom: 2px; ${style}">
                          <span>${item.size}</span>
                          <span>${item.price}</span>
                        </div>`;
    });
    sizesHtml += '</div>';
  }

  // HTML de la carte
  return `
          <div class="product-card"
               data-type="${product.Type}"
               data-is-homme="${isHomme}"
               data-is-femme="${isFemme}">

              <div class="card-header">${product[':']}</div>

              <div class="card-image-container">
                  <div class="product-number ${product.Type}">n° ${product['n°']}</div>
                  <img src="${imageUrl}" alt="${product.Nom}" class="card-image">
              </div>

              <div class="card-content">
                  <h3 style="margin-top: 0; margin-bottom: 15px;">${product.Nom || 'N/A'}</h3>
                  <div style="display: flex; align-items: center;">
                      <div style="flex: 1;">
                          <p style="font-size: 0.7em;">Type :<strong> ${product.Type}</strong></p>
                          <p style="font-size: 0.7em;">Gamme :<strong> ${product.Gamme || 'N/A'}</strong></p>
                      </div>
                      <div style="display: flex; align-items: center; justify-content: center;">
                          <div class="price-circle">
                              <div>${mainPrice}</div>
                              <div style="font-size: 0.6em; font-weight: normal;">${mainSize}</div>
                          </div>
                      </div>
                  </div>
                  ${sizesHtml}
              </div>

              <!--
                <div class="card-footer">
              </div>
              -->
          </div>
      `;
}

// Fonction pour afficher les produits
function renderProducts() {
  grid.innerHTML = ''; // Vider la grille

  // 1. Filtrage
  const filteredData = perfumeData.filter((product) => {
    if (currentFilter === 'all') return true;
    if (currentFilter === 'Homme') return product.Type.includes('Homme') || product.Type.includes('Mixte');
    if (currentFilter === 'Femme') return product.Type.includes('Femme') || product.Type.includes('Mixte');
    return false;
  });

  // 2. Tri (par marque, nom ou numéro)
  filteredData.sort((a, b) => {
    if (currentSort === 'brand') {
      // Tri par marque (colonne ':') puis par nom (colonne 'Nom')
      const brandCompare = a[':'].localeCompare(b[':']);
      if (brandCompare !== 0) {
        return brandCompare;
      }
      // Si les marques sont identiques, tri par nom
      return a.Nom.localeCompare(b.Nom);
    } else if (currentSort === 'name') {
      // Tri par nom (colonne 'Nom')
      return a.Nom.localeCompare(b.Nom);
    } else if (currentSort === 'number') {
      // Tri par numéro (colonne 'n°')
      // Convertir les numéros en nombres pour un tri correct
      const numA = parseInt(a['n°']) || 0;
      const numB = parseInt(b['n°']) || 0;
      return numA - numB;
    }
    return 0;
  });

  // 3. Affichage
  filteredData.forEach((product) => {
    grid.innerHTML += createCardHTML(product);
  });
}

// --- 3. ÉVÉNEMENTS (Interaction Utilisateur) ---

// Gestion des clics sur les boutons de filtre
filterButtons.forEach((button) => {
  button.addEventListener('click', function () {
    // Désactiver tous les boutons de filtre
    filterButtons.forEach((btn) => btn.classList.remove('active'));

    // Activer le bouton cliqué
    this.classList.add('active');

    // Mettre à jour et redessiner
    currentFilter = this.getAttribute('data-filter');
    renderProducts();
  });
});

// Gestion du changement du nombre de cartes par ligne
itemsPerRowInput.addEventListener('change', () => {
  const cardsPerRow = parseInt(itemsPerRowInput.value) || 3; // Fallback to 3 if input is invalid
  document.documentElement.style.setProperty('--cards-per-row', cardsPerRow);
  // No need to call renderProducts() as changing CSS variable will re-layout
});

// Gestion des clics sur les boutons de tri
sortButtons.forEach((button) => {
  button.addEventListener('click', function () {
    // Désactiver tous les boutons de tri
    sortButtons.forEach((btn) => {
      btn.classList.remove('active');
    });

    // Activer le bouton cliqué
    this.classList.add('active');

    // Mettre à jour et redessiner
    currentSort = this.getAttribute('data-sort');
    renderProducts();
  });
});

// Fonction pour imprimer les cartes en format A4
function printCards() {
  // Créer une copie des données pour le tri
  let printData = [...perfumeData];

  // Appliquer le même filtre que sur l'écran
  printData = printData.filter((product) => {
    if (currentFilter === 'all') return true;
    if (currentFilter === 'Homme') return product.Type.includes('Homme') || product.Type.includes('Mixte');
    if (currentFilter === 'Femme') return product.Type.includes('Femme') || product.Type.includes('Mixte');
    return false;
  });

  // Appliquer le même tri que sur l'écran
  printData.sort((a, b) => {
    if (currentSort === 'brand') {
      // Tri par marque (colonne ':') puis par nom (colonne 'Nom')
      const brandCompare = a[':'].localeCompare(b[':']);
      if (brandCompare !== 0) {
        return brandCompare;
      }
      // Si les marques sont identiques, tri par nom
      return a.Nom.localeCompare(b.Nom);
    } else if (currentSort === 'name') {
      // Tri par nom (colonne 'Nom')
      return a.Nom.localeCompare(b.Nom);
    } else if (currentSort === 'number') {
      // Tri par numéro (colonne 'n°')
      // Convertir les numéros en nombres pour un tri correct
      const numA = parseInt(a['n°']) || 0;
      const numB = parseInt(b['n°']) || 0;
      return numA - numB;
    }
    return 0;
  });

  // Créer une fenêtre temporaire pour l'impression
  const printWindow = window.open('', '_blank');

  // Récupérer le nombre actuel de cartes par ligne
  const cardsPerRow = document.documentElement.style.getPropertyValue('--cards-per-row') || '2';

  // Générer le HTML pour l'impression
  let printHTML = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Impression Catalogue CHOGAN</title>
      <style>
        @media print {
          @page {
            size: A4;
            margin: 1cm;
          }
        }

        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0.5cm;
        }

        .print-grid {
          display: grid;
          grid-template-columns: repeat(${cardsPerRow}, 1fr);
          gap: 15px;
          page-break-inside: avoid;
        }

        .product-card {
          background-color: white;
          border: 1px solid #eee;
          border-radius: 15px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
          text-align: center;
          page-break-inside: avoid;
          page-break-after: auto;
          min-width: 0; /* Empêche les éléments de déborder */
        }

        .card-header {
          background: linear-gradient(135deg, #f2b705, #d9371c);
          padding: 10px 0;
          color: white;
          font-weight: bold;
          text-transform: uppercase;
        }

        .card-image-container {
          height: 180px;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 10px;
          overflow: hidden;
          position: relative;
        }

        .card-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: 5px;
        }

        .product-number {
          position: absolute;
          top: 15px;
          right: 15px;
          background-color: rgba(217, 55, 28, 0.8);
          color: white;
          font-size: 0.9em;
          font-weight: bold;
          padding: 3px 8px;
          border-radius: 10px;
          z-index: 2;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .product-number.Homme {
          background-color: #003366; /* Bleu ciel */
          color: white;
        }

        .product-number.Femme {
          background-color: #b56576; /* Rose */
          color: white;
        }

        .product-number.Mixte {
          background-color: #355e3b; /* Violet */
          color: white;
        }

        .product-number.Enfant {
          background-color: #808080; /* Gris */
          color: white;
        }
        
        .card-content {
          padding: 15px;
          flex-grow: 1;
          text-align: left;
        }
        
        .card-content h3 {
          font-size: 1.4em;
          color: #d9371c;
          margin-top: 0;
          margin-bottom: 5px;
          text-transform: uppercase;
        }
        
        .card-content p {
          margin: 3px 0;
          font-size: 0.95em;
        }
        
        .card-footer {
          padding: 15px;
          border-top: 1px dashed #eee;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        
        .price {
          font-size: 1.3em;
          color: #d9371c;
          font-weight: bold;
        }
        
        .price-circle {
          display: inline-flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background-color: #d9371c;
          color: white;
          text-align: center;
          font-weight: bold;
          font-size: 1.1em;
          line-height: 1.1;
          margin-left: 10px;
          flex-shrink: 0;
        }
        
        .product-type-tag {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 15px;
          font-size: 0.85em;
          font-weight: bold;
          color: white;
          margin-bottom: 10px;
          text-transform: uppercase;
        }
        
        .product-type-tag.Homme {
          background-color: #3498db; /* Bleu */
        }
        
        .product-type-tag.Femme {
          background-color: #e91e63; /* Rose */
        }
        
        .product-type-tag.Mixte,
        .product-type-tag.Enfant {
          background-color: #9b59b6; /* Violet */
        }
        
        @media print {
          .page-break {
            page-break-before: always;
          }
        }
      </style>
    </head>
    <body>
      <h1 style="text-align: center; color: #d9371c; font-size: 2em; margin-bottom: 20px;">Catalogue CHOGAN</h1>
      <div class="print-grid">`;

  // Générer les cartes pour l'impression en utilisant les données triées
  printData.forEach((product) => {
    printHTML += createCardHTML(product);
  });

  printHTML += `
      </div>
    </body>
    </html>`;

  // Écrire le HTML dans la fenêtre d'impression
  printWindow.document.write(printHTML);
  printWindow.document.close();

  // Attendre un court délai pour que le rendu soit terminé, puis imprimer
  printWindow.onload = function () {
    printWindow.print();
  };
}

// Initialisation : Charger les données du CSV et afficher les produits
loadCSVData();