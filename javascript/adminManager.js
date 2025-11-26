// javascript/adminManager.js

const ADMIN_CODE = '0000'; // Code secret de l'administrateur
let isAdminLoggedIn = false; // État de connexion

// ==========================================================
// NOUVEAU: LOGIQUE DE GESTION DU CARROUSEL (Local Storage)
// ==========================================================

const STORAGE_KEY = 'carousel_admin_images';

/**
 * Charge la liste des images administrateur depuis le Local Storage.
 * @returns {Array<string>} Tableau de chaînes de caractères Base64.
 */
function loadAdminImages() {
    try {
        const json = localStorage.getItem(STORAGE_KEY);
        return json ? JSON.parse(json) : [];
    } catch (e) {
        console.error("Erreur de lecture du Local Storage:", e);
        return [];
    }
}

/**
 * Sauvegarde la liste des images administrateur dans le Local Storage.
 * @param {Array<string>} images - Tableau de chaînes de caractères Base64.
 */
function saveAdminImages(images) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(images));
    } catch (e) {
        console.error("Erreur d'écriture dans le Local Storage:", e);
    }
}

/**
 * Initialise l'interface de gestion du carrousel.
 */
function initCarouselManager() {
    const carouselManagerDiv = document.getElementById('carouselManager');
    const imageList = document.getElementById('adminImageList');
    const fileInput = document.getElementById('imageFileInput');

    if (!carouselManagerDiv || !imageList || !fileInput) {
        console.warn('Éléments de gestion du carrousel non trouvés. Assurez-vous que les IDs sont présents dans le HTML.');
        return;
    }

    // Fonction de rendu de la liste d'images
    function renderImageList() {
        imageList.innerHTML = '';
        const images = loadAdminImages();
        
        if (images.length === 0) {
            imageList.innerHTML = '<li style="color: #555; font-style: italic;">Aucune image ajoutée.</li>';
            return;
        }

        images.forEach((imgBase64, index) => {
            const li = document.createElement('li');
            li.style.display = 'flex';
            li.style.alignItems = 'center';
            li.style.marginBottom = '10px';
            li.style.padding = '5px';
            li.style.borderBottom = '1px solid #eee';

            const img = document.createElement('img');
            img.src = imgBase64;
            img.alt = `Image Admin ${index + 1}`;
            img.style.width = '60px';
            img.style.height = '40px';
            img.style.marginRight = '15px';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '3px';
            li.appendChild(img);

            const label = document.createElement('span');
            label.textContent = `Image ${index + 1} (Base64)`;
            li.appendChild(label);

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Supprimer';
            deleteBtn.style.marginLeft = 'auto';
            deleteBtn.style.background = '#d9534f';
            deleteBtn.style.color = 'white';
            deleteBtn.style.border = 'none';
            deleteBtn.style.padding = '5px 10px';
            deleteBtn.style.borderRadius = '3px';
            deleteBtn.style.cursor = 'pointer';

            deleteBtn.onclick = () => {
                deleteImage(index);
            };
            li.appendChild(deleteBtn);
            imageList.appendChild(li);
        });
    }

    // Fonction d'ajout d'image
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const newImage = e.target.result; // Base64 string
                const images = loadAdminImages();
                
                if (images.length >= 15) { 
                    // Limite arbitraire pour éviter de saturer le localStorage
                    alert('Maximum 15 images d\'administrateur atteint. Veuillez en supprimer d\'abord.');
                    return;
                }

                images.push(newImage);
                saveAdminImages(images);
                renderImageList();
                // Utiliser une boîte de message personnalisée au lieu d'alert() si possible dans votre HTML
                console.log('Image ajoutée. Rafraîchissez la page pour la voir dans le carrousel.');
                fileInput.value = ''; // Réinitialiser le champ
            };
            reader.readAsDataURL(file);
        }
    };
    
    // Fonction de suppression d'image
    function deleteImage(index) {
        // Remplacer 'confirm' par une modal UI personnalisée
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette image ? (Nécessite de rafraîchir la page pour être retirée du carrousel)')) return;

        const images = loadAdminImages();
        images.splice(index, 1);
        saveAdminImages(images);
        renderImageList();
        // Utiliser une boîte de message personnalisée
        console.log('Image supprimée. Rafraîchissez la page pour mettre à jour le carrousel.');
    }

    // Observer pour rafraîchir la liste lorsque le panneau admin est visible
    // Note: Cela dépend de votre structure HTML, mais l'idée est de s'assurer
    // que `renderImageList` est appelé lorsque `adminPanel` devient visible.
    const adminPanel = document.getElementById('adminPanel');
    if (adminPanel) {
        // Lorsque l'on passe de l'écran de PIN au panneau
        const observer = new MutationObserver(() => {
            if (adminPanel.style.display === 'block') {
                renderImageList();
            }
        });
        observer.observe(adminPanel, { attributes: true, attributeFilter: ['style'] });
    }

    // Rendre la liste à l'initialisation si l'admin est déjà connecté
    if (isAdminLoggedIn) {
        renderImageList();
    }
}


