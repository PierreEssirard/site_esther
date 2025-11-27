// javascript/adminManager.js

// NOUVEAU: Import de la liste des fichiers d'images de base depuis phase3Carousel
import { imageFiles } from './phase3Carousel.js'; 

const ADMIN_CODE = '0000'; // Code secret de l'administrateur
let isAdminLoggedIn = false; // État de connexion

// NOUVEAU: Clé pour vérifier si les images de base ont déjà été copiées/initialisées dans le localStorage.
const BASE_INITIALIZED_KEY = 'carousel_base_initialized';

// NOUVEAU: Callback pour le rechargement de l'application (initialisé à une fonction vide)
let updateCallback = () => {};

// ==========================================================
// LOGIQUE DE GESTION DU CARROUSEL (Local Storage)
// ==========================================================

const STORAGE_KEY = 'carousel_admin_images';

/**
 * Charge la liste des images administrateur depuis le Local Storage.
 * @returns {Array<string>} Tableau de chaînes de caractères Base64 (ou noms de fichiers pour les images de base).
 */
function loadAdminImages() {
    try {
        const json = localStorage.getItem(STORAGE_KEY);
        // Les images peuvent être soit des Base64, soit des chemins de fichiers comme 'P1.jpeg'
        return json ? JSON.parse(json) : [];
    } catch (e) {
        console.error("Erreur de lecture du Local Storage:", e);
        return [];
    }
}

/**
 * Sauvegarde la liste des images administrateur dans le Local Storage.
 * @param {Array<string>} images - Tableau de chaînes de caractères Base64 ou chemins de fichiers.
 */
function saveAdminImages(images) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(images));
    } catch (e) {
        console.error("Erreur d'écriture dans le Local Storage:", e);
    }
}

/**
 * NOUVEAU: Initialise le stockage local du carrousel en y incluant
 * les images de base (P1.jpeg, etc.) si ce n'est pas déjà fait.
 * Cette fonction permet de tout gérer dans un seul tableau modifiable.
 */
function initializeImageStorage() {
    const isInitialized = localStorage.getItem(BASE_INITIALIZED_KEY);
    
    if (isInitialized !== 'true') {
        const existingImages = loadAdminImages();
        
        // On fusionne les images de base (fichiers) avec les images admin existantes
        const combinedImages = [...imageFiles, ...existingImages];
        
        saveAdminImages(combinedImages);
        localStorage.setItem(BASE_INITIALIZED_KEY, 'true');
        
        console.log('Images de base migrées vers le stockage local pour permettre la suppression/modification.');
        
        // Notifier le rechargement pour que phase3Carousel.js ait la liste complète
        updateCallback();
    }
}

/**
 * Initialise l'interface de gestion du carrousel.
 */
function initCarouselManager() {
    // Appel de la nouvelle fonction d'initialisation au démarrage du gestionnaire
    initializeImageStorage(); 
    
    const carouselManagerDiv = document.getElementById('carouselManager');
    const imageList = document.getElementById('adminImageList');
    const fileInput = document.getElementById('imageFileInput');

    if (!carouselManagerDiv || !imageList || !fileInput) {
        console.warn('Éléments de gestion du carrousel non trouvés. Assurez-vous que les IDs sont présents dans le HTML.');
        return;
    }

    // Fonction de suppression d'image (MAJ: fonctionne sur tous les éléments du tableau)
    function deleteImage(index) {
        const images = loadAdminImages();
        
        if (index < 0 || index >= images.length) {
            console.error("Index d'image invalide pour la suppression.");
            return;
        }
        
        images.splice(index, 1);
        saveAdminImages(images);
        renderImageList();
        
        // APPEL NOUVEAU: Notifie l'application principale que le carrousel doit être mis à jour
        console.log('Image supprimée. Notification de rechargement en cours.');
        updateCallback(); 
    }

    // Fonction de rendu de la liste d'images (MAJ: traite tous les éléments comme étant dans le même tableau)
    function renderImageList() {
        imageList.innerHTML = '';
        const allImages = loadAdminImages(); // MAJ: Charger TOUTES les images (Base + Admin)
        
        // 1. Gérer l'état vide total
        if (allImages.length === 0) {
            imageList.innerHTML = '<li style="color: #555; font-style: italic; padding: 10px 0;">Aucune image dans le carrousel. Ajoutez-en une !</li>';
            return;
        }

        // Ajout d'un titre de section unique (tout est dans le même tableau)
        const title = document.createElement('h4');
        title.textContent = `Liste des Images du Carrousel (${allImages.length} au total)`;
        title.style.marginTop = '15px';
        title.style.marginBottom = '10px';
        title.style.color = 'var(--color-primary)';
        title.style.fontSize = '1em';
        imageList.appendChild(title);
        
        // 2. Affichage des images
        allImages.forEach((imgSource, index) => {
            const isBase64 = imgSource.startsWith('data:image/'); // Vérifie si c'est une image Base64 ou un nom de fichier
            
            const li = document.createElement('li');
            li.style.display = 'flex';
            li.style.alignItems = 'center';
            li.style.marginBottom = '5px';
            li.style.padding = '5px';
            li.style.borderBottom = '1px dashed #eee'; 

            // Affichage de l'aperçu ou d'une icône pour les fichiers
            if (isBase64) {
                const img = document.createElement('img');
                img.src = imgSource;
                img.alt = `Image Admin ${index + 1}`;
                img.style.width = '50px'; 
                img.style.height = '35px'; 
                img.style.marginRight = '15px';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '2px';
                img.style.border = '1px solid #ddd'; 
                li.appendChild(img);
            } else {
                const icon = document.createElement('i');
                icon.className = 'fas fa-image';
                icon.style.color = 'var(--color-secondary)';
                icon.style.marginRight = '15px';
                icon.style.fontSize = '1.2em';
                icon.style.minWidth = '50px';
                icon.style.textAlign = 'center';
                li.appendChild(icon);
            }

            const label = document.createElement('span');
            label.textContent = isBase64 ? `Admin ${index + 1}` : imgSource; // Affiche le nom de fichier pour les images de base
            label.style.fontSize = '0.9em';
            label.style.color = '#333';
            li.appendChild(label);

            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>'; 
            deleteBtn.title = 'Supprimer l\'image';
            deleteBtn.style.marginLeft = 'auto';
            deleteBtn.style.background = 'none';
            deleteBtn.style.color = '#d9534f';
            deleteBtn.style.border = 'none';
            deleteBtn.style.padding = '5px';
            deleteBtn.style.borderRadius = '3px';
            deleteBtn.style.cursor = 'pointer';
            deleteBtn.style.transition = 'color 0.2s';
            deleteBtn.style.fontSize = '1.1em';
            deleteBtn.onmouseover = () => deleteBtn.style.color = '#c92e2e';
            deleteBtn.onmouseout = () => deleteBtn.style.color = '#d9534f';

            deleteBtn.onclick = (e) => {
                e.preventDefault();
                // Utilise l'index de allImages pour supprimer l'élément, qu'il soit Base ou Admin
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
                    console.warn('Limite maximale de 15 images administrateur atteinte. Veuillez en supprimer d\'abord.');
                    return;
                }

                images.push(newImage);
                saveAdminImages(images);
                renderImageList();
                
                console.log('Image ajoutée. Notification de rechargement en cours.');
                updateCallback(); 

                fileInput.value = ''; // Réinitialiser le champ
            };
            reader.readAsDataURL(file);
        }
    };
    
    // Observer pour rafraîchir la liste lorsque le panneau admin est visible
    const adminPanel = document.getElementById('adminPanel');
    if (adminPanel) {
        const observer = new MutationObserver((mutationsList, observer) => {
            const isPanelVisible = adminPanel.style.display === 'block';
            const carouselTab = document.querySelector('.tab-button[data-tab="carousel-manager"]');
            const isCarouselActive = carouselTab && carouselTab.classList.contains('active');
            
            if (isPanelVisible && isCarouselActive) {
                renderImageList();
            }
        });
        observer.observe(adminPanel, { attributes: true, attributeFilter: ['style'] });

        const tabContainer = document.querySelector('.admin-tabs');
        if (tabContainer) {
             tabContainer.addEventListener('click', (e) => {
                if (e.target.getAttribute('data-tab') === 'carousel-manager' && isAdminLoggedIn) {
                    setTimeout(renderImageList, 100); 
                }
             });
        }
    }

    if (isAdminLoggedIn) {
        renderImageList();
    }
}


