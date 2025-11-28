// javascript/main.js - VERSION AVEC PRÉCHARGEMENT ET SYNCHRONISATION

import { setRendererToCanvasSize, adjustCameraForScreen, updateMousePosition } from './utils.js';
import { 
    initPhase1, updatePhase1, setAcceleratingState, 
    hasExploded, checkTrainIntersection, isMobile,
    createFallingCube, setMouseNormalizedX, setMouseNormalizedY,
    preloadModel, preloadCubeTextures, haussmannBuilding 
} from './phase1Train.js';
import { initPhase2, updatePhase2 } from './phase2Brush.js';
import { 
    initPhase3, updateCarouselPhase3, updateImageBandPhase3, 
    setPhase3Active, updateMousePosition3D, checkHoveredImage,
    mouse3D, preloadCarouselTextures 
} from './phase3Carousel.js';
// NOUVEAU: Import du manager d'administration et des fonctions Firebase
import { 
    initAdmin, getAdminStatus, setUpdateCallback, 
    initializeCarouselListener, // NOUVEAU: Écouteur Firebase pour les images
    getPhaseColors, setUpdateColorCallback, 
    getCustomTypography, setUpdateTypographyCallback // NOUVEAU: Typographie
} from './adminManager.js'; 

// ==========================================================
// 0. ÉCRAN DE CHARGEMENT & CACHE
// ==========================================================

// Cache local pour les données dynamiques
let phaseColors = {}; // Rempli par getPhaseColors
let customTypography = {}; // Rempli par getCustomTypography // NOUVEAU
let carouselImageSources = []; // Rempli par initializeCarouselListener
let isAppReady = false;

// Créer l'overlay de chargement
const loadingOverlay = document.createElement('div');
loadingOverlay.id = 'loading-overlay';
loadingOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #c92e2e;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    transition: opacity 0.5s ease;
`;

const loadingText = document.createElement('div');
loadingText.style.cssText = `
    color: white;
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 20px;
`;
loadingText.textContent = 'Chargement...';
loadingOverlay.appendChild(loadingText);

// Barre de progression
const progressBar = document.createElement('div');
progressBar.style.cssText = `
    width: 300px;
    height: 4px;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 2px;
    overflow: hidden;
`;

const progressFill = document.createElement('div');
progressFill.style.cssText = `
    width: 0%;
    height: 100%;
    background: white;
    border-radius: 2px;
    transition: width 0.3s ease;
`;
progressBar.appendChild(progressFill);
loadingOverlay.appendChild(progressBar);

document.body.appendChild(loadingOverlay);

// Fonction pour mettre à jour la progression
function updateProgress(percent) {
    progressFill.style.width = percent + '%';
}

// ==========================================================
// 1. THREE.JS SETUP GLOBAL
// ==========================================================
const canvas = document.getElementById('canvas3d');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.outputColorSpace = THREE.SRGBColorSpace; 

const ambientLight = new THREE.AmbientLight(0xffffff, 1.5); 
scene.add(ambientLight);
const light1 = new THREE.DirectionalLight(0xffffff, 0.8); 
light1.position.set(5, 5, 5);
scene.add(light1);
const light2 = new THREE.PointLight(0xffffff, 1.5, 10);
scene.add(light2);

const MOBILE_Z_OFFSET = window.innerWidth <= 480 ? 6.0 : 0; 
const PHASE3_MOBILE_ZOOM_Z = 12.0;
const MOBILE_TEXT_Y_POS = isMobile ? 0 : 0; 

// ==========================================================
// 2. GROUPES DE SCÈNE
// ==========================================================
const phase1Group = new THREE.Group();
scene.add(phase1Group);

const phase2Group = new THREE.Group();
scene.add(phase2Group);
phase2Group.visible = false; 

const phase3Group = new THREE.Group();
scene.add(phase3Group);
phase3Group.visible = false;

const globalParticlesGroup = new THREE.Group();
scene.add(globalParticlesGroup);

let fallingCubes = [];

// ==========================================================
// 3. PRÉCHARGEMENT ET INITIALISATION
// ==========================================================

// Fonction pour afficher un message d'alerte sans utiliser alert()
function showUpdateMessage() {
    // Créer un message temporaire en haut de l'écran
    const message = document.createElement('div');
    message.textContent = "Modification des données détectée. Rechargement de la page pour mettre à jour la scène 3D...";
    message.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        background: #c84508;
        color: white;
        padding: 10px;
        text-align: center;
        font-family: 'Cormorant Garamond', serif;
        z-index: 10001;
        transition: opacity 0.5s ease;
    `;
    document.body.appendChild(message);

    // Recharger la page après un court délai pour que l'utilisateur lise le message
    setTimeout(() => {
        window.location.reload();
    }, 2000); // 2 secondes
}

