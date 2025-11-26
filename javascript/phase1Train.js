// phase1Train.js - VERSION OPTIMISÉE AVEC PRELOADER

// Déclarations des variables d'état
export let trainProgress = 0; 
export let currentSpeed = 0.0012; 
export let isAccelerating = false; 
export let hasExploded = false;
let fastLapCount = 0; 
let lapStarted = false;
let particles = []; 
export let haussmannBuilding = null; // Rendre exportable pour l'ajustement dans main.js
export let mouseNormalizedX = 0; 
export let mouseNormalizedY = -1; 
let hasBeenTouched = false;

// Objets Three.js de la phase 1
let loadedModel = null;
let modelContainer;
let currentModelScale = 1.0; 

const isMobile = /Android|webOS|iPhone|iPad|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Constantes
const ROTATION_STRENGTH = 2.5; 
const EXPLOSION_THRESHOLD = 0.7; 
const FLOATING_ROTATION_SPEED = 0.002;
const LERP_SMOOTHNESS = 0.15;
const BASE_ROTATION_X = THREE.MathUtils.degToRad(70);
const BASE_ROTATION_Y = THREE.MathUtils.degToRad(40);
const BASE_ROTATION_Z = THREE.MathUtils.degToRad(-10);
const CHAOS_ROTATION_SPEED = 0.2;
const CONTINUOUS_ROTATION_SPEED = 0.005;
const SCALING_SPEED = 0.03; 

// URLs des textures pour le cube
const CUBE_TEXTURE_URLS = [
    'P2.jpeg', 'P2.jpeg', 'P2.jpeg', 
    'P2.jpeg', 'P2.jpeg', 'P2.jpeg'
];

// NOUVEAU: Variable pour tracker si le modèle est chargé
let isModelLoaded = false;
let modelLoadPromise = null;

// ==========================================================
// FONCTIONS DE CRÉATION
// ==========================================================

function createParticle(position, velocity) { 
    const size = Math.random() * 0.3 + 0.1;
    const colors = [0xa8d0ff, 0xf0c4df, 0xfff1a8]; 
    const particle = new THREE.Mesh(
        new THREE.BoxGeometry(size, size, size), 
        new THREE.MeshBasicMaterial({ 
            color: colors[Math.floor(Math.random() * colors.length)] 
        })
    ); 
    particle.position.copy(position); 
    particle.userData.velocity = velocity; 
    return particle; 
}

// NOUVEAU: Cache des textures préchargées du cube
let cubeTexturesCache = [];
let cubeTexturesLoaded = false;

/**
 * Précharge les textures du cube
 */
export function preloadCubeTextures() {
    return new Promise((resolve) => {
        const loader = new THREE.TextureLoader();
        let loadedCount = 0;
        
        CUBE_TEXTURE_URLS.forEach(url => {
            loader.load(
                url,
                (texture) => {
                    texture.colorSpace = THREE.SRGBColorSpace;
                    cubeTexturesCache.push(texture);
                    loadedCount++;
                    
                    if (loadedCount === CUBE_TEXTURE_URLS.length) {
                        cubeTexturesLoaded = true;
                        console.log('Textures du cube préchargées');
                        resolve();
                    }
                },
                undefined,
                (err) => {
                    console.error('Erreur préchargement texture cube:', err);
                    loadedCount++;
                    
                    if (loadedCount === CUBE_TEXTURE_URLS.length) {
                        resolve();
                    }
                }
            );
        });
    });
}

function createSimpleSuspendedCube() {
    const sculpture = new THREE.Group();
    const cubeSize = 3.0;

    // Utiliser les textures préchargées
    const materials = cubeTexturesCache.map(texture => {
        return new THREE.MeshBasicMaterial({ 
            map: texture,
            transparent: true,
            opacity: 1 // Visible immédiatement car textures préchargées
        });
    });
    
    // Fallback si les textures ne sont pas chargées (ne devrait pas arriver)
    if (materials.length === 0) {
        for (let i = 0; i < 6; i++) {
            materials.push(new THREE.MeshBasicMaterial({ 
                color: 0xf0c4df,
                transparent: true,
                opacity: 0
            }));
        }
    }

    const cube = new THREE.Mesh(
        new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize), 
        materials
    );
    cube.position.y = 0;
    cube.userData.isRotating = true;
    sculpture.add(cube);
    
    // MODIFICATION: Positionner le cube au centre (0, 0, 0). Sa position finale
    // (Y vertical pour l'alignement) sera gérée dans main.js.
    sculpture.position.set(-5, 0, 0); 
    sculpture.userData.isCube = true;
    sculpture.userData.fixedScale = 1.0; 
    
    return sculpture;
}

