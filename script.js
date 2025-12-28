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

// Function to capitalize the first letter of each word in a string
function capitalizeWords(str) {
  if (!str) return str;
  return str.toLowerCase().replace(/\b\w/g, (match) => match.toUpperCase()); // Remplace la première lettre de chaque mot
}

// Function to replace 'g' with '9', 'E' with '3', 'i' with '1', and 'o' with '0' in each word
// Only for brand and product name, not for gamme
// Case insensitive, one type of replacement per word (replace all occurrences of the first found character type)
function transformWord(word) {
  if (!word) return word;

  // Split by spaces to handle multi-word strings
  const words = word.split(' ');

  return words
    .map((w) => {
      if (!w) return w;

      // Check for each character type and replace all occurrences of the first found type
      // Look for g/G first
      if (w.search(/[gG]/i) !== -1) {
        return w.replace(/[gG]/gi, '9');
      }

      // Look for E/e next
      if (w.search(/[eE]/) !== -1) {
        return w.replace(/[eE]/g, '3');
      }

      // Look for i/I next
      if (w.search(/[iI]/) !== -1) {
        return w.replace(/[iI]/gi, '1');
      }

      // Look for o/O last
      if (w.search(/[oO]/i) !== -1) {
        return w.replace(/[oO]/gi, '0');
      }

      // If no characters to replace, return original word
      return w;
    })
    .join(' ');
}

const grid = document.getElementById('product-grid');
const filterButtons = document.querySelectorAll('.filter-btn[data-filter]');
const sortButtons = document.querySelectorAll('.sort-btn');
const itemsPerRowInput = document.getElementById('items-per-row');
const bottomSortSelect = document.getElementById('bottom-sort-select');

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

  const largestSize = availableSizes[0];
  const mainPrice = largestSize.price;
  const mainSize = largestSize.size;

  // Générer les options de taille pour le sélecteur
  let sizeOptionsHtml = '';
  if (availableSizes.length > 0) {
    availableSizes.forEach((item, index) => {
      const isSelected = index === 0; // La première (plus grande) est sélectionnée par défaut
      sizeOptionsHtml += `
        <div class="size-option ${isSelected ? 'selected' : ''}" data-size="${item.size}" data-price="${item.price}">
          <div class="size-value">${item.size}</div>
        </div>`;
    });
  }

  // Gestion du prix public (basé sur 100ml)
  const publicPrice100ml =
    product['Prix public 100ml'] && product['Prix public 100ml'].trim() !== '' ? product['Prix public 100ml'] : null;

  // Convertir le prix public 100ml en nombre pour les calculs
  let publicPriceValue = null;
  if (publicPrice100ml) {
    // Extraire la valeur numérique du prix (ex: "35,00 €" -> 35.00)
    const priceStr = publicPrice100ml.replace(' €', '').replace(',', '.');
    publicPriceValue = parseFloat(priceStr);
  }

  // Calculer le prix public pour la taille sélectionnée (proportionnellement)
  let displayedPublicPrice = null;
  if (publicPriceValue && largestSize) {
    const selectedSizeValue = largestSize.sizeValue; // Valeur en ml de la taille sélectionnée
    // Calculer le prix proportionnellement: (prix_100ml * taille_selectionnee) / 100
    const calculatedPrice = (publicPriceValue * selectedSizeValue) / 100;
    displayedPublicPrice = calculatedPrice.toFixed(2).replace('.', ',') + ' €';
  }

  const publicPriceHtml = displayedPublicPrice
    ? `<div class="public-price-container">
         <div class="public-price-label">PRIX ORIGINAL</div>
         <div class="public-price-value">${displayedPublicPrice}</div>
       </div>`
    : '<div></div>';

  // Capitaliser le nom du produit
  const productName = capitalizeWords(product.Nom || 'N/A');

  // Apply transformation to brand and product name only (not gamme)
  const transformedBrand = transformWord((product[':'] || 'N/A').toUpperCase());
  const transformedProductName = transformWord(productName);

  // HTML de la carte
  return `
          <div class="product-card"
               data-type="${product.Type}"
               data-is-homme="${isHomme}"
               data-is-femme="${isFemme}"
               data-product-number="${product['n°']}"
               data-brand="${product[':']}"
               data-name="${product.Nom}"
               data-gamme="${product.Gamme}"
               data-image-url="${imageUrl}"
               ${publicPrice100ml ? `data-public-price-100ml="${publicPrice100ml}"` : ''}>

              <div class="card-image-container">
                  <div class="product-number ${product.Type}">n° ${product['n°']}</div>
                  <img src="${imageUrl}" alt="${transformedProductName}" class="card-image">
                  <button class="add-to-cart-btn" data-product-number="${product['n°']}">
                    <span class="material-icons">add</span>
                  </button>
              </div>

              <div class="card-content">
                  <div class="card-content-main">
                      <div class="product-brand">${transformedBrand}</div>
                      <div style="margin-top: 0; margin-bottom: 4px;">${transformedProductName}</div>
                      <div class="product-info">${capitalizeWords(product.Gamme)} - ${product.Type}</div>
                  </div>

                  <!-- Sélecteur de tailles -->
                  <div class="size-selector">
                    ${sizeOptionsHtml}
                  </div>

                  <!-- Conteneur de prix -->
                  <div class="price-container">
                    ${publicPriceHtml}
                    <div class="price-circle-container">
                      <div class="price-circle">
                        <div class="price-label">PRIX</div>
                        <div class="price-value">${mainPrice}</div>
                      </div>
                    </div>
                  </div>
              </div>

              <!--
                <div class="card-footer">
              </div>
              -->
          </div>
      `;
}

