// javascript/main.js

import { setRendererToCanvasSize, adjustCameraForScreen, updateMousePosition } from './utils.js';
import { 
    initPhase1, updatePhase1, setAcceleratingState, 
    hasExploded, checkTrainIntersection, isMobile,
    createFallingCube
} from './phase1Train.js';
import { initPhase2, updatePhase2 } from './phase2Brush.js';
import { 
    initPhase3, updateCarouselPhase3, updateImageBandPhase3, 
    setPhase3Active, updateMousePosition3D, checkHoveredImage,
    mouse3D
} from './phase3Carousel.js';


// ==========================================================
// 1. THREE.JS SETUP GLOBAL
// ==========================================================
const canvas = document.getElementById('canvas3d');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000); 

// Caméra
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.outputColorSpace = THREE.SRGBColorSpace; 

// Lumières
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5); 
const light1 = new THREE.DirectionalLight(0xffffff, 0.8); 
const light2 = new THREE.PointLight(0xffffff, 1.5, 10); // Pour le pinceau

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

// État global pour les particules qui tombent (cubes)
let fallingCubes = [];

// ==========================================================
// 3. INITIALISATION DES PHASES
// ==========================================================
initPhase1(phase1Group);
initPhase2(phase2Group);
initPhase3(phase3Group);

// Configuration initiale
setRendererToCanvasSize(renderer, camera); 
adjustCameraForScreen(camera, phase1Group); 

// ==========================================================
// 4. GESTION DES ÉVÉNEMENTS (Pas de changement)
// ==========================================================
window.addEventListener('resize', () => { 
    setRendererToCanvasSize(renderer, camera); 
    adjustCameraForScreen(camera, phase1Group); 
});

const raycaster = new THREE.Raycaster(); 
const mouse = new THREE.Vector2(); 

// Logique pour la Phase 1 (Train)
if (!isMobile) { 
    canvas.addEventListener('mousemove', (e) => { 
        if (hasExploded) return; 
        const rect = canvas.getBoundingClientRect(); 
        const relX = (e.clientX - rect.left) / rect.width; 
        const relY = (e.clientY - rect.top) / rect.height; 
        // Zone d'accélération
        const shouldAccelerate = relX > 0.0 && relX < 0.6 && relY > 0.2 && relY < 0.8;
        setAcceleratingState(shouldAccelerate);
    }); 
} else { 
    canvas.addEventListener('touchstart', (e) => { 
        if (hasExploded) return; 
        const touch = e.touches[0]; 
        updateMousePosition(touch.clientX, touch.clientY, canvas, mouse); 
        // Vérifie l'intersection pour l'accélération mobile
        if (checkTrainIntersection(raycaster, camera, mouse)) setAcceleratingState(true); 
    }); 
    canvas.addEventListener('touchend', () => setAcceleratingState(false)); 
}

// Logique pour la Phase 3 (Carrousel)
canvas.addEventListener('mousemove', (e) => {
    updateMousePosition3D(e, canvas);
    checkHoveredImage(camera, canvas);
});


// Autres événements (Header/Intro)
window.addEventListener('scroll', () => {
    const h = document.getElementById('header'); 
    const scrollY = window.scrollY; 
    const heroHeight = window.innerHeight;
    const scroll3dSection = document.getElementById('scroll3dSection');
    const scroll3dEnd = heroHeight + (scroll3dSection ? scroll3dSection.offsetHeight : 0);
    // Logique Header pour la phase 2/3
    if (scrollY > scroll3dEnd + 50) { 
        h.classList.add('scrolled'); 
        h.classList.remove('phase2-header');
    } else if (scrollY > heroHeight - 100) { 
        h.classList.add('phase2-header'); 
        h.classList.remove('scrolled'); 
    } else if (scrollY > 50) { 
        h.classList.add('scrolled'); 
        h.classList.remove('phase2-header'); 
    } else { 
        h.classList.remove('scrolled'); 
        h.classList.remove('phase2-header'); 
    }
    
    const intro = document.getElementById('projectsIntro'); 
    if (intro && intro.getBoundingClientRect().top < window.innerHeight * 0.8) {
        intro.classList.add('visible');
    }
});