function createHaussmannBuilding() {
    return createSimpleSuspendedCube();
}

/**
 * Précharge le modèle 3D avant l'initialisation
 */
export function preloadModel() {
    if (modelLoadPromise) return modelLoadPromise;
    
    modelLoadPromise = new Promise((resolve, reject) => {
        const loader = new THREE.GLTFLoader();
        loader.load(
            'tapis.glb', 
            (gltf) => {
                loadedModel = gltf.scene;
                
                const targetScale = 8;
                currentModelScale = targetScale;
                loadedModel.scale.setScalar(targetScale); 
                
                loadedModel.rotation.set(BASE_ROTATION_X, BASE_ROTATION_Y, BASE_ROTATION_Z); 
                
                const box = new THREE.Box3().setFromObject(loadedModel);
                const size = box.getSize(new THREE.Vector3());
                loadedModel.scale.multiplyScalar(targetScale / Math.max(size.x, size.y, size.z));
                
                loadedModel.traverse(o => {
                    if (o.isMesh) {
                        o.material.transparent = true;
                        o.material.opacity = 1.0;
                    }
                });

                isModelLoaded = true;
                resolve(loadedModel);
            }, 
            undefined, 
            (error) => {
                console.error('Erreur lors du chargement du modèle 3D (tapis.glb):', error);
                reject(error);
            }
        );
    });
    
    return modelLoadPromise;
}

/**
 * Initialise la Phase 1 avec le modèle préchargé
 */
export function initPhase1(phase1Group) {
    modelContainer = new THREE.Group();
    modelContainer.position.set(-6, 0, 0);
    phase1Group.add(modelContainer);

    // Si le modèle est déjà chargé, l'ajouter immédiatement
    if (isModelLoaded && loadedModel) {
        modelContainer.add(loadedModel);
    } else {
        // Sinon, attendre le chargement
        preloadModel().then(() => {
            if (loadedModel && modelContainer) {
                modelContainer.add(loadedModel);
            }
        }).catch(err => {
            console.error('Impossible de charger le modèle:', err);
        });
    }
}

// ==========================================================
// LOGIQUE D'EXPLOSION ET ACCÉLÉRATION
// ==========================================================

export function explodeTrain(phase1Group) { 
    if (hasExploded) return;
    hasExploded = true; 
    isAccelerating = false; 
    hasBeenTouched = false;
    const canvas = document.getElementById('canvas3d');
    canvas.style.cursor = 'default'; 
    
    if (loadedModel) {
        loadedModel.visible = false;
    }
    
    const explosionPosition = loadedModel ? modelContainer.position : new THREE.Vector3(-6, 0, 0);
    
    // Création des particules
    for (let i = 0; i < 500; i++) {
        const v = new THREE.Vector3(
            (Math.random()-0.5)*8, 
            (Math.random()-0.5)*8, 
            (Math.random()-0.5)*8
        );
        const p = createParticle(explosionPosition, v); 
        particles.push(p); 
        phase1Group.add(p); 
    } 
    
    // Apparition du cube Haussmann après un délai
    setTimeout(() => { 
        haussmannBuilding = createHaussmannBuilding(); 
        phase1Group.add(haussmannBuilding); 
        // L'ajustement de la position Y sera fait dans main.js après l'explosion.
    }, 1000); 
}

// ==========================================================
// MISE À JOUR
// ==========================================================

