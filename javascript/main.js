// javascript/main.js - VERSION AVEC PRÉCHARGEMENT

import { setRendererToCanvasSize, adjustCameraForScreen, updateMousePosition } from './utils.js';
import { 
    initPhase1, updatePhase1, setAcceleratingState, 
    hasExploded, checkTrainIntersection, isMobile,
    createFallingCube, setMouseNormalizedX, setMouseNormalizedY,
    preloadModel, preloadCubeTextures // NOUVEAU
} from './phase1Train.js';
import { initPhase2, updatePhase2 } from './phase2Brush.js';
import { 
    initPhase3, updateCarouselPhase3, updateImageBandPhase3, 
    setPhase3Active, updateMousePosition3D, checkHoveredImage,
    mouse3D, preloadCarouselTextures // NOUVEAU
} from './phase3Carousel.js';

// ==========================================================
// 0. ÉCRAN DE CHARGEMENT
// ==========================================================

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
scene.background = new THREE.Color(0xc92e2e); // Couleur de départ (Rouge - cohérente avec loading)

const COLOR_PHASE1 = new THREE.Color(0xc92e2e);
const COLOR_PHASE2 = new THREE.Color(0xdb5a15);
const COLOR_PHASE3 = new THREE.Color(0xf57e43);

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

// MODIFICATION: Mise à jour de l'offset Z pour le recul de la caméra des phases 2 et 3
// Base Phase 2/3 (desktop): 10. Base Phase 1 (mobile, via utils.js): 20.0.
// On utilise 10 + 10 = 20 pour la cohérence.
const MOBILE_Z_OFFSET = window.innerWidth <= 480 ? 10.0 : 0; 

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

let isAppReady = false;

async function initializeApp() {
    try {
        let completedTasks = 0;
        const totalTasks = 3;
        
        // Fonction pour mettre à jour la progression
        const updateLoadingProgress = () => {
            completedTasks++;
            const percent = (completedTasks / totalTasks) * 100;
            updateProgress(percent);
        };
        
        // Précharger TOUTES les ressources avec suivi de progression
        const modelPromise = preloadModel().then(() => {
            updateLoadingProgress();
            console.log('✓ Modèle 3D chargé');
        });
        
        const cubePromise = preloadCubeTextures().then(() => {
            updateLoadingProgress();
            console.log('✓ Textures du cube chargées');
        });
        
        const carouselPromise = preloadCarouselTextures().then(() => {
            updateLoadingProgress();
            console.log('✓ Textures du carrousel chargées');
        });
        
        await Promise.all([modelPromise, cubePromise, carouselPromise]);
        
        // Initialiser les phases
        initPhase1(phase1Group);
        initPhase2(phase2Group);
        initPhase3(phase3Group);
        
        // Configuration initiale
        setRendererToCanvasSize(renderer, camera); 
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

// ==========================================================
// 4. GESTION DES ÉVÉNEMENTS
// ==========================================================
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
        
        // Correction de l'appel de fonction : elle prend l'objet event complet
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
    } else if (scrollY > heroHeight * 0.5) { 
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
if (adminBtn) { 
    adminBtn.addEventListener('click', () => adminModal.classList.add('active')); 
    closeModal.addEventListener('click', () => adminModal.classList.remove('active')); 
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
    
    let phase1to2Transition = 0;
    // Démarre la transition à 50% de la hauteur de la fenêtre
    if (scrollY > heroHeight * 0.5) {
        phase1to2Transition = Math.min(1, (scrollY - heroHeight * 0.5) / (heroHeight * 0.5));
    }
    
    const scroll3dHeight = scroll3dSection ? scroll3dSection.offsetHeight : 0;
    const phase2End = heroHeight + scroll3dHeight;
    let phase2to3Transition = 0;
    if (scrollY > phase2End - heroHeight) {
        phase2to3Transition = Math.max(0, Math.min(1, (scrollY - (phase2End - heroHeight)) / (heroHeight * 0.5))); 
    }

    let targetColor = COLOR_PHASE1.clone();
    
    if (phase1to2Transition < 1) {
        targetColor.lerpColors(COLOR_PHASE1, COLOR_PHASE2, phase1to2Transition);
    } else if (phase2to3Transition < 1) {
        targetColor.lerpColors(COLOR_PHASE2, COLOR_PHASE3, phase1to2Transition);
    } else {
        targetColor = COLOR_PHASE3;
    }
    scene.background.copy(targetColor);
    
    if (phase1to2Transition < 1) {
        phase1Group.visible = true;
        
        // Assure que la caméra est en position Phase 1 (position responsives de utils.js)
        // Ceci ajuste la position Z de la caméra sur mobile.
        adjustCameraForScreen(camera, phase1Group);
        
        // CORRECTION MAJEURE: Lier la position Y du groupe au scroll pour le faire remonter de manière synchronisée.
        // Utilisation de -30 pour garantir que le cube sorte de la vue vers le haut, synchronisé avec le texte.
        const scrollFactor3D = 60; 
        phase1Group.position.y = phase1to2Transition * scrollFactor3D; 
        
        const opacity = 1 - phase1to2Transition;
        
        // CORRECTION: Ne modifier QUE l'opacité, PAS le scale du group
        phase1Group.traverse(o => { 
            if(o.material) { 
                o.material.transparent = true; 
                o.material.opacity = opacity; 
            } 
        });
        
        updatePhase1(phase1Group, globalParticlesGroup, fallingCubes);
        
    } else { 
        // CORRECTION: Masque phase1Group pour ne pas le voir dans phase 2 et 3
        phase1Group.visible = false; 
    }

    // Gère la création continue des cubes après l'explosion, indépendamment du scroll (CORRECTIF)
    if (hasExploded && Math.random() < 0.02) { 
        const fallingCube = createFallingCube(); 
        fallingCubes.push(fallingCube); 
        globalParticlesGroup.add(fallingCube); 
    } 

    // Gère la chute des cubes (mouvement)
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
        
        // MODIFICATION : Utiliser l'offset Z augmenté pour le mobile (10 + 10 = 20)
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
        
        // MODIFICATION : Utiliser l'offset Z augmenté pour le mobile (10 + 10 = 20)
        camera.position.set(0, 0, 10 + MOBILE_Z_OFFSET);
        camera.lookAt(0, 0, 0);
        
        const phase3Progress = Math.min(1, (phase2to3Transition - 0.2) / 0.8);
        
        updateCarouselPhase3(phase3Progress, camera);
        updateImageBandPhase3(1.0, scrollY); 
        
    } else {
        phase3Group.visible = false;
        phase3Group.position.y = 0; 
        setPhase3Active(false, canvas);
    }
    
    if (heroContent) {
        // Le texte disparaît plus rapidement que la transition 3D (1.5x)
        heroContent.style.opacity = Math.max(0, 1 - phase1to2Transition * 1.5);
    }
    
    renderer.render(scene, camera);
} 

animate();