// Fonction renderProducts redéfinie plus bas avec les fonctionnalités de mise en évidence du panier
// Voir ligne 1039 pour la version complète avec mise en évidence des articles ajoutés au panier

// --- 3. ÉVÉNEMENTS (Interaction Utilisateur) ---

// Gestion des clics sur les boutons de filtre (dans la bottom bar)
document.querySelectorAll('.bottombar .filter-btn[data-filter]').forEach((button) => {
  button.addEventListener('click', function () {
    // Désactiver tous les boutons de filtre dans la bottom bar
    document.querySelectorAll('.bottombar .filter-btn').forEach((btn) => btn.classList.remove('active'));

    // Activer le bouton cliqué
    this.classList.add('active');

    // Mettre à jour et redessiner
    currentFilter = this.getAttribute('data-filter');
    renderProducts();
  });
});

// Gestion des clics sur les boutons de tri (dans la top bar)
if (sortButtons.length > 0) {
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
      // Mettre à jour le select de la bottom bar
      if (bottomSortSelect) {
        bottomSortSelect.value = currentSort;
      }
      renderProducts();
    });
  });
}

// Gestion du changement de tri dans le select de la bottom bar
if (bottomSortSelect) {
  bottomSortSelect.addEventListener('change', function () {
    // Désactiver tous les boutons de tri dans la top bar
    if (sortButtons.length > 0) {
      sortButtons.forEach((btn) => {
        btn.classList.remove('active');
      });
    }

    // Activer le bouton correspondant dans la top bar
    const activeSortButton = document.querySelector(`.sort-btn[data-sort="${this.value}"]`);
    if (activeSortButton) {
      activeSortButton.classList.add('active');
    }

    // Mettre à jour et redessiner
    currentSort = this.value;
    renderProducts();
  });
}

