// Gestion de la page panier
document.addEventListener('DOMContentLoaded', function() {
  // Charger le panier depuis le localStorage
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  
  // Afficher les articles du panier
  displayCartItems(cart);
  
  // Mettre à jour le total
  updateTotal(cart);
  
  // Attacher les événements
  attachCartPageEvents();
});

// Afficher les articles du panier
function displayCartItems(cart) {
  const cartItemsContainer = document.getElementById('cart-items');
  
  if (cart.length === 0) {
    cartItemsContainer.innerHTML = '<div class="cart-empty"><p>Votre panier est vide</p></div>';
    return;
  }
  
  let cartItemsHTML = '';
  cart.forEach(item => {
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
  
  cartItemsContainer.innerHTML = cartItemsHTML;
}

// Mettre à jour le total
function updateTotal(cart) {
  const totalPrice = cart.reduce((total, item) => {
    const price = parseFloat(item.selectedPrice.replace(' €', '').replace(',', '.'));
    return total + (price * item.quantity);
  }, 0);

  document.getElementById('total-price').textContent = totalPrice.toFixed(2).replace('.', ',') + ' €';
}

// Fonction pour envoyer la commande via WhatsApp
function sendOrderToWhatsApp() {
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

// Attacher les événements à la page panier
function attachCartPageEvents() {
  // Bouton de commande
  document.getElementById('checkout-btn').addEventListener('click', function() {
    sendOrderToWhatsApp();
  });

  // Bouton continuer les achats
  document.getElementById('continue-shopping').addEventListener('click', function() {
    window.location.href = 'index.html';
  });

  // Bouton vider le panier
  document.getElementById('clear-cart').addEventListener('click', function() {
    if (confirm('Êtes-vous sûr de vouloir vider le panier ?')) {
      localStorage.removeItem('cart');
      updateParentPageCards(); // Mettre à jour les cartes sur la page parente
      location.reload();
    }
  });

  // Boutons de quantité
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('quantity-btn')) {
      const id = e.target.getAttribute('data-id');
      const size = e.target.getAttribute('data-size');
      const cart = JSON.parse(localStorage.getItem('cart')) || [];
      const item = cart.find(i => i.id === id && i.selectedSize === size);

      if (item) {
        if (e.target.classList.contains('plus')) {
          item.quantity += 1;
        } else if (e.target.classList.contains('minus')) {
          item.quantity = Math.max(1, item.quantity - 1);
        }

        localStorage.setItem('cart', JSON.stringify(cart));
        updateParentPageCards(); // Mettre à jour les cartes sur la page parente
        location.reload(); // Recharger pour mettre à jour l'affichage
      }
    }
  });

  // Boutons de suppression
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('remove-item')) {
      const id = e.target.getAttribute('data-id');
      const size = e.target.getAttribute('data-size');
      const cart = JSON.parse(localStorage.getItem('cart')) || [];

      const updatedCart = cart.filter(item =>
        !(item.id === id && item.selectedSize === size)
      );

      localStorage.setItem('cart', JSON.stringify(updatedCart));
      updateParentPageCards(); // Mettre à jour les cartes sur la page parente
      location.reload(); // Recharger pour mettre à jour l'affichage
    }
  });
}

// Mettre à jour les cartes sur la page principale
function updateParentPageCards() {
  // Si la page est ouverte depuis la page principale (dans un onglet différent)
  // On ne peut pas directement modifier la page parente, mais on peut envoyer un message
  // Pour l'instant, on se contente de stocker l'état dans localStorage
  // La page principale vérifiera cet état périodiquement ou lors de la navigation
}