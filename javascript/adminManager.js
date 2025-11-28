// javascript/adminManager.js - VERSION CORRIGÉE AVEC TIMEOUTS ET TYPOGRAPHIE

import { imageFiles } from './phase3Carousel.js'; 

const ADMIN_CODE = '0000';
let isAdminLoggedIn = false;

const db = window.db; 
let cachedAdminImages = [];

const DEFAULT_COLORS = {
    // Couleurs de phase de fond
    COLOR_PHASE1: '#c92e2e',
    COLOR_PHASE2: '#c84508',
    COLOR_PHASE3: '#f57e43',
    // Couleurs du Pinceau 3D
    COLOR_BRUSH_HANDLE: '#333333',     // Manche (CylinderGeometry)
    COLOR_BRUSH_BRISTLES: '#f0c4df',   // Mine/Poils (ConeGeometry)
    // Couleur du texte de tracé (Phase 2)
    COLOR_PHASE2_TEXT: '#c84508',
    // NOUVEAU: Couleurs du texte d'introduction (Hero)
    COLOR_HERO_NAME: '#1a1a1a',        // Esther Marty
    COLOR_HERO_TITLE: '#777777',       // Graphisme & Design
};

const DEFAULT_TYPOGRAPHY = {
    fontUrlName: '',
    fontFamilyName: 'Playfair Display, serif', // Police de secours
};

const DB_CAROUSEL_KEY = 'carouselImages';
const DB_COLOR_KEY = 'phaseColors';
const DB_INITIALIZED_KEY = 'baseInitialized';
const DB_TYPOGRAPHY_KEY = 'customTypography'; // NOUVEAU

// NOUVEAU : Timeout pour éviter le blocage
const FIREBASE_TIMEOUT = 5000; // 5 secondes

let updateCallback = () => {};
let updateColorCallback = () => {}; 
let updateTypographyCallback = () => {}; // NOUVEAU

// ==========================================================
// UTILITAIRE : Promesse avec timeout
// ==========================================================

function promiseWithTimeout(promise, timeoutMs, fallbackValue) {
    return Promise.race([
        promise,
        new Promise((resolve) => setTimeout(() => {
            console.warn(`⏱️ Timeout après ${timeoutMs}ms, utilisation du fallback`);
            resolve(fallbackValue);
        }, timeoutMs))
    ]);
}

// ==========================================================
// GESTION CARROUSEL AVEC TIMEOUTS
// ==========================================================

function saveAdminImages(images) {
    if (!db) {
        console.warn('Firebase non disponible, impossible de sauvegarder');
        return;
    }
    
    const dataToSave = images.reduce((acc, image, index) => {
        acc[`item_${index}`] = image; 
        return acc;
    }, {});
    
    db.ref(DB_CAROUSEL_KEY).set(dataToSave)
        .then(() => console.log("[Firebase] Images sauvegardées"))
        .catch(e => console.error("[Firebase] Erreur sauvegarde:", e));
}

async function loadAdminImagesOnce() {
    if (!db) {
        console.warn('Firebase non disponible, retour des images par défaut');
        return imageFiles; // Retour des images de base
    }
    
    try {
        const snapshot = await promiseWithTimeout(
            db.ref(DB_CAROUSEL_KEY).once('value'),
            FIREBASE_TIMEOUT,
            null
        );
        
        if (!snapshot) {
            console.warn('Timeout Firebase, utilisation des images locales');
            return imageFiles;
        }
        
        const data = snapshot.val();
        return data ? Object.values(data) : imageFiles;
    } catch (e) {
        console.error("Erreur lecture Firebase:", e);
        return imageFiles; // Fallback sur images locales
    }
}

async function initializeImageStorage() {
    if (!db) {
        console.warn('Firebase non disponible, migration ignorée');
        return;
    }
    
    try {
        const initializedSnapshot = await promiseWithTimeout(
            db.ref(DB_INITIALIZED_KEY).once('value'),
            FIREBASE_TIMEOUT,
            { val: () => 'true' }
        );
        
        const isInitialized = initializedSnapshot.val() === 'true';
        
        if (!isInitialized) {
            console.log('Migration des images de base...');
            
            const existingImages = await loadAdminImagesOnce();
            const combinedImages = [...imageFiles, ...existingImages];
            
            saveAdminImages(combinedImages);
            db.ref(DB_INITIALIZED_KEY).set('true');
            
            console.log('✅ Images migrées');
        }
    } catch (error) {
        console.error('Erreur migration:', error);
    }
}