// Gestion du changement du nombre de cartes par ligne
if (itemsPerRowInput) {
  itemsPerRowInput.addEventListener('change', () => {
    const cardsPerRow = parseInt(itemsPerRowInput.value) || 3; // Fallback to 3 if input is invalid
    document.documentElement.style.setProperty('--cards-per-row', cardsPerRow);
    // No need to call renderProducts() as changing CSS variable will re-layout
  });
}

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
      // Tri par marque (colonne ':') en utilisant les données originales
      const brandCompare = (a[':'] || '').localeCompare(b[':'] || '');
      if (brandCompare !== 0) {
        return brandCompare;
      }
      // Si les marques sont identiques, tri par nom original
      return (a.Nom || '').localeCompare(b.Nom || '');
    } else if (currentSort === 'name') {
      // Tri par nom (colonne 'Nom') en utilisant les données originales
      return (a.Nom || '').localeCompare(b.Nom || '');
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

        /* Styles pour les options de taille */
        .size-selector {
          position: absolute;
          bottom: 15px;
          right: 15px;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 5px;
          z-index: 3;
        }

        .size-option {
          background-color: #f8f8f8;
          border: 1px solid #ddd;
          border-radius: 15px;
          padding: 5px 10px;
          font-size: 0.8em;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 60px;
        }

        .size-option.selected {
          background-color: #d9371c;
          color: white;
          border-color: #d9371c;
        }

        .size-option .size-value {
          font-weight: bold;
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

// Fonction pour mettre à jour le prix affiché en fonction de la sélection
function updatePriceDisplay(cardElement, selectedSize, selectedPrice) {
  const priceValueElement = cardElement.querySelector('.price-value');
  const publicPriceValueElement = cardElement.querySelector('.public-price-value');
  const publicPriceLabelElement = cardElement.querySelector('.public-price-label');

  if (priceValueElement) {
    priceValueElement.textContent = selectedPrice;
  }

  // Mettre à jour le prix public proportionnellement si disponible
  if (publicPriceValueElement && publicPriceLabelElement) {
    // Récupérer le prix public 100ml à partir de l'attribut de données ou du label
    const originalPublicPrice100ml = cardElement.getAttribute('data-public-price-100ml');
    if (originalPublicPrice100ml) {
      // Extraire la taille sélectionnée (ex: "50ml" -> 50)
      const sizeValue = parseInt(selectedSize.replace(/\s+/g, '').replace('ml', ''));

      // Convertir le prix public 100ml en nombre
      const publicPrice100mlValue = parseFloat(originalPublicPrice100ml.replace(' €', '').replace(',', '.'));

      // Calculer le prix public proportionnellement
      if (!isNaN(publicPrice100mlValue) && !isNaN(sizeValue)) {
        const calculatedPrice = (publicPrice100mlValue * sizeValue) / 100;
        const formattedPrice = calculatedPrice.toFixed(2).replace('.', ',') + ' €';
        publicPriceValueElement.textContent = formattedPrice;
      }
    }
  }
}

// Fonction pour gérer les événements de sélection de taille
function attachSizeSelectionEvents() {
  // Détacher les événements précédents pour éviter les doublons
  document.querySelectorAll('.size-option').forEach((option) => {
    option.removeEventListener('click', handleSizeSelection);
    option.addEventListener('click', handleSizeSelection);
  });
}

// Gestionnaire d'événement pour la sélection de taille
function handleSizeSelection(event) {
  const sizeOption = event.currentTarget;
  const cardElement = sizeOption.closest('.product-card');

  // Désélectionner toutes les options de taille dans cette carte
  cardElement.querySelectorAll('.size-option').forEach((option) => {
    option.classList.remove('selected');
  });

  // Sélectionner l'option cliquée
  sizeOption.classList.add('selected');

  // Récupérer les données de l'option sélectionnée
  const selectedSize = sizeOption.getAttribute('data-size');
  const selectedPrice = sizeOption.getAttribute('data-price');

  // Mettre à jour le prix affiché
  updatePriceDisplay(cardElement, selectedSize, selectedPrice);
}

// Initialisation : Charger les données du CSV et afficher les produits
loadCSVData();

// Attacher les événements de sélection de taille après le chargement des produits
document.addEventListener('DOMContentLoaded', function () {
  // S'assurer que les boutons de filtre et le select de tri sont correctement initialisés
  // Activer le bouton de filtre "TOUT" par défaut
  const allFilterBtn = document.querySelector('.bottombar .filter-btn[data-filter="all"]');
  if (allFilterBtn) {
    allFilterBtn.classList.add('active');
  }

  // Activer le bouton de tri "Trier par Marque" par défaut
  const brandSortBtn = document.querySelector('.sort-btn[data-sort="brand"]');
  if (brandSortBtn) {
    brandSortBtn.classList.add('active');
  }

  // Mettre à jour le select de tri dans la bottom bar
  if (bottomSortSelect) {
    bottomSortSelect.value = 'brand';
  }

  // Utiliser une MutationObserver pour détecter les changements dans la grille
  const grid = document.getElementById('product-grid');
  if (grid) {
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === 'childList') {
          // Attacher les événements aux nouvelles cartes ajoutées
          setTimeout(() => {
            attachSizeSelectionEvents();
          }, 100); // Petit délai pour s'assurer que le DOM est complètement mis à jour
        }
      });
    });

    observer.observe(grid, { childList: true, subtree: true });
  }

  // Ajouter la fonctionnalité de recherche
  const searchInput = document.querySelector('.search-input');

  if (searchInput) {
    // Recherche au fur et à mesure de la saisie
    searchInput.addEventListener('input', function () {
      performSearch(this.value);
    });
  }
});