/**
 * Renvoie l'état de connexion de l'administrateur.
 * @returns {boolean}
 */
export function getAdminStatus() {
    return isAdminLoggedIn;
}

/**
 * Renvoie toutes les images d'administrateur stockées (Base64).
 * @returns {Array<string>} Tableau de chaînes de caractères Base64.
 */
export function getAdminImages() {
    return loadAdminImages();
}


/**
 * Initialise la logique du bouton admin et de la modal.
 * @param {HTMLElement} adminBtn - Le bouton déclencheur.
 * @param {HTMLElement} adminModal - La modal de connexion.
 * @param {HTMLElement} closeModal - Le bouton de fermeture de la modal.
 */
export function initAdmin(adminBtn, adminModal, closeModal) {
    if (!adminBtn || !adminModal || !closeModal) {
        console.error('Éléments Admin non trouvés dans le DOM.');
        return;
    }

    const pinInputs = Array.from(adminModal.querySelectorAll('.pin-input'));
    const pinScreen = document.getElementById('pinScreen');
    const adminPanel = document.getElementById('adminPanel');
    const pinError = document.getElementById('pinError');

    // Réinitialisation de l'état visuel à l'ouverture de la modal
    function resetModal() {
        pinInputs.forEach(input => input.value = '');
        pinError.style.opacity = 0;
        pinScreen.style.display = 'block';
        adminPanel.style.display = 'none';
        
        // Assurer le focus sur le premier champ après un petit délai
        setTimeout(() => {
            if (pinInputs.length > 0) {
                 pinInputs[0].focus();
            }
        }, 100); 
    }

    // Événement d'ouverture de la modal
    adminBtn.addEventListener('click', () => {
        adminModal.classList.add('active');
        if (isAdminLoggedIn) {
            // Si déjà connecté, afficher le panneau directement
            pinScreen.style.display = 'none';
            adminPanel.style.display = 'block';
            // Rendre la liste des images immédiatement
            initCarouselManager();
        } else {
            resetModal();
        }
    });

    // Événement de fermeture de la modal
    closeModal.addEventListener('click', () => {
        adminModal.classList.remove('active');
    });

    // Gestion de la saisie des PINs
    pinInputs.forEach((input, index) => {
        input.addEventListener('input', () => {
            // Passe automatiquement au champ suivant si un caractère est entré
            if (input.value.length === 1 && index < pinInputs.length - 1) {
                pinInputs[index + 1].focus();
            }
            attemptLogin();
        });

        // Gérer le retour arrière (Backspace)
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && input.value === '' && index > 0) {
                pinInputs[index - 1].focus();
            }
        });
        
        // Empêcher l'entrée de caractères non numériques (juste au cas où)
        input.addEventListener('keypress', (e) => {
            // Seuls les chiffres sont autorisés
            if (e.key === ' ' || isNaN(parseInt(e.key))) {
                e.preventDefault();
            }
        });
    });

    function attemptLogin() {
        const enteredCode = pinInputs.map(input => input.value).join('');

        if (enteredCode.length === ADMIN_CODE.length) {
            if (enteredCode === ADMIN_CODE) {
                isAdminLoggedIn = true;
                pinError.textContent = 'Connexion réussie !';
                pinError.style.color = 'green';
                pinError.style.opacity = 1;

                // IMPORTANT : Bascule d'affichage vers le panneau d'administration après succès
                setTimeout(() => {
                    pinScreen.style.display = 'none';
                    adminPanel.style.display = 'block';
                    pinError.style.opacity = 0; 
                    // Initialiser le gestionnaire de carrousel après l'affichage du panneau
                    initCarouselManager(); 
                }, 500); // Laisse 0.5s pour voir le message "Connexion réussie"

            } else {
                isAdminLoggedIn = false;
                pinError.textContent = 'Code incorrect.';
                pinError.style.color = 'red';
                pinError.style.opacity = 1;
                
                // Effacer tous les champs après un échec
                setTimeout(() => {
                    pinInputs.forEach(input => input.value = '');
                    if (pinInputs.length > 0) {
                         pinInputs[0].focus();
                    }
                }, 300);
            }
        } else {
            // Masquer le message d'erreur si le code est incomplet
            pinError.style.opacity = 0;
        }
    }
}