function initCarouselManager() {
    initializeImageStorage(); 
    
    const carouselManagerDiv = document.getElementById('carouselManager');
    const imageList = document.getElementById('adminImageList');
    const fileInput = document.getElementById('imageFileInput');

    if (!carouselManagerDiv || !imageList || !fileInput) {
        console.warn('Éléments carrousel non trouvés');
        return;
    }

    function deleteImage(index) {
        const images = [...cachedAdminImages];
        
        if (index < 0 || index >= images.length) {
            console.error("Index invalide");
            return;
        }
        
        images.splice(index, 1);
        saveAdminImages(images);
    }

    function renderImageList() {
        imageList.innerHTML = '';
        const allImages = cachedAdminImages;
        
        if (allImages.length === 0) {
            imageList.innerHTML = '<li style="color: #555; font-style: italic; padding: 10px 0;">Aucune image. Ajoutez-en une !</li>';
            return;
        }

        const title = document.createElement('h4');
        title.textContent = `Images du Carrousel (${allImages.length})`;
        title.style.marginTop = '15px';
        title.style.marginBottom = '10px';
        title.style.color = 'var(--color-primary)';
        imageList.appendChild(title);
        
        allImages.forEach((imgSource, index) => {
            const isBase64 = imgSource.startsWith('data:image/');
            
            const li = document.createElement('li');
            li.style.display = 'flex';
            li.style.alignItems = 'center';
            li.style.marginBottom = '5px';
            li.style.padding = '5px';
            li.style.borderBottom = '1px dashed #eee';

            if (isBase64) {
                const img = document.createElement('img');
                img.src = imgSource;
                img.alt = `Image ${index + 1}`;
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
            label.textContent = isBase64 ? `Admin ${index + 1}` : imgSource;
            label.style.fontSize = '0.9em';
            label.style.color = '#333';
            li.appendChild(label);

            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
            deleteBtn.title = 'Supprimer';
            deleteBtn.style.marginLeft = 'auto';
            deleteBtn.style.background = 'none';
            deleteBtn.style.color = '#d9534f';
            deleteBtn.style.border = 'none';
            deleteBtn.style.padding = '5px';
            deleteBtn.style.cursor = 'pointer';
            deleteBtn.style.fontSize = '1.1em';

            deleteBtn.onclick = (e) => {
                e.preventDefault();
                deleteImage(index);
            };
            li.appendChild(deleteBtn);
            imageList.appendChild(li);
        });
    }
    
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const newImage = e.target.result;
                const images = [...cachedAdminImages];
                
                if (images.length >= 15) { 
                    console.warn('Limite de 15 images atteinte');
                    return;
                }

                images.push(newImage);
                saveAdminImages(images);
                
                fileInput.value = '';
            };
            reader.readAsDataURL(file);
        }
    };
    
    window.renderAdminImageList = renderImageList;

    const adminPanel = document.getElementById('adminPanel');
    const tabContainer = document.querySelector('.admin-tabs');
    
    if (adminPanel && tabContainer) {
         tabContainer.addEventListener('click', (e) => {
            const target = e.target.closest('.tab-button');
            if (target && target.getAttribute('data-tab') === 'carousel-manager' && isAdminLoggedIn) {
                setTimeout(renderImageList, 100);
            }
         });
    }

    if (isAdminLoggedIn) {
        renderImageList();
    }
}

// ==========================================================
// GESTION COULEURS AVEC TIMEOUTS
// ==========================================================

export async function getPhaseColors() {
    if (!db) {
        console.warn('Firebase non disponible, couleurs par défaut');
        return DEFAULT_COLORS;
    }
    
    try {
        const snapshot = await promiseWithTimeout(
            db.ref(DB_COLOR_KEY).once('value'),
            FIREBASE_TIMEOUT,
            { val: () => null }
        );
        
        const storedColors = snapshot ? snapshot.val() : null;
        // On fusionne les couleurs stockées avec les couleurs par défaut
        return storedColors ? { ...DEFAULT_COLORS, ...storedColors } : DEFAULT_COLORS;
    } catch (e) {
        console.error("Erreur lecture couleurs:", e);
        return DEFAULT_COLORS;
    }
}

