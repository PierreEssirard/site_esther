// Déclarations des variables d'état (exportées si modifiées depuis l'extérieur)
export let trainProgress = 0; 
export let currentSpeed = 0.0012; 
export let isAccelerating = false; 
export let hasExploded = false;
let fastLapCount = 0; 
let lapStarted = false;
let particles = []; 
let haussmannBuilding = null; // Reste pour la compatibilité avec l'ancienne référence
export let mouseNormalizedX = 0; 
export let mouseNormalizedY = -1; 
let hasBeenTouched = false; // NOUVEL ÉTAT: Vérifie si le tapis a été touché une fois

// Objets Three.js de la phase 1
let loadedModel = null; // Référence au modèle 3D chargé
let modelContainer;     // Conteneur global pour le modèle (pour la position et la rotation de l'apesanteur)
// NOUVEAU: Suivi de l'échelle cible pour l'effet de gonflement
let currentModelScale = 1.0; 

const isMobile = /Android|webOS|iPhone|iPad|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Constantes pour la rotation en apesanteur (Maintenant pour le mouvement de la souris)
const ROTATION_STRENGTH = 2.5; 
const EXPLOSION_THRESHOLD = 0.7; 
const FLOATING_ROTATION_SPEED = 0.002; // Vitesse de base pour la détection de l'explosion
const LERP_SMOOTHNESS = 0.15; // Rend le mouvement plus fluide (moins réactif, plus doux)
// Ajustement de la rotation pour voir la surface colorée
const BASE_ROTATION_X = THREE.MathUtils.degToRad(70); // Inclinaison pour voir la surface (bas)
const BASE_ROTATION_Y = THREE.MathUtils.degToRad(40);  // Tourné vers la droite (comme l'image)
const BASE_ROTATION_Z = THREE.MathUtils.degToRad(-10); // Légèrement penché sur le côté
const CHAOS_ROTATION_SPEED = 0.2; // Vitesse de rotation aléatoire lors de l'accélération
const CONTINUOUS_ROTATION_SPEED = 0.005; // Vitesse de rotation douce au centre (Maintenant pour le mouvement continu après le survol)
// NOUVELLE CONSTANTE: Vitesse de grossissement pendant l'accélération
const SCALING_SPEED = 0.03; 

// URLs de placeholders pour les six faces du cube (à remplacer par vos images)
const CUBE_TEXTURE_URLS = [
    'P2.jpeg', // Face 1 (+X)
    'P2.jpeg', // Face 2 (-X)
    'P2.jpeg', // Face 3 (+Y)
    'P2.jpeg', // Face 4 (-Y)
    'P2.jpeg', // Face 5 (+Z)
    'P2.jpeg', // Face 6 (-Z)
];

// ==========================================================
// A. Fonctions de création (Décor & Train)
// ==========================================================

function createParticle(position, velocity) { 
    // TAILLE DES PARTICULES AUGMENTÉE POUR UNE EXPLOSION PLUS FLAGRANTE
    const size = Math.random() * 0.3 + 0.1; // De 0.1 à 0.4
    // Utilisation des couleurs pour les particules
    const colors = [0xa8d0ff, 0xf0c4df, 0xfff1a8]; 
    const particle = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), new THREE.MeshBasicMaterial({ color: colors[Math.floor(Math.random() * colors.length)] })); 
    particle.position.copy(position); 
    particle.userData.velocity = velocity; 
    return particle; 
}

// NOTE: La fonction `createThickWire` a été supprimée.

/**
 * NOUVELLE FONCTION: Crée un cube suspendu par deux fils ancrés aux extrémités.
 * MODIFIÉ: Suppression de la création des fils/cylindres. Ne crée que le cube.
 */