// Fonction de recherche
function performSearch(query) {
  query = query.toLowerCase().trim();

  // Si la recherche est vide, afficher tous les produits
  if (!query) {
    renderProducts();
    return;
  }

  // Filtrer les produits en fonction de la recherche
  const filteredData = perfumeData.filter((product) => {
    // Vérifier si le terme de recherche correspond à un nom, une marque, une gamme ou un numéro
    // Check both original and transformed versions
    const originalName = product.Nom && product.Nom.toLowerCase();
    const originalBrand = product[':'] && product[':'].toLowerCase();
    const originalGamme = product.Gamme && capitalizeWords(product.Gamme).toLowerCase();

    const transformedName = transformWord(product.Nom || '').toLowerCase();
    const transformedBrand = transformWord((product[':'] || '').toUpperCase()).toLowerCase();
    const transformedGamme = capitalizeWords(product.Gamme || '').toLowerCase(); // Don't transform gamme

    const matchesName =
      (originalName && originalName.includes(query)) || (transformedName && transformedName.includes(query));
    const matchesBrand =
      (originalBrand && originalBrand.includes(query)) || (transformedBrand && transformedBrand.includes(query));
    const matchesGamme =
      (originalGamme && originalGamme.includes(query)) || (transformedGamme && transformedGamme.includes(query)); // Include gamme in search too
    const matchesNumber = product['n°'] && product['n°'].toString().includes(query);

    // Vérifier si le terme de recherche correspond à une contenance ou un prix
    let matchesSizeOrPrice = false;
    for (const key in product) {
      if (key && typeof key === 'string' && (key.match(/^\d+\s*ml$/i) || key.match(/^\d+ml$/i))) {
        // Vérifier la contenance
        if (key.toLowerCase().includes(query)) {
          matchesSizeOrPrice = true;
          break;
        }
        // Vérifier le prix
        if (product[key] && product[key].toString().toLowerCase().includes(query)) {
          matchesSizeOrPrice = true;
          break;
        }
      }
    }

    return matchesName || matchesBrand || matchesGamme || matchesNumber || matchesSizeOrPrice;
  });

  // Afficher les produits filtrés
  grid.innerHTML = ''; // Vider la grille

  // Appliquer le tri actuel aux résultats filtrés
  filteredData.sort((a, b) => {
    if (currentSort === 'brand') {
      // Tri par marque (colonne ':') en utilisant les données originales
      const brandCompare = (a[':'] || '').localeCompare(b[':'] || '');
      if (brandCompare !== 0) {
        return brandCompare;
      }
      // Si les marques sont identiques, tri par nom original
      return (a.Nom || '').localeCompare(b.Nom || '');
    } else if (currentSort === 'name') {
      // Tri par nom (colonne 'Nom') en utilisant les données originales
      return (a.Nom || '').localeCompare(b.Nom || '');
    } else if (currentSort === 'number') {
      // Tri par numéro (colonne 'n°')
      // Convertir les numéros en nombres pour un tri correct
      const numA = parseInt(a['n°']) || 0;
      const numB = parseInt(b['n°']) || 0;
      return numA - numB;
    }
    return 0;
  });

  // Afficher les produits filtrés et triés
  filteredData.forEach((product) => {
    grid.innerHTML += createCardHTML(product);
  });

  // Attacher les événements de sélection de taille après le rendu
  setTimeout(() => {
    attachSizeSelectionEvents();
  }, 100);
}

// Fonction pour attacher les événements d'ajout au panier
document.addEventListener('DOMContentLoaded', function () {
  // Attacher les événements d'ajout au panier
  attachAddToCartEvents();

  // Attacher l'événement au bouton du panier
  const cartBtn = document.getElementById('cart-btn');
  if (cartBtn) {
    cartBtn.addEventListener('click', function() {
      if (window.cartManager) {
        window.cartManager.openCart();
      }
    });
  }

  // Mettre à jour l'affichage du panier au chargement de la page
  if (window.cartManager) {
    window.cartManager.updateCartDisplay();
  }

  // Démarrer la vérification périodique des changements dans le panier
  startCartChangeMonitoring();
});

// Fonction pour démarrer la vérification périodique des changements dans le panier
function startCartChangeMonitoring() {
  // Vérifier les changements toutes les 2 secondes
  setInterval(() => {
    if (window.cartManager) {
      window.cartManager.checkCartChanges();
    }
  }, 2000);
}