// NOUVEAU: Fonction pour mettre à jour la couleur de fond en temps réel (ASYNCHRONE)
function updateSceneColors() {
    // Récupère les dernières couleurs de Firebase
    getPhaseColors().then(latestColors => {
        phaseColors = latestColors; // Met à jour l'objet global
        // Le changement de couleur du fond se fait dans la boucle d'animation
        // pour que la transition reste douce.
        console.log('Couleurs de phase mises à jour en temps réel (prendra effet dans la prochaine transition).');
        
        // MAJ: Forcer un rechargement pour que la couleur du pinceau soit prise en compte
        // car initPhase2 n'est pas réexécuté.
        showUpdateMessage(); 

    }).catch(e => {
        console.error('Erreur lors de la mise à jour des couleurs:', e);
    });
}

// NOUVEAU: Fonction pour mettre à jour la typographie en temps réel (ASYNCHRONE)
function updateSceneTypography(newTypography) {
    // Récupère les dernières polices de Firebase ou utilise la nouvelle passée
    const updatePromise = newTypography 
        ? Promise.resolve(newTypography) 
        : getCustomTypography();
        
    updatePromise.then(latestTypography => {
        customTypography = latestTypography; // Met à jour l'objet global
        
        const styleElementId = 'custom-font-style';
        let styleElement = document.getElementById(styleElementId);
        
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = styleElementId;
            document.head.appendChild(styleElement);
        }

        // Applique l'import et le style CSS pour le nom (H1)
        styleElement.textContent = `
            ${customTypography.fontUrlName || ''}
            .hero-content h1 { font-family: ${customTypography.fontFamilyName}; }
        `;
        console.log('Typographie de phase mise à jour en temps réel.');
    }).catch(e => {
        console.error('Erreur lors de la mise à jour des typographies:', e);
    });
}