function createSimpleSuspendedCube() {
    const sculpture = new THREE.Group();
    const cubeSize = 3.0;

    // 1. Création du Cube ROTATIF AVEC TEXTURES
    const loader = new THREE.TextureLoader();
    const materials = CUBE_TEXTURE_URLS.map(url => {
        const texture = loader.load(url, 
            () => {}, // onSuccess
            undefined, // onProgress
            (err) => { console.error('Erreur chargement texture cube:', err); }
        );
        // Utilisation de MeshBasicMaterial qui supporte les textures (map) et n'exige pas d'éclairage
        return new THREE.MeshBasicMaterial({ 
            map: texture
        });
    });

    const cube = new THREE.Mesh(
        new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize), 
        materials // Utilise l'array de matériaux (un par face)
    );
    cube.position.y = 0; // Position centrale du cube à 0
    cube.userData.isRotating = true; // Marqueur pour la rotation dans updatePhase1
    sculpture.add(cube); // Ajout du cube au groupe

    // NOTE: La création des Fils Supérieur et Inférieur a été supprimée ici.
    
    // Position du groupe (Centré et légèrement en avant)
    sculpture.position.set(-6, -6, -6); // RÉINITIALISÉ: X à 0 (centré)
    sculpture.userData.isCube = true; // Drapeau pour l'identification dans updatePhase1
    
    return sculpture;
}


/**
 * Remplacement de l'ancienne fonction de création du bâtiment par le nouveau cube.
 */
function createHaussmannBuilding() {
    return createSimpleSuspendedCube(); // Appel de la nouvelle fonction
}


/**
 * Initialise et ajoute le modèle 3D 'tapis.glb' au groupe.
 * @param {THREE.Group} phase1Group
 */
export function initPhase1(phase1Group) {
    // Création d'un conteneur pour le modèle au centre de la scène (Phase 1)
    modelContainer = new THREE.Group();
    modelContainer.position.set(-6, 0, 0); // Position X à -6 (plus à gauche)
    phase1Group.add(modelContainer);

    // Suppression de la création des rails et de la courbe circulaire (Non nécessaires)
    
    // --- NOUVEAU: CHARGEMENT DU MODÈLE 3D (tapis.glb) ---
    const loader = new THREE.GLTFLoader();
    loader.load(
        'tapis.glb', 
        (gltf) => {
            loadedModel = gltf.scene;
            
            // Mise à l'échelle pour un affichage en grand, au centre
            const targetScale = 8; // Taille augmentée à 8
            currentModelScale = targetScale; // Initialisation de l'échelle actuelle
            loadedModel.scale.setScalar(targetScale); 
            
            // Rotation de départ : Fait face à l'écran (0, 0, 0)
            // Définir la rotation initiale sur la position stable
            loadedModel.rotation.set(BASE_ROTATION_X, BASE_ROTATION_Y, BASE_ROTATION_Z); 
            
            // Recalculer l'échelle par rapport à la taille réelle pour éviter les surprises
            const box = new THREE.Box3().setFromObject(loadedModel);
            const size = box.getSize(new THREE.Vector3());
            loadedModel.scale.multiplyScalar(targetScale / Math.max(size.x, size.y, size.z));
            
            // Ajout du modèle au conteneur
            modelContainer.add(loadedModel);
            
            // Rendre le modèle transparent pour la transition de phase
            loadedModel.traverse(o => {
                if (o.isMesh) {
                    o.material.transparent = true;
                    o.material.opacity = 1.0;
                }
            });

        }, 
        undefined, 
        (error) => {
            console.error('Erreur lors du chargement du modèle 3D (tapis.glb):', error);
            // Fallback (Si le modèle ne charge pas, on ne fait rien, mais on pourrait ajouter un objet simple)
        }
    );
    // -----------------------------------------------------

    // Les wagons factices et la fonction createFallbackWagons sont supprimés.
    // Les variables wagonGroup, rail, railInner ne sont plus utilisées.
}

// ==========================================================
// B. Logique d'Explosion et Accélération
// ==========================================================