function attachAddToCartEvents() {
  // Utiliser event delegation pour gérer les boutons ajoutés dynamiquement
  document.getElementById('product-grid').addEventListener('click', function(e) {
    if (e.target.closest('.add-to-cart-btn')) {
      e.preventDefault();
      e.stopPropagation();
      
      const addToCartBtn = e.target.closest('.add-to-cart-btn');
      const productNumber = addToCartBtn.getAttribute('data-product-number');
      const productCard = addToCartBtn.closest('.product-card');
      
      // Récupérer les informations du produit
      const product = {
        'n°': productCard.getAttribute('data-product-number'),
        ':': productCard.getAttribute('data-brand'),
        Nom: productCard.getAttribute('data-name'),
        Gamme: productCard.getAttribute('data-gamme'),
        Type: productCard.getAttribute('data-type'),
        'Lien Image': productCard.getAttribute('data-image-url'),
        selectedSize: 'N/A', // On récupérera la taille sélectionnée
        selectedPrice: 'N/A' // On récupérera le prix sélectionné
      };
      
      // Trouver la taille sélectionnée dans la carte
      const selectedSizeOption = productCard.querySelector('.size-option.selected');
      if (selectedSizeOption) {
        product.selectedSize = selectedSizeOption.getAttribute('data-size');
        product.selectedPrice = selectedSizeOption.getAttribute('data-price');
      } else {
        // Si aucune taille n'est sélectionnée, prendre la première disponible
        const firstSizeOption = productCard.querySelector('.size-option');
        if (firstSizeOption) {
          product.selectedSize = firstSizeOption.getAttribute('data-size');
          product.selectedPrice = firstSizeOption.getAttribute('data-price');
        } else {
          // Si aucune taille n'est disponible, utiliser les valeurs par défaut
          const priceValueElement = productCard.querySelector('.price-value');
          if (priceValueElement) {
            product.selectedPrice = priceValueElement.textContent;
          }
        }
      }
      
      // Ajouter au panier
      if (window.cartManager) {
        window.cartManager.addToCart(product);
        
        // Animation d'ajout
        addToCartAnimation(addToCartBtn);
        
        // Mettre à jour la mise en évidence de la carte
        updateCardHighlight(productCard, product['n°'], product.selectedSize);
      }
    }
  });
}

// Fonction pour animer l'ajout au panier
function addToCartAnimation(btn) {
  btn.style.transform = 'scale(0.9)';
  btn.style.backgroundColor = '#4CAF50';
  
  setTimeout(() => {
    btn.style.transform = 'scale(1)';
    btn.style.backgroundColor = 'var(--color-secondary)';
  }, 300);
}

// Fonction pour mettre à jour la mise en évidence de la carte
function updateCardHighlight(card, productNumber, selectedSize) {
  // Vérifier si le produit avec cette taille est dans le panier
  if (window.cartManager && window.cartManager.cart) {
    const isInCart = window.cartManager.cart.some(item => 
      item.id === productNumber && item.selectedSize === selectedSize
    );
    
    if (isInCart) {
      card.classList.add('in-cart');
    } else {
      card.classList.remove('in-cart');
    }
  }
}

// Fonction pour mettre à jour la mise en évidence de toutes les cartes
function updateAllCardsHighlight() {
  const cards = document.querySelectorAll('.product-card');
  cards.forEach(card => {
    const productNumber = card.getAttribute('data-product-number');
    // Pour chaque taille disponible dans la carte, vérifier si elle est dans le panier
    const sizeOptions = card.querySelectorAll('.size-option');
    let isAnySizeInCart = false;
    
    if (sizeOptions.length > 0) {
      // Vérifier chaque taille disponible
      sizeOptions.forEach(option => {
        const size = option.getAttribute('data-size');
        if (window.cartManager && window.cartManager.cart) {
          const isInCart = window.cartManager.cart.some(item => 
            item.id === productNumber && item.selectedSize === size
          );
          if (isInCart) {
            isAnySizeInCart = true;
          }
        }
      });
    } else {
      // Si aucune taille spécifique n'est disponible, vérifier avec le prix affiché
      if (window.cartManager && window.cartManager.cart) {
        const isInCart = window.cartManager.cart.some(item => 
          item.id === productNumber
        );
        if (isInCart) {
          isAnySizeInCart = true;
        }
      }
    }
    
    if (isAnySizeInCart) {
      card.classList.add('in-cart');
    } else {
      card.classList.remove('in-cart');
    }
  });
}

// Mettre à jour la fonction renderProducts pour inclure la mise en évidence
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
      // Tri par marque (colonne ':') en utilisant les données originales
      const brandCompare = (a[':'] || '').localeCompare(b[':'] || '');
      if (brandCompare !== 0) {
        return brandCompare;
      }
      // Si les marques sont identiques, tri par nom original
      return (a.Nom || '').localeCompare(b.Nom || '');
    } else if (currentSort === 'name') {
      // Tri par nom (colonne 'Nom') en utilisant les données originales
      return (a.Nom || '').localeCompare(b.Nom || '');
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

  // Attacher les événements de sélection de taille après le rendu
  setTimeout(() => {
    attachSizeSelectionEvents();
    // Mettre à jour les mises en évidence après le rendu
    updateAllCardsHighlight();
  }, 100);
}