async function initializeApp() {
    try {
        let completedTasks = 0;
        // Total tasks: 1 (Model), 2 (Cube), 3 (Colors), 4 (Typography), 5 (Carousel Textures)
        const totalTasks = 5;
        
        // Fonction pour mettre à jour la progression
        const updateLoadingProgress = () => {
            completedTasks++;
            const percent = (completedTasks / totalTasks) * 100;
            updateProgress(percent);
        };
        
        // 1. Charger les ressources statiques
        const modelPromise = preloadModel().then(() => {
            updateLoadingProgress();
            console.log('✓ Modèle 3D chargé');
        });
        
        const cubePromise = preloadCubeTextures().then(() => {
            updateLoadingProgress();
            console.log('✓ Textures du cube chargées');
        });
        
        // 2. Charger les données dynamiques initiales de Firebase (Couleurs + Typographie)
        const colorPromise = getPhaseColors().then(colors => {
            phaseColors = colors;
            scene.background = new THREE.Color(phaseColors.COLOR_PHASE1);
            updateLoadingProgress();
            console.log('✓ Couleurs de phase chargées.');
        });
        
        const typographyPromise = getCustomTypography().then(typography => { // NOUVEAU
            customTypography = typography;
            updateLoadingProgress();
            console.log('✓ Typographie personnalisée chargée.');
        });
        
        // Attendre le chargement des données non images
        await Promise.all([modelPromise, cubePromise, colorPromise, typographyPromise]); // MODIFIÉ
        
        // 3. Initialiser l'écouteur de carrousel Firebase
        // NOTE: L'écouteur remplit `carouselImageSources` et déclenche `showUpdateMessage`
        // lors des changements après le chargement initial.
        const carouselListenerPromise = new Promise(resolve => {
            initializeCarouselListener((images) => {
                carouselImageSources = images;
                // Si l'application est déjà prête, ceci est un changement en temps réel, on recharge
                if (isAppReady) {
                    showUpdateMessage();
                } else {
                    // C'est le premier chargement, on résout la promesse
                    resolve();
                }
            });
        });
        
        // 4. Attendre la première liste d'images de Firebase
        await carouselListenerPromise;
        updateLoadingProgress();
        console.log('✓ Liste des images du carrousel chargée de Firebase.');


        // 5. Précharger les textures du carrousel avec les images récupérées
        // Cette étape est bloquante et garantit que les images sont prêtes.
        const carouselTexturePromise = preloadCarouselTextures(carouselImageSources).then(() => {
            updateLoadingProgress(); // Une progression finale pour le préchargement des textures
            console.log('✓ Textures du carrousel préchargées.');
        });
        
        await carouselTexturePromise;
        
        // 6. Initialiser les phases avec les données
        initPhase1(phase1Group);
        // initPhase2 est maintenant async et attend les couleurs du pinceau,
        // mais comme les couleurs sont déjà dans `phaseColors`, on peut le lancer.
        initPhase2(phase2Group); 
        phase2Group.position.y = MOBILE_TEXT_Y_POS;
        // Passe la liste d'images récupérée à la Phase 3
        initPhase3(phase3Group, carouselImageSources); 
        
        // Configuration initiale
        setRendererToCanvasSize(renderer, camera); 
        
        // Appliquer la typographie chargée initialement
        updateSceneTypography(customTypography); // NOUVEAU
        adjustCameraForScreen(camera, phase1Group);
        
        // Marquer l'application comme prête
        isAppReady = true;
        
        // Masquer l'écran de chargement avec un petit délai pour voir 100%
        setTimeout(() => {
            loadingOverlay.style.opacity = '0';
            setTimeout(() => {
                loadingOverlay.remove();
            }, 500);
        }, 300);
        
        console.log('🎉 Application prête !');
        
    } catch (error) {
        console.error('Erreur lors du chargement:', error);
        loadingText.textContent = 'Erreur de chargement. Veuillez rafraîchir.';
    }
}

// Lancer l'initialisation
initializeApp();

// CORRECTION: Forcer le texte à rester en place au chargement
const heroContent = document.querySelector('.hero-content');
if (heroContent) {
    heroContent.style.transform = 'translateY(0px)';
    heroContent.style.transition = 'none'; // Désactiver les transitions CSS
}

// ==========================================================
// 4. GESTION DES ÉVÉNEMENTS
// ==========================================================

// NOUVEAU: Connecter la fonction de rechargement à l'Admin Manager
setUpdateCallback(showUpdateMessage);
setUpdateColorCallback(updateSceneColors); // NOUVEAU: Connecter la fonction de mise à jour des couleurs
setUpdateTypographyCallback(updateSceneTypography); // NOUVEAU: Connecter la fonction de mise à jour des typos


window.addEventListener('resize', () => { 
    setRendererToCanvasSize(renderer, camera); 
    adjustCameraForScreen(camera, phase1Group); 
});

const raycaster = new THREE.Raycaster(); 
const mouse = new THREE.Vector2(); 

