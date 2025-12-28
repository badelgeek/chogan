// Gestion du panier
class CartManager {
  constructor() {
    this.cart = this.loadCart();
    this.updateCartDisplay();
  }

  // Charger le panier depuis le localStorage
  loadCart() {
    const cartData = localStorage.getItem('cart');
    return cartData ? JSON.parse(cartData) : [];
  }

  // Sauvegarder le panier dans le localStorage
  saveCart() {
    localStorage.setItem('cart', JSON.stringify(this.cart));
    this.updateCartDisplay();
  }

  // Ajouter un produit au panier
  addToCart(product) {
    // Vérifier si le produit est déjà dans le panier
    const existingItem = this.cart.find(item =>
      item.id === product['n°'] &&
      item.selectedSize === product.selectedSize
    );

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      // Créer un nouvel objet avec les propriétés nécessaires
      const cartItem = {
        id: product['n°'],
        name: product.Nom,
        brand: product[':'],
        gamme: product.Gamme,
        type: product.Type,
        imageUrl: product['Lien Image'],
        selectedSize: product.selectedSize,
        selectedPrice: product.selectedPrice,
        quantity: 1
      };
      this.cart.push(cartItem);
    }

    this.saveCart();
    // Mettre à jour l'état des cartes sur la page principale
    this.updateProductCardHighlight(product['n°'], product.selectedSize, true);
  }

  // Retirer un produit du panier
  removeFromCart(productId, size) {
    this.cart = this.cart.filter(item =>
      !(item.id === productId && item.selectedSize === size)
    );
    this.saveCart();
    // Mettre à jour l'état des cartes sur la page principale
    this.updateProductCardHighlight(productId, size, false);
  }

  // Mettre à jour la quantité d'un produit
  updateQuantity(productId, size, quantity) {
    const item = this.cart.find(item =>
      item.id === productId && item.selectedSize === size
    );

    if (item) {
      if (quantity <= 0) {
        this.removeFromCart(productId, size);
      } else {
        item.quantity = quantity;
        this.saveCart();
      }
    }
  }

  // Obtenir le nombre total d'articles dans le panier
  getTotalItems() {
    return this.cart.reduce((total, item) => total + item.quantity, 0);
  }

  // Obtenir le prix total du panier
  getTotalPrice() {
    return this.cart.reduce((total, item) => {
      const price = parseFloat(item.selectedPrice.replace(' €', '').replace(',', '.'));
      return total + (price * item.quantity);
    }, 0);
  }

  // Mettre à jour l'affichage du panier dans la bottom bar
  updateCartDisplay() {
    const cartIcon = document.getElementById('cart-icon');
    const cartCount = document.getElementById('cart-count');
    
    if (cartCount) {
      const totalItems = this.getTotalItems();
      cartCount.textContent = totalItems;
      cartCount.style.display = totalItems > 0 ? 'block' : 'none';
    }
  }

  // Ouvrir le panier
  openCart() {
    // Créer ou afficher le panier
    this.showCartModal();
  }

  // Afficher le panier dans une modale
  showCartModal() {
    // Supprimer la modale existante si elle existe
    const existingModal = document.getElementById('cart-modal');
    if (existingModal) existingModal.remove();

    // Créer la modale
    const modal = document.createElement('div');
    modal.id = 'cart-modal';
    modal.className = 'cart-modal';
    modal.innerHTML = this.getCartModalHTML();
    document.body.appendChild(modal);

    // Attacher les événements
    this.attachCartEvents(modal);

    // Fermer la modale quand on clique en dehors
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  // Générer le HTML de la modale du panier
  getCartModalHTML() {
    if (this.cart.length === 0) {
      return `
        <div class="cart-modal-content">
          <div class="cart-header">
            <h2>Votre Panier</h2>
            <span class="close-cart" id="close-cart">&times;</span>
          </div>
          <div class="cart-empty">
            <p>Votre panier est vide</p>
          </div>
        </div>
      `;
    }

    let cartItemsHTML = '';
    this.cart.forEach(item => {
      const price = parseFloat(item.selectedPrice.replace(' €', '').replace(',', '.'));
      cartItemsHTML += `
        <div class="cart-item" data-id="${item.id}" data-size="${item.selectedSize}">
          <div class="cart-item-image">
            <img src="${item.imageUrl}" alt="${item.name}">
          </div>
          <div class="cart-item-details">
            <h3>${item.brand}</h3>
            <p>${item.name}</p>
            <p class="cart-item-ref">Réf: ${item.id}</p>
            <p class="cart-item-size">${item.selectedSize}</p>
          </div>
          <div class="cart-item-price">
            <p>${item.selectedPrice}</p>
            <div class="cart-item-quantity">
              <button class="quantity-btn minus" data-id="${item.id}" data-size="${item.selectedSize}">-</button>
              <span class="quantity">${item.quantity}</span>
              <button class="quantity-btn plus" data-id="${item.id}" data-size="${item.selectedSize}">+</button>
            </div>
            <button class="remove-item" data-id="${item.id}" data-size="${item.selectedSize}">Supprimer</button>
          </div>
        </div>
      `;
    });

    const totalPrice = this.getTotalPrice().toFixed(2).replace('.', ',');

    return `
      <div class="cart-modal-content">
        <div class="cart-header">
          <h2>Votre Panier</h2>
          <span class="close-cart" id="close-cart">&times;</span>
        </div>
        <div class="cart-items">
          ${cartItemsHTML}
        </div>
        <div class="cart-footer">
          <button class="checkout-btn">Passer Commande</button>
          <div class="cart-total">
            <strong>Total: ${totalPrice} €</strong>
          </div>
        </div>
      </div>
    `;
  }

  // Attacher les événements au panier
  attachCartEvents(modal) {
    // Bouton de fermeture
    const closeBtn = modal.querySelector('#close-cart');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.remove();
      });
    }

    // Boutons de quantité
    const minusBtns = modal.querySelectorAll('.quantity-btn.minus');
    minusBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        const size = e.target.getAttribute('data-size');
        const item = this.cart.find(i => i.id === id && i.selectedSize === size);
        if (item) {
          this.updateQuantity(id, size, item.quantity - 1);
          this.refreshCartDisplay();
        }
      });
    });

    const plusBtns = modal.querySelectorAll('.quantity-btn.plus');
    plusBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        const size = e.target.getAttribute('data-size');
        const item = this.cart.find(i => i.id === id && i.selectedSize === size);
        if (item) {
          this.updateQuantity(id, size, item.quantity + 1);
          this.refreshCartDisplay();
        }
      });
    });

    // Boutons de suppression
    const removeBtns = modal.querySelectorAll('.remove-item');
    removeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        const size = e.target.getAttribute('data-size');
        this.removeFromCart(id, size);
        this.refreshCartDisplay();
      });
    });

    // Bouton de commande
    const checkoutBtn = modal.querySelector('.checkout-btn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        sendOrderToWhatsApp();
      });
    }
  }

  // Mettre à jour l'état de la carte d'un produit
  updateProductCardHighlight(productId, size, isInCart) {
    // Mettre à jour la carte correspondante sur la page principale
    const productCards = document.querySelectorAll(`.product-card[data-product-number="${productId}"]`);
    productCards.forEach(card => {
      // Trouver si ce produit avec cette taille est dans le panier
      const isThisSizeInCart = this.cart.some(item =>
        item.id === productId && item.selectedSize === size
      );

      if (isThisSizeInCart) {
        card.classList.add('in-cart');
      } else {
        // Vérifier si une autre taille de ce produit est dans le panier
        const isAnySizeInCart = this.cart.some(item =>
          item.id === productId
        );

        if (!isAnySizeInCart) {
          card.classList.remove('in-cart');
        }
      }
    });
  }

  // Rafraîchir l'affichage du panier
  refreshCartDisplay() {
    // Supprimer la modale actuelle
    const existingModal = document.getElementById('cart-modal');
    if (existingModal) existingModal.remove();

    // Recréer la modale avec les données mises à jour
    this.showCartModal();

    // Mettre à jour l'affichage du panier dans la bottom bar
    this.updateCartDisplay();
  }

  // Vérifier les changements dans le panier et mettre à jour les cartes
  checkCartChanges() {
    // Cette méthode vérifie si le panier a été modifié depuis la dernière vérification
    // et met à jour les cartes en conséquence
    const currentCart = JSON.parse(localStorage.getItem('cart') || '[]');
    const hasChanged = JSON.stringify(currentCart) !== JSON.stringify(this.cart);

    if (hasChanged) {
      this.cart = currentCart;
      this.updateAllCardsHighlight();
    }
  }

  // Mettre à jour la mise en évidence de toutes les cartes
  updateAllCardsHighlight() {
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
          const isInCart = this.cart.some(item =>
            item.id === productNumber && item.selectedSize === size
          );
          if (isInCart) {
            isAnySizeInCart = true;
          }
        });
      } else {
        // Si aucune taille spécifique n'est disponible, vérifier avec le prix affiché
        const isInCart = this.cart.some(item =>
          item.id === productNumber
        );
        if (isInCart) {
          isAnySizeInCart = true;
        }
      }

      if (isAnySizeInCart) {
        card.classList.add('in-cart');
      } else {
        card.classList.remove('in-cart');
      }
    });
  }
}