export function explodeTrain(phase1Group) { 
    if (hasExploded) return;
    hasExploded = true; 
    isAccelerating = false; 
    hasBeenTouched = false; // Réinitialisation de l'état
    const canvas = document.getElementById('canvas3d');
    canvas.style.cursor = 'default'; 
    
    // Rendre le modèle invisible ou le retirer
    if (loadedModel) {
        loadedModel.visible = false;
        // Optionnel : Réinitialiser l'échelle à la normale après l'explosion pour éviter des problèmes
        // currentModelScale = 8; // Réinitialisation à l'échelle de départ si nécessaire plus tard
    }
    
    // Position d'explosion (le centre de la scène)
    const explosionPosition = loadedModel ? modelContainer.position : new THREE.Vector3(-6, 0, 0);
    
    // NOMBRE DE PARTICULES AUGMENTÉ
    for (let i = 0; i < 500; i++) { // Passé de 150 à 500 particules
        // VITESSE INITIALE DES PARTICULES AUGMENTÉE
        const v = new THREE.Vector3((Math.random()-0.5)*8, (Math.random()-0.5)*8, (Math.random()-0.5)*8); // Multiplicateur de 4 à 8
        // Les particules commencent à l'endroit où le modèle était
        const p = createParticle(explosionPosition, v); 
        particles.push(p); 
        phase1Group.add(p); 
    } 
    setTimeout(() => { 
        haussmannBuilding = createHaussmannBuilding(); 
        // Positionner le cube au centre de la scène pour l'apparition
        haussmannBuilding.position.set(-5, 0, 0); 
        phase1Group.add(haussmannBuilding); 
        // Note: Le cube apparaît sans animation de scale, directement à taille normale.
    }, 1000); 
}

// ==========================================================
// C. Logique de Mise à Jour (dans la boucle animate)
// ==========================================================

/**
 * Met à jour l'animation du tapis en apesanteur ou l'animation d'explosion/chute.
 * @param {THREE.Group} phase1Group
 * @param {THREE.Group} globalParticlesGroup
 * @param {Array<THREE.Mesh>} fallingCubes - Référence à la liste des cubes globaux
 */
export function updatePhase1(phase1Group, globalParticlesGroup, fallingCubes) {
    if (!hasExploded) {
        
        // --- LOGIQUE D'ACCÉLÉRATION ET D'EXPLOSION ---
        
        // Logique de vitesse : si le tapis a été touché, il est en mode accélération jusqu'à l'explosion.
        if (isAccelerating || hasBeenTouched) { 
            currentSpeed += (0.05 - currentSpeed) * 0.1; // Vitesse rapide
        } else {
            currentSpeed += (FLOATING_ROTATION_SPEED - currentSpeed) * 0.05; // Ralentit vers la vitesse flottante de base
        }
        
        // Verrouille l'accélération si hasBeenTouched est vrai
        if (hasBeenTouched) {
             isAccelerating = true;
        }

        const oldP = trainProgress; 
        trainProgress = (trainProgress + currentSpeed) % 1; 
        
        // Logique de détection de tour rapide pour l'explosion (basée sur la vitesse)
        if (currentSpeed > 0.025) { 
            if (!lapStarted) lapStarted = true; 
            if (currentSpeed > 0.04) {
                 fastLapCount++;
                 // Le test d'explosion utilise toujours le fastLapCount pour la durée
                 if (fastLapCount >= 30) explodeTrain(phase1Group); 
            }
        } else { 
            lapStarted = false; 
            fastLapCount = 0; 
        }

        // --- 2. MISE À JOUR DU SCALING ET DE LA ROTATION DU MODÈLE 3D ---
        if (loadedModel) {
            
            // Rotation Cible Stable: Les rotations de base
            const targetRotationX = BASE_ROTATION_X;
            const targetRotationZ = BASE_ROTATION_Z;

            if (isAccelerating) {
                // PHASE CHAOS: GROSSISSEMENT (au lieu de la rotation intense)
                currentModelScale += SCALING_SPEED;
                modelContainer.scale.setScalar(currentModelScale);
                
                // Optionnel : Ajouter une rotation douce pour montrer le grossissement sous plusieurs angles
                loadedModel.rotation.y += 0.02;
                
            } else {
                // PHASE INITIALE STABLE: Rotation douce et retour à l'échelle de base (8)
                
                // Retour lent à l'échelle initiale (8.0)
                currentModelScale += (8.0 - currentModelScale) * LERP_SMOOTHNESS;
                modelContainer.scale.setScalar(currentModelScale);
                
                // Rotation Y (Rotation douce continue)
                loadedModel.rotation.y += CONTINUOUS_ROTATION_SPEED; 
                
                // Ramène la rotation X à la rotation de base
                loadedModel.rotation.x += (targetRotationX - loadedModel.rotation.x) * LERP_SMOOTHNESS; 
                
                // Ramène la rotation Z à la rotation de base
                loadedModel.rotation.z += (targetRotationZ - loadedModel.rotation.z) * LERP_SMOOTHNESS; 
            }
            
            // 3. Petit mouvement vertical sinusoïdal (lévitation)
            modelContainer.position.y = Math.sin(Date.now() * 0.002) * 0.15; 
        }
    } else {
        // Animation d'explosion
        for (let i = particles.length - 1; i >= 0; i--) { 
            let p = particles[i]; 
            p.position.add(p.userData.velocity); 
            // GRAVITÉ DES PARTICULES AUGMENTÉE
            p.userData.velocity.y -= 0.005; // Passé de 0.002 à 0.005
            // ROTATION DES PARTICULES AUGMENTÉE
            p.rotation.x += 0.05; // Passé de 0.02 à 0.05
            p.rotation.y += 0.05; // Passé de 0.02 à 0.05
            if (p.position.y < -10) { 
                phase1Group.remove(p); 
                particles.splice(i, 1); 
            } 
        }
        
        // Bâtiment après explosion (MAINTENANT LE CUBE)
        if (haussmannBuilding) { 
            // Fait tourner le cube sur lui-même 
            const cubeMesh = haussmannBuilding.children.find(child => child.userData.isRotating);
            
            if (cubeMesh) {
                cubeMesh.rotation.y += 0.01; 
                cubeMesh.rotation.x += 0.005; // Petit mouvement supplémentaire
            }
            
            // Crée les cubes tombants pendant la phase post-explosion
            if (Math.random() < 0.03) { 
                const fallingCube = createFallingCube(); 
                fallingCubes.push(fallingCube); 
                globalParticlesGroup.add(fallingCube); 
            } 
        }
    }
}