if (!isMobile) { 
    canvas.addEventListener('mousemove', (e) => { 
        updateMousePosition(e, canvas, mouse);

        const normalizedX = (e.clientX / window.innerWidth) * 2 - 1;
        const normalizedY = -(e.clientY / window.innerHeight) * 2 + 1;
        setMouseNormalizedX(normalizedX);
        setMouseNormalizedY(normalizedY); 

        if (!hasExploded) {
            const isHovering = checkTrainIntersection(raycaster, camera, mouse);
            setAcceleratingState(isHovering);
        }

        if (hasExploded) return; 
    }); 
} else { 
    // CORRECTION SCROLL/TOUCH: Permettre le défilement vertical sur le canvas
    if (canvas) {
        canvas.style.touchAction = 'pan-y';
    } 
    
    canvas.addEventListener('touchstart', (e) => { 
        if (hasExploded) return; 
        const touch = e.touches[0]; 
        
        updateMousePosition(touch, canvas, mouse); 
        
        if (checkTrainIntersection(raycaster, camera, mouse)) setAcceleratingState(true); 
    }); 
    canvas.addEventListener('touchend', () => setAcceleratingState(false)); 
}

canvas.addEventListener('mousemove', (e) => {
    updateMousePosition3D(e, canvas);
    checkHoveredImage(camera, canvas);
});

window.addEventListener('scroll', () => {
    const h = document.getElementById('header'); 
    const scrollY = window.scrollY; 
    const heroHeight = window.innerHeight;
    const scroll3dSection = document.getElementById('scroll3dSection');
    const carouselScrollSection = document.getElementById('carouselScrollSection'); 
    
    const scroll3dEnd = heroHeight 
                        + (scroll3dSection ? scroll3dSection.offsetHeight : 0)
                        + (carouselScrollSection ? carouselScrollSection.offsetHeight : 0);
                        
    if (scrollY > scroll3dEnd) { 
        h.classList.add('scrolled'); 
        h.classList.remove('phase2-header');
    } else if (scrollY > heroHeight * 0.8) { 
        h.classList.add('phase2-header'); 
        h.classList.remove('scrolled'); 
    } else { 
        h.classList.remove('scrolled'); 
        h.classList.remove('phase2-header'); 
    }
    
    const intro = document.getElementById('projectsIntro'); 
    if (intro && intro.getBoundingClientRect().top < window.innerHeight * 0.8) {
        intro.classList.add('visible');
    }
});

const adminBtn = document.getElementById('adminBtn'); 
const adminModal = document.getElementById('adminModal'); 
const closeModal = document.getElementById('closeModal');

// NOUVEAU: Initialisation de la logique du panneau d'administration
if (adminBtn && adminModal && closeModal) {
    initAdmin(adminBtn, adminModal, closeModal);
}