export function updatePhase1(phase1Group, globalParticlesGroup, fallingCubes) {
    if (!hasExploded) {
        // Logique du train 
        if (isAccelerating || hasBeenTouched) { 
            currentSpeed += (0.05 - currentSpeed) * 0.1;
        } else {
            currentSpeed += (FLOATING_ROTATION_SPEED - currentSpeed) * 0.05;
        }
        
        if (hasBeenTouched) {
            isAccelerating = true;
        }

        const oldP = trainProgress; 
        trainProgress = (trainProgress + currentSpeed) % 1; 
        
        if (currentSpeed > 0.025) { 
            if (!lapStarted) lapStarted = true; 
            if (currentSpeed > 0.04) {
                fastLapCount++;
                if (fastLapCount >= 30) explodeTrain(phase1Group); 
            }
        } else { 
            lapStarted = false; 
            fastLapCount = 0; 
        }

        if (loadedModel) {
            const targetRotationX = BASE_ROTATION_X;
            const targetRotationZ = BASE_ROTATION_Z;

            if (isAccelerating) {
                currentModelScale += SCALING_SPEED;
                modelContainer.scale.setScalar(currentModelScale);
                loadedModel.rotation.y += 0.02;
            } else {
                currentModelScale += (8.0 - currentModelScale) * LERP_SMOOTHNESS;
                modelContainer.scale.setScalar(currentModelScale);
                loadedModel.rotation.y += CONTINUOUS_ROTATION_SPEED; 
                loadedModel.rotation.x += (targetRotationX - loadedModel.rotation.x) * LERP_SMOOTHNESS; 
                loadedModel.rotation.z += (targetRotationZ - loadedModel.rotation.z) * LERP_SMOOTHNESS; 
            }
            
            modelContainer.position.y = Math.sin(Date.now() * 0.002) * 0.15; 
        }
    } else {
        // LOGIQUE POST-EXPLOSION

        // 1. Gestion des particules de l'explosion
        for (let i = particles.length - 1; i >= 0; i--) { 
            let p = particles[i]; 
            p.position.add(p.userData.velocity); 
            p.userData.velocity.y -= 0.005;
            p.rotation.x += 0.05;
            p.rotation.y += 0.05;
            if (p.position.y < -10) { 
                phase1Group.remove(p); 
                particles.splice(i, 1); 
            } 
        }

        // 2. Gestion du cube Haussmann (Taille constante assurée)
        if (haussmannBuilding) {
            // Le scale est fixe à 1.0 car phase1Group.scale est fixe à 1.0 (voir utils.js)
            haussmannBuilding.scale.setScalar(1.0); 
            
            const cubeMesh = haussmannBuilding.children.find(child => child.userData.isRotating);
            
            if (cubeMesh) {
                cubeMesh.rotation.y += 0.001; 
                cubeMesh.rotation.x += 0.003;
                cubeMesh.rotation.z += 0.003;
            }
            // La position Y est maintenant gérée dans main.js pour la responsivité
        }
    }
}

export function setMouseNormalizedX(x) {
    mouseNormalizedX = x;
}

export function setMouseNormalizedY(y) {
    mouseNormalizedY = y;
}

/**
 * Crée un cube qui tombe, en utilisant maintenant les textures préchargées.
 */
export function createFallingCube() {
    // Utiliser les textures préchargées du grand cube
    const materials = cubeTexturesCache.map(texture => {
        // Nous clonons le matériau pour garantir que l'opacité individuelle
        // et toute autre modification n'affectent pas les autres cubes.
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0.9
        }).clone();
        return material;
    });

    // Fallback si les textures ne sont pas chargées (ne devrait pas arriver grâce au préchargement)
    if (materials.length === 0) {
        for (let i = 0; i < 6; i++) {
            materials.push(new THREE.MeshBasicMaterial({
                color: 0xf0c4df, // Couleur par défaut si la texture manque
                transparent: true,
                opacity: 0.9
            }));
        }
    }
    
    const cube = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.2, 0.2), 
        materials // Utilise l'array de matériaux avec les textures
    );
    cube.position.set((Math.random() - 0.5) * 10, 6, (Math.random() - 0.5) * 5);
    cube.userData = { 
        velocity: new THREE.Vector3(0, -0.03 - Math.random() * 0.04, 0), 
        rotation: new THREE.Vector3(Math.random()*0.1, Math.random()*0.1, Math.random()*0.1) 
    };
    return cube;
}

export function checkTrainIntersection(raycaster, camera, mouse) { 
    if (loadedModel) {
        raycaster.setFromCamera(mouse, camera); 
        return raycaster.intersectObject(loadedModel, true).length > 0;
    }
    return false;
}

export function setAcceleratingState(state) {
    if (hasExploded || hasBeenTouched) { 
        const canvas = document.getElementById('canvas3d');
        canvas.style.cursor = 'default';
        return; 
    }
    
    if (state === true) {
        isAccelerating = true;
        hasBeenTouched = true;
        const canvas = document.getElementById('canvas3d');
        canvas.style.cursor = 'pointer';
    } else {
        if (!hasBeenTouched) {
            isAccelerating = false;
        }
    }
}

export { isMobile };