/**
 * Définit la fonction à appeler lorsqu'un changement critique nécessite un rechargement.
 * @param {function} callback 
 */
export function setUpdateCallback(callback) {
    if (typeof callback === 'function') {
        updateCallback = callback;
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

    function resetModal() {
        pinInputs.forEach(input => input.value = '');
        pinError.style.opacity = 0;
        pinScreen.style.display = 'block';
        adminPanel.style.display = 'none';
        
        setTimeout(() => {
            if (pinInputs.length > 0) {
                 pinInputs[0].focus();
            }
        }, 100); 
    }

    adminBtn.addEventListener('click', () => {
        adminModal.classList.add('active');
        if (isAdminLoggedIn) {
            pinScreen.style.display = 'none';
            adminPanel.style.display = 'block';
            
            // Initialisation de la vue du carrousel et migration des images de base si nécessaire
            initCarouselManager(); 
            
            document.querySelectorAll('.admin-tabs .tab-button').forEach(btn => {
                if (btn.getAttribute('data-tab') === 'carousel-manager') {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
            document.querySelectorAll('.admin-panel .tab-content').forEach(content => {
                content.style.display = content.id === 'carousel-manager' ? 'block' : 'none';
            });
            
        } else {
            resetModal();
        }
    });

    closeModal.addEventListener('click', () => {
        adminModal.classList.remove('active');
    });

    pinInputs.forEach((input, index) => {
        input.addEventListener('input', () => {
            if (input.value.length === 1 && index < pinInputs.length - 1) {
                pinInputs[index + 1].focus();
            }
            attemptLogin();
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && input.value === '' && index > 0) {
                pinInputs[index - 1].focus();
            }
        });
        
        input.addEventListener('keypress', (e) => {
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

                setTimeout(() => {
                    pinScreen.style.display = 'none';
                    adminPanel.style.display = 'block';
                    pinError.style.opacity = 0; 
                    
                    document.querySelectorAll('.admin-tabs .tab-button').forEach(btn => {
                        if (btn.getAttribute('data-tab') === 'carousel-manager') {
                            btn.classList.add('active');
                        } else {
                            btn.classList.remove('active');
                        }
                    });
                    document.querySelectorAll('.admin-panel .tab-content').forEach(content => {
                        content.style.display = content.id === 'carousel-manager' ? 'block' : 'none';
                    });
                    
                    initCarouselManager(); 
                }, 500); 

            } else {
                isAdminLoggedIn = false;
                pinError.textContent = 'Code incorrect.';
                pinError.style.color = 'red';
                pinError.style.opacity = 1;
                
                setTimeout(() => {
                    pinInputs.forEach(input => input.value = '');
                    if (pinInputs.length > 0) {
                         pinInputs[0].focus();
                    }
                }, 300);
            }
        } else {
            pinError.style.opacity = 0;
        }
    }
}