// Fonction pour envoyer la commande via WhatsApp
function sendOrderToWhatsApp() {
  // Charger le panier depuis le localStorage
  const cart = JSON.parse(localStorage.getItem('cart')) || [];

  if (cart.length === 0) {
    alert('Votre panier est vide');
    return;
  }

  // Créer le message de commande
  let message = 'Nouvelle commande:\n\n';

  cart.forEach((item, index) => {
    const price = parseFloat(item.selectedPrice.replace(' €', '').replace(',', '.'));
    const itemTotal = (price * item.quantity).toFixed(2).replace('.', ',');

    message += `${index + 1}. *${item.brand}*\n`;
    message += `   ${item.name}\n`;
    message += `   Réf: ${item.id} | Taille: ${item.selectedSize}\n`;
    message += `   Qté: ${item.quantity} x ${item.selectedPrice} = ${itemTotal} €\n\n`;
  });

  const totalPrice = cart.reduce((total, item) => {
    const price = parseFloat(item.selectedPrice.replace(' €', '').replace(',', '.'));
    return total + (price * item.quantity);
  }, 0).toFixed(2).replace('.', ',');

  message += `*Total: ${totalPrice} €*\n\n`;
  message += `Merci pour votre commande !`;

  // Encoder le message pour l'URL
  const encodedMessage = encodeURIComponent(message);

  // Numéro WhatsApp cible
  const phoneNumber = '33628494751'; // +33628494751 sans le +

  // Ouvrir WhatsApp avec le message pré-rempli
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

  window.open(whatsappUrl, '_blank');
}

// Initialiser le gestionnaire de panier
const cartManager = new CartManager();
// Rendre le gestionnaire de panier accessible globalement
window.cartManager = cartManager;