/**
 * Met à jour la position X normalisée de la souris (exportée pour main.js)
 * @param {number} x - Valeur normalisée de -1 à 1
 */
export function setMouseNormalizedX(x) {
    mouseNormalizedX = x;
}

/**
 * Met à jour la position Y normalisée de la souris (exportée pour main.js)
 * @param {number} y - Valeur normalisée de -1 à 1
 */
export function setMouseNormalizedY(y) { // Ajouté: Mise à jour de la position Y
    mouseNormalizedY = y;
}

// ==========================================================
// D. Particules globales (utilisées aussi par la phase 2/3)
// ==========================================================

export function createFallingCube() {
    const colors = [0xa8d0ff, 0xf0c4df, 0xfff1a8];
    const cube = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshBasicMaterial({ color: colors[Math.floor(Math.random() * colors.length)], transparent: true, opacity: 0.9 }));
    cube.position.set((Math.random() - 0.5) * 10, 6, (Math.random() - 0.5) * 5);
    cube.userData = { velocity: new THREE.Vector3(0, -0.03 - Math.random() * 0.04, 0), rotation: new THREE.Vector3(Math.random()*0.1, Math.random()*0.1, Math.random()*0.1) };
    return cube;
}

/**
 * Vérifie l'intersection avec le modèle 3D (pour les appareils mobiles).
 */
export function checkTrainIntersection(raycaster, camera, mouse) { 
    // Vérifie l'intersection avec le modèle chargé (s'il existe)
    if (loadedModel) {
        raycaster.setFromCamera(mouse, camera); 
        return raycaster.intersectObject(loadedModel, true).length > 0;
    }
    return false;
}

// Export pour le contrôle de l'accélération depuis main.js
export function setAcceleratingState(state) {
    // Si l'accélération a été déclenchée une fois, on ignore les interactions futures.
    if (hasExploded || hasBeenTouched) { 
        const canvas = document.getElementById('canvas3d');
        canvas.style.cursor = 'default';
        return; 
    }
    
    // Déclenche l'accélération seulement si le survol est vrai (state = true)
    if (state === true) {
        isAccelerating = true;
        hasBeenTouched = true; // MARQUE L'INTERACTION UNIQUE
        const canvas = document.getElementById('canvas3d');
        canvas.style.cursor = 'pointer';
    } else {
        // SI le survol est terminé (state = false) ET l'explosion n'a pas encore eu lieu,
        // on ne désactive isAccelerating que si hasBeenTouched est faux.
        // Puisque hasBeenTouched est vrai si l'accélération a été déclenchée une fois,
        // on maintient l'accélération jusqu'à l'explosion.
        if (!hasBeenTouched) {
            isAccelerating = false;
        }
    }
}

export { isMobile };