// Fonction pour obtenir uniquement les couleurs du pinceau et du tracé (exportée pour phase2Brush.js)
export async function getBrushColors() {
    const colors = await getPhaseColors();
    return {
        brushHandle: colors.COLOR_BRUSH_HANDLE,
        brushBristles: colors.COLOR_BRUSH_BRISTLES,
        // Utiliser la nouvelle couleur dédiée pour le tracé
        brushStroke: colors.COLOR_PHASE2_TEXT, 
    };
}

// NOUVEAU: Fonction pour appliquer les couleurs du texte Hero au CSS
function applyHeroTextColors(colors) {
    const root = document.documentElement;
    root.style.setProperty('--color-hero-name', colors.COLOR_HERO_NAME);
    root.style.setProperty('--color-hero-title', colors.COLOR_HERO_TITLE);
}

function savePhaseColors(colors) {
    if (!db) {
        console.warn('Firebase non disponible, sauvegarde impossible');
        return;
    }
    
    db.ref(DB_COLOR_KEY).set(colors)
        .then(() => {
            console.log("[Firebase] Couleurs sauvegardées");
            // Appliquer immédiatement les couleurs Hero au CSS
            applyHeroTextColors(colors);
            // Déclencher le callback pour la scène 3D (qui recharge la page si nécessaire)
            updateColorCallback();
        })
        .catch(e => console.error("[Firebase] Erreur couleurs:", e));
}

