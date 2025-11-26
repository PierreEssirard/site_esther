// javascript/main.js

import { setRendererToCanvasSize, adjustCameraForScreen, updateMousePosition } from './utils.js';
import { 
    initPhase1, updatePhase1, setAcceleratingState, 
    hasExploded, checkTrainIntersection, isMobile,
    createFallingCube, setMouseNormalizedX, setMouseNormalizedY 
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
scene.background = new THREE.Color(0xf08411); // Couleur de départ (Orange)

// Couleurs pour les transitions
const COLOR_PHASE1 = new THREE.Color(0xc92e2e); // rouge
const COLOR_PHASE2 = new THREE.Color(0xdb5a15); // orange
const COLOR_PHASE3 = new THREE.Color(0xf5ae43); // jaune

// Caméra
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.outputColorSpace = THREE.SRGBColorSpace; 

// Lumières
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5); 
scene.add(ambientLight);
const light1 = new THREE.DirectionalLight(0xffffff, 0.8); 
light1.position.set(5, 5, 5);
scene.add(light1);
const light2 = new THREE.PointLight(0xffffff, 1.5, 10); // Pour le pinceau
scene.add(light2);

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
// 4. GESTION DES ÉVÉNEMENTS
// ==========================================================
window.addEventListener('resize', () => { 
    setRendererToCanvasSize(renderer, camera); 
    adjustCameraForScreen(camera, phase1Group); 
});

const raycaster = new THREE.Raycaster(); 
const mouse = new THREE.Vector2(); 

// Logique pour la Phase 1 (Tapis)
if (!isMobile) { 
    canvas.addEventListener('mousemove', (e) => { 
        // 1. Calcul des positions pour le Raycasting/Suivi du tapis (mouse est en coordonnées normalisées 2D)
        updateMousePosition(e, canvas, mouse);

        // 2. Transmet les positions normalisées pour la rotation/l'effet de bord (même si non utilisé dans la logique actuelle)
        const normalizedX = (e.clientX / window.innerWidth) * 2 - 1; // -1 (gauche) à 1 (droite)
        const normalizedY = -(e.clientY / window.innerHeight) * 2 + 1; // -1 (bas) à 1 (haut)
        setMouseNormalizedX(normalizedX);
        setMouseNormalizedY(normalizedY); 

        // 3. LOGIQUE D'ACCÉLÉRATION AU SURVOL DU TAPIS (CHECK INTERSECTION)
        // Vérifie si la souris survole le tapis pour déclencher l'accélération (rotation chaotique/explosion)
        if (!hasExploded) {
            const isHovering = checkTrainIntersection(raycaster, camera, mouse);
            setAcceleratingState(isHovering);
        }

        if (hasExploded) return; 

        // Logique de l'accélération AVANT MODIFICATION (maintenant gérée par isHovering)
        // const rect = canvas.getBoundingClientRect(); 
        // const relX = (e.clientX - rect.left) / rect.width; 
        // const relY = (e.clientY - rect.top) / rect.height; 
        // const shouldAccelerate = relX > 0.0 && relX < 0.6 && relY > 0.2 && relY < 0.8;
        // setAcceleratingState(shouldAccelerate);
    }); 
} else { 
    canvas.addEventListener('touchstart', (e) => { 
        if (hasExploded) return; 
        const touch = e.touches[0]; 
        updateMousePosition(touch.clientX, touch.clientY, canvas, mouse); 
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
    const carouselScrollSection = document.getElementById('carouselScrollSection'); 
    
    const scroll3dEnd = heroHeight 
                        + (scroll3dSection ? scroll3dSection.offsetHeight : 0)
                        + (carouselScrollSection ? carouselScrollSection.offsetHeight : 0);
                        
    if (scrollY > scroll3dEnd) { 
        h.classList.add('scrolled'); 
        h.classList.remove('phase2-header');
    } else if (scrollY > heroHeight - 100) { 
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
    
    // --- CALCUL DES TRANSITIONS ---
    // Phase 1 -> Phase 2 transition
    let phase1to2Transition = 0;
    if (scrollY > heroHeight * 0.5) {
        phase1to2Transition = Math.min(1, (scrollY - heroHeight * 0.5) / (heroHeight * 0.5));
    }
    
    // Phase 2 -> Phase 3 transition
    const scroll3dHeight = scroll3dSection ? scroll3dSection.offsetHeight : 0;
    const phase2End = heroHeight + scroll3dHeight;
    let phase2to3Transition = 0;
    if (scrollY > phase2End - heroHeight) {
        phase2to3Transition = Math.max(0, Math.min(1, (scrollY - (phase2End - heroHeight)) / (heroHeight * 0.5))); 
    }

    // --- TRANSITION DE COULEUR DE FOND ---
    let targetColor = COLOR_PHASE1.clone();
    
    if (phase1to2Transition < 1) {
        // Transition Phase 1 (Orange) vers Phase 2 (Gris clair)
        targetColor.lerpColors(COLOR_PHASE1, COLOR_PHASE2, phase1to2Transition);
    } else if (phase2to3Transition < 1) {
        // Transition Phase 2 (Gris clair) vers Phase 3 (Noir)
        targetColor.lerpColors(COLOR_PHASE2, COLOR_PHASE3, phase2to3Transition);
    } else {
        // Phase 3 (Noir)
        targetColor = COLOR_PHASE3;
    }
    scene.background.copy(targetColor);
    // ------------------------------------
    
    // --- PHASE 1 : TRAIN ---
    if (phase1to2Transition < 1) {
        phase1Group.visible = true;
        const opacity = 1 - phase1to2Transition;
        const pixelScale = (camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov/2)) * 2) / window.innerHeight;
        phase1Group.position.y = scrollY * pixelScale * 0.9; 
        phase1Group.traverse(o => { 
            if(o.material) { 
                o.material.transparent = true; 
                o.material.opacity = opacity; 
            } 
        });
        
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

        // Progression du bandeau
        const bandAppearanceProgress = Math.max(0, Math.min(1, (scrollY - heroHeight) / (heroHeight * 0.5))); 
        const bandScrollFactor = Math.max(0, scrollY - heroHeight * 0.5); 
        updateImageBandPhase3(bandAppearanceProgress, bandScrollFactor); 

    } else { 
        phase2Group.visible = false; 
    }
    
    // --- PHASE 3 : CARROUSEL ---
    if (phase2to3Transition > 0.2) {
        phase3Group.visible = true;
        phase3Group.position.y = 0; 
        
        setPhase3Active(true, canvas);
        
        camera.position.set(0, 0, 10);
        camera.lookAt(0, 0, 0);
        
        const phase3Progress = Math.min(1, (phase2to3Transition - 0.2) / 0.8);
        
        updateCarouselPhase3(phase3Progress, camera);
        updateImageBandPhase3(1.0, scrollY); 
        
    } else {
        phase3Group.visible = false;
        phase3Group.position.y = 0; 
        setPhase3Active(false, canvas);
    }
    
    // Contrôle la disparition du contenu HTML
    if (heroContent) {
        heroContent.style.opacity = Math.max(0, 1 - phase1to2Transition * 1.5);
    }
    
    renderer.render(scene, camera);
} 

animate();