// Admin Modal
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
    
    const scrollY = window.scrollY;
    const heroHeight = window.innerHeight;
    const scroll3dSection = document.getElementById('scroll3dSection');
    const heroContent = document.querySelector('.hero-content');
    
    // --- FACTEURS DE TRANSITION ---
    let phase1to2Transition = Math.max(0, Math.min(1, (scrollY - (heroHeight * 0.1)) / (heroHeight * 0.9)));
    const scroll3dHeight = scroll3dSection ? scroll3dSection.offsetHeight : 0;
    const phase2End = heroHeight + scroll3dHeight;
    let phase2to3Transition = 0;
    if (scrollY > phase2End - heroHeight) {
        phase2to3Transition = Math.max(0, Math.min(1, (scrollY - (phase2End - heroHeight)) / (heroHeight * 0.01))); 
    }
    
    // --- PHASE 1 : TRAIN ---
    if (phase1to2Transition < 1) {
        phase1Group.visible = true;
        const opacity = 1 - phase1to2Transition;
        const pixelScale = (camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov/2)) * 2) / window.innerHeight;
        phase1Group.position.y = scrollY * pixelScale * 0.9; 
        phase1Group.traverse(o => { if(o.material) { o.material.transparent = true; o.material.opacity = opacity; } });
        
        updatePhase1(phase1Group, globalParticlesGroup, fallingCubes);
        
    } else { 
        phase1Group.visible = false; 
        if (hasExploded && Math.random() < 0.02) { 
            const fallingCube = createFallingCube(); 
            fallingCubes.push(fallingCube); 
            globalParticlesGroup.add(fallingCube); 
        } 
    }

    // --- CUBES TOMBANTS GLOBAUX ---
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

    // --- PHASE 2 : PINCEAU ---
    if (phase1to2Transition > 0 && scroll3dSection) { 
        phase2Group.visible = true;
        
        camera.position.set(0, 0, 10);
        camera.lookAt(0, 0, 0);

        const rect = scroll3dSection.getBoundingClientRect();
        const scrollH = scroll3dSection.offsetHeight - window.innerHeight;
        let p = 0; 
        if (scrollH > 0) p = -rect.top / scrollH;
        p = Math.min(1, Math.max(0, p));
        
        updatePhase2(p, phase2to3Transition, light2);

        // Progression et facteur de défilement pour le bandeau
        const bandAppearanceProgress = Math.max(0, Math.min(1, (scrollY - heroHeight) / (heroHeight * 0.5))); 
        const bandScrollFactor = Math.max(0, scrollY - heroHeight * 0.5); 
        updateImageBandPhase3(bandAppearanceProgress, bandScrollFactor); 

    } else { 
        phase2Group.visible = false; 
    }
    
    // --- PHASE 3 : CARROUSEL ---
    if (phase2to3Transition > 0.2) {
        phase3Group.visible = true;
        
        // >>> MODIFICATION ICI : Déplace la Phase 3 plus haut
        phase3Group.position.y = 1.5; 
        
        setPhase3Active(true, canvas);
        
        camera.position.set(0, 0, 10);
        camera.lookAt(0, 0, 0);
        
        const phase3Progress = Math.min(1, (phase2to3Transition - 0.2) / 0.8);
        
        updateCarouselPhase3(phase3Progress, camera);
        updateImageBandPhase3(1.0, scrollY); 
        
    } else {
        phase3Group.visible = false;
        // Réinitialiser la position quand la phase n'est pas active
        phase3Group.position.y = 0; 
        setPhase3Active(false, canvas);
    }
    
    // Contrôle la disparition du contenu HTML de la section héro
    if (heroContent) {
        heroContent.style.opacity = Math.max(0, 1 - phase1to2Transition * 1.5);
    }
    
    renderer.render(scene, camera);
} 

// DÉCLENCHEMENT DE L'ANIMATION
animate();