function initColorManager() {
    const colorManagerDiv = document.getElementById('colorManager');
    if (!colorManagerDiv) return;
    
    getPhaseColors().then(currentColors => { 
        // Appliquer les couleurs Hero chargées initialement
        applyHeroTextColors(currentColors);
        
        colorManagerDiv.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h4 style="color: var(--color-secondary); margin-bottom: 10px;">Couleurs de Fond (Phases)</h4>
                <div style="margin-bottom: 15px;">
                    <label for="colorPhase1" style="display: block; margin-bottom: 5px; font-weight: bold;">Phase 1 (Fond)</label>
                    <input type="color" id="colorPhase1" value="${currentColors.COLOR_PHASE1}" style="width: 100%; height: 40px; border: 1px solid #ccc; border-radius: 4px;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label for="colorPhase2" style="display: block; margin-bottom: 5px; font-weight: bold;">Phase 2 (Fond)</label>
                    <input type="color" id="colorPhase2" value="${currentColors.COLOR_PHASE2}" style="width: 100%; height: 40px; border: 1px solid #ccc; border-radius: 4px;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label for="colorPhase3" style="display: block; margin-bottom: 5px; font-weight: bold;">Phase 3 (Fond)</label>
                    <input type="color" id="colorPhase3" value="${currentColors.COLOR_PHASE3}" style="width: 100%; height: 40px; border: 1px solid #ccc; border-radius: 4px;">
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h4 style="color: var(--color-secondary); margin-bottom: 10px;">Couleurs du Texte Introductif (Hero)</h4>
                <div style="margin-bottom: 15px;">
                    <label for="colorHeroName" style="display: block; margin-bottom: 5px; font-weight: bold;">Nom ("Esther Marty")</label>
                    <input type="color" id="colorHeroName" value="${currentColors.COLOR_HERO_NAME}" style="width: 100%; height: 40px; border: 1px solid #ccc; border-radius: 4px;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label for="colorHeroTitle" style="display: block; margin-bottom: 5px; font-weight: bold;">Titre ("Graphisme & Design")</label>
                    <input type="color" id="colorHeroTitle" value="${currentColors.COLOR_HERO_TITLE}" style="width: 100%; height: 40px; border: 1px solid #ccc; border-radius: 4px;">
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h4 style="color: var(--color-secondary); margin-bottom: 10px;">Couleurs de la Phase 2 (Pinceau/Tracé)</h4>
                <div style="margin-bottom: 15px;">
                    <label for="colorBrushHandle" style="display: block; margin-bottom: 5px; font-weight: bold;">Manche (Bois)</label>
                    <input type="color" id="colorBrushHandle" value="${currentColors.COLOR_BRUSH_HANDLE}" style="width: 100%; height: 40px; border: 1px solid #ccc; border-radius: 4px;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label for="colorBrushBristles" style="display: block; margin-bottom: 5px; font-weight: bold;">Mine (Poils)</label>
                    <input type="color" id="colorBrushBristles" value="${currentColors.COLOR_BRUSH_BRISTLES}" style="width: 100%; height: 40px; border: 1px solid #ccc; border-radius: 4px;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label for="colorPhase2Text" style="display: block; margin-bottom: 5px; font-weight: bold;">Couleur du Tracé ("Mes dessins")</label>
                    <input type="color" id="colorPhase2Text" value="${currentColors.COLOR_PHASE2_TEXT}" style="width: 100%; height: 40px; border: 1px solid #ccc; border-radius: 4px;">
                </div>
            </div>

            <button id="saveColorsBtn" style="background: var(--color-primary); color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer;">
                Sauvegarder
            </button>
            <button id="resetColorsBtn" style="background: #999; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">
                Réinitialiser
            </button>
        `;
        
        const saveBtn = document.getElementById('saveColorsBtn');
        const resetBtn = document.getElementById('resetColorsBtn');
        
        saveBtn.onclick = () => {
            const newColors = {
                COLOR_PHASE1: document.getElementById('colorPhase1').value,
                COLOR_PHASE2: document.getElementById('colorPhase2').value,
                COLOR_PHASE3: document.getElementById('colorPhase3').value,
                COLOR_BRUSH_HANDLE: document.getElementById('colorBrushHandle').value,
                COLOR_BRUSH_BRISTLES: document.getElementById('colorBrushBristles').value,
                COLOR_PHASE2_TEXT: document.getElementById('colorPhase2Text').value,
                COLOR_HERO_NAME: document.getElementById('colorHeroName').value,
                COLOR_HERO_TITLE: document.getElementById('colorHeroTitle').value,
            };
            savePhaseColors(newColors);
        };
        
        resetBtn.onclick = () => {
            savePhaseColors(DEFAULT_COLORS);
            document.getElementById('colorPhase1').value = DEFAULT_COLORS.COLOR_PHASE1;
            document.getElementById('colorPhase2').value = DEFAULT_COLORS.COLOR_PHASE2;
            document.getElementById('colorPhase3').value = DEFAULT_COLORS.COLOR_PHASE3;
            document.getElementById('colorBrushHandle').value = DEFAULT_COLORS.COLOR_BRUSH_HANDLE;
            document.getElementById('colorBrushBristles').value = DEFAULT_COLORS.COLOR_BRUSH_BRISTLES;
            document.getElementById('colorPhase2Text').value = DEFAULT_COLORS.COLOR_PHASE2_TEXT;
            document.getElementById('colorHeroName').value = DEFAULT_COLORS.COLOR_HERO_NAME;
            document.getElementById('colorHeroTitle').value = DEFAULT_COLORS.COLOR_HERO_TITLE;
        };
    });
}

// ==========================================================
// GESTION TYPOGRAPHIE AVEC TIMEOUTS (NOUVEAU)
// ==========================================================

export async function getCustomTypography() {
    if (!db) {
        console.warn('Firebase non disponible, typographie par défaut');
        return DEFAULT_TYPOGRAPHY;
    }
    
    try {
        const snapshot = await promiseWithTimeout(
            db.ref(DB_TYPOGRAPHY_KEY).once('value'),
            FIREBASE_TIMEOUT,
            { val: () => null }
        );
        
        const storedFonts = snapshot ? snapshot.val() : null;
        return storedFonts ? { ...DEFAULT_TYPOGRAPHY, ...storedFonts } : DEFAULT_TYPOGRAPHY;
    } catch (e) {
        console.error("Erreur lecture typographie:", e);
        return DEFAULT_TYPOGRAPHY;
    }
}

function saveCustomTypography(typography) {
    if (!db) {
        console.warn('Firebase non disponible, sauvegarde impossible');
        return;
    }
    
    db.ref(DB_TYPOGRAPHY_KEY).set(typography)
        .then(() => {
            console.log("[Firebase] Typographie sauvegardée");
            updateTypographyCallback(typography); // Appelle le callback avec les nouvelles données
        })
        .catch(e => console.error("[Firebase] Erreur typographie:", e));
}

function initTypographyManager() {
    const typographyManagerDiv = document.getElementById('typographyManager');
    const fontError = document.getElementById('fontError');
    if (!typographyManagerDiv) return;
    
    getCustomTypography().then(currentFonts => { 
        document.getElementById('fontUrlName').value = currentFonts.fontUrlName || '';
        document.getElementById('fontFamilyName').value = currentFonts.fontFamilyName || DEFAULT_TYPOGRAPHY.fontFamilyName;

        const saveBtn = document.getElementById('saveTypographyBtn');
        const resetBtn = document.getElementById('resetTypographyBtn');
        
        saveBtn.onclick = () => {
            const newFonts = {
                fontUrlName: document.getElementById('fontUrlName').value.trim(),
                fontFamilyName: document.getElementById('fontFamilyName').value.trim(),
            };
            
            if (!newFonts.fontFamilyName) {
                 fontError.textContent = 'Le nom CSS est requis.';
                 return;
            }
            
            fontError.textContent = '';
            saveCustomTypography(newFonts);
        };
        
        resetBtn.onclick = () => {
            const defaultFonts = { 
                fontUrlName: '',
                fontFamilyName: DEFAULT_TYPOGRAPHY.fontFamilyName,
            };
            
            saveCustomTypography(defaultFonts);
            
            document.getElementById('fontUrlName').value = '';
            document.getElementById('fontFamilyName').value = DEFAULT_TYPOGRAPHY.fontFamilyName;
            
            fontError.textContent = '';
        };
    });
}


// ==========================================================
// LISTENER FIREBASE AVEC TIMEOUT
// ==========================================================

export function initializeCarouselListener(callback) {
    if (!db) {
        console.warn('Firebase non disponible, utilisation des images locales');
        callback(imageFiles);
        return;
    }
    
    // Timeout de sécurité : si Firebase ne répond pas en 5s, on utilise les images locales
    let hasReceivedData = false;
    
    setTimeout(() => {
        if (!hasReceivedData) {
            console.warn('⏱️ Timeout Firebase listener, chargement des images locales');
            cachedAdminImages = imageFiles;
            callback(imageFiles);
        }
    }, FIREBASE_TIMEOUT);
    
    db.ref(DB_CAROUSEL_KEY).on('value', (snapshot) => {
        hasReceivedData = true;
        const data = snapshot.val();
        const images = data ? Object.values(data) : imageFiles;
        console.log(`[Firebase] ${images.length} images récupérées`);
        cachedAdminImages = images;
        callback(images);
        
        if (window.renderAdminImageList && isAdminLoggedIn) {
             window.renderAdminImageList();
        }
    }, (error) => {
        console.error("Erreur Firebase:", error);
        cachedAdminImages = imageFiles;
        callback(imageFiles);
    });
}

// ==========================================================
// EXPORTS
// ==========================================================

export function setUpdateCallback(callback) {
    if (typeof callback === 'function') {
        updateCallback = callback;
    }
}

export function setUpdateColorCallback(callback) {
    if (typeof callback === 'function') {
        updateColorCallback = callback;
    }
}

export function setUpdateTypographyCallback(callback) { // NOUVEAU
    if (typeof callback === 'function') {
        updateTypographyCallback = callback;
    }
}

export function getAdminStatus() {
    return isAdminLoggedIn;
}

export function getAdminImages() {
    return cachedAdminImages;
}

export function initAdmin(adminBtn, adminModal, closeModal) {
    if (!adminBtn || !adminModal || !closeModal) {
        console.error('Éléments Admin non trouvés');
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
            
            initCarouselManager();
            initColorManager();
            initTypographyManager(); // NOUVEAU

            const defaultTab = 'carousel-manager';
            document.querySelectorAll('.admin-tabs .tab-button').forEach(btn => {
                btn.classList.remove('active');
                if (btn.getAttribute('data-tab') === defaultTab) {
                    btn.classList.add('active');
                }
            });
            document.querySelectorAll('.admin-panel .tab-content').forEach(content => {
                content.style.display = content.id === defaultTab ? 'block' : 'none';
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
                    
                    const defaultTab = 'carousel-manager';
                    document.querySelectorAll('.admin-tabs .tab-button').forEach(btn => {
                         btn.classList.remove('active');
                         if (btn.getAttribute('data-tab') === defaultTab) {
                             btn.classList.add('active');
                         }
                    });
                    document.querySelectorAll('.admin-panel .tab-content').forEach(content => {
                        content.style.display = content.id === defaultTab ? 'block' : 'none';
                    });
                    
                    initCarouselManager();
                    initColorManager();
                    initTypographyManager(); // NOUVEAU
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