// ==========================================================
// 5. BOUCLE D'ANIMATION PRINCIPALE
// ==========================================================
function animate() {
    requestAnimationFrame(animate);
    
    // Ne rien afficher tant que l'app n'est pas prête
    if (!isAppReady) {
        renderer.render(scene, camera);
        return;
    }
    
    const scrollY = window.scrollY;
    const heroHeight = window.innerHeight;
    const scroll3dSection = document.getElementById('scroll3dSection');
    const heroContent = document.querySelector('.hero-content');
    
    // NOUVELLE LOGIQUE: Transition progressive dès le début du scroll
    // La transition va de 0 à 1 sur toute la hauteur de la hero section
    let phase1to2Transition = Math.min(1, scrollY / heroHeight);
    
    // Nous allons utiliser la hauteur de déplacement du texte HTML comme référence
    // pour la translation du cube 3D.
    let textTranslateY = 0;

    // SYNCHRONISATION DU TEXTE - Monte dès le début
    if (heroContent) {
        // Le texte se déplace par le scrollY lui-même
        textTranslateY = scrollY;
        
        heroContent.style.transform = `translateY(-${textTranslateY}px)`;
        heroContent.style.opacity = Math.max(0, 1 - phase1to2Transition * 1.5);
    }
    
    const scroll3dHeight = scroll3dSection ? scroll3dSection.offsetHeight : 0;
    const phase2End = heroHeight + scroll3dHeight;
    let phase2to3Transition = 0;
    if (scrollY > phase2End - heroHeight) {
        // La transition 2->3 commence à phase2End - heroHeight
        phase2to3Transition = Math.max(0, Math.min(1, (scrollY - (phase2End - heroHeight)) / (heroHeight * 2))); 
    }

    // MODIFICATION: Utilisation de l'objet phaseColors
    let targetColor = new THREE.Color(phaseColors.COLOR_PHASE1);
    
    // Logique de transition des couleurs
    if (phase1to2Transition < 1) {
        targetColor.lerpColors(
            new THREE.Color(phaseColors.COLOR_PHASE1), 
            new THREE.Color(phaseColors.COLOR_PHASE2), 
            phase1to2Transition
        );
    } else if (phase2to3Transition < 1) {
        targetColor.lerpColors(
            new THREE.Color(phaseColors.COLOR_PHASE2), 
            new THREE.Color(phaseColors.COLOR_PHASE3), 
            phase2to3Transition
        );
    } else {
        targetColor.set(phaseColors.COLOR_PHASE3);
    }
    scene.background.copy(targetColor);
    
    if (phase1to2Transition < 1) {
        phase1Group.visible = true;
        
        // Assure que la caméra est en position Phase 1
        adjustCameraForScreen(camera, phase1Group);
        
        const scrollLiftFactor = 8; 
        
        phase1Group.position.x = phase1to2Transition * -10; 
        
        const opacity = 1 - phase1to2Transition;
        
        phase1Group.traverse(o => { 
            if(o.material) { 
                o.material.transparent = true; 
                o.material.opacity = opacity; 
            } 
        });
        
        updatePhase1(phase1Group, globalParticlesGroup, fallingCubes);
        
    } else { 
        phase1Group.visible = false; 
    }

    // Gère la création continue des cubes après l'explosion
    if (hasExploded && Math.random() < 0.02) { 
        const fallingCube = createFallingCube(); 
        fallingCubes.push(fallingCube); 
        globalParticlesGroup.add(fallingCube); 
    } 

    // Gère la chute des cubes
    for (let i = fallingCubes.length - 1; i >= 0; i--) { 
        let p = fallingCubes[i]; 
        p.position.add(p.userData.velocity); 
        p.rotation.x += p.userData.rotation.x; 
        p.rotation.y += p.userData.rotation.y; 
        if (p.position.y < -10) { 
            globalParticlesGroup.remove(p); 
            fallingCubes.splice(i, 1); 
        } 
    }

    if (phase1to2Transition > 0 && scroll3dSection) { 
        phase2Group.visible = true;
        
        camera.position.set(0, 0, 10 + MOBILE_Z_OFFSET); 
        camera.lookAt(0, 0, 0);

        const rect = scroll3dSection.getBoundingClientRect();
        const scrollH = scroll3dSection.offsetHeight - window.innerHeight;
        let p = 0; 
        if (scrollH > 0) p = -rect.top / scrollH;
        p = Math.min(1, Math.max(0, p));
        
        updatePhase2(p, phase2to3Transition, light2);

        const bandAppearanceProgress = Math.max(0, Math.min(1, (scrollY - heroHeight) / (heroHeight * 0.5))); 
        const bandScrollFactor = Math.max(0, scrollY - heroHeight * 0.5); 
        updateImageBandPhase3(bandAppearanceProgress, bandScrollFactor); 

    } else { 
        phase2Group.visible = false; 
    }
    
    if (phase2to3Transition > 0.2) {
        phase3Group.visible = true;
        phase3Group.position.y = 0; 
        
        setPhase3Active(true, canvas);
        
        const phase3Z = isMobile ? PHASE3_MOBILE_ZOOM_Z : 10 + MOBILE_Z_OFFSET;
        
        camera.position.set(0, 0, phase3Z);
        camera.lookAt(0, 0, 0);
        
        const phase3Progress = Math.min(1, (phase2to3Transition - 0.2) / 0.8);
        
        updateCarouselPhase3(phase3Progress, camera);
        updateImageBandPhase3(1.0, scrollY); 
        
    } else {
        phase3Group.visible = false;
        phase3Group.position.y = 0; 
        setPhase3Active(false, canvas);
    }
    
    renderer.render(scene, camera);
} 

animate();