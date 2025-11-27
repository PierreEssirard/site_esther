// phase3Carousel.js - VERSION OPTIMISÉE AVEC PRÉLOADER

// NOUVEAU: Suppression de l'import de getAdminImages - les images seront passées en paramètre.

let imageCarousel = [];
const carouselRadius = 5; 
// Le tableau est maintenant VIDE, car les images viennent de Firebase
export const imageFiles = ['P1.jpeg', 'P2.jpeg', 'P3.jpeg', 'P4.jpeg', 'P5.jpeg']; // Images de base à migrer
const textureLoader = new THREE.TextureLoader();

const raycaster3 = new THREE.Raycaster();
export const mouse3D = new THREE.Vector2();
let hoveredImage = null;
let isPhase3Active = false;
let carouselRotation = 0;
let isImageZoomed = false;

// Variables pour le bandeau d'images
const imageBandFiles = ['1.jpeg', '2.jpeg', '3.jpeg', '4.jpeg', '5.jpeg'];
let bandBottomElements = [];
let bandScrollOffset = 0; 
const SCROLL_COEFFICIENT = 0.02;
const imageBandHeight = 4; 
const imageBandWidth = imageBandHeight * 6; 
const bandSpacing = 0.3;
const numFiles = imageBandFiles.length;
const bandSegmentWidth = (imageBandWidth + bandSpacing) * numFiles;
const numCopies = 4;
const bandVerticalOffset = 9.0;
const CAROUSEL_VERTICAL_OFFSET = 1;
const CAROUSEL_DEPTH_OFFSET = 0.0;

const WAVE_AMPLITUDE = 0.1;
const WAVE_FREQUENCY = 0.5;
const WAVE_SPEED = 1.0;

// NOUVEAU: Cache des textures préchargées
let preloadedTextures = {};
let bandPreloadedTextures = {};
let texturesLoaded = false;

// Détection mobile (pour le zoom)
const isMobile = /Android|webOS|iPhone|iPad|IEMobile|Opera Mini/i.test(navigator.userAgent);

// ==========================================================
// PRÉCHARGEMENT DES TEXTURES
// ==========================================================

/**
 * Précharge toutes les textures du carrousel (y compris celles de l'admin)
 * MODIFIÉ: Reçoit la liste des images de `main.js`.
 * @param {Array<string>} allImageSources - Liste des images (fichiers ou Base64) venant de Firebase.
 */
export function preloadCarouselTextures(allImageSources) {
    const promises = [];
    
    // Réinitialisation du cache de textures
    preloadedTextures = {}; 
    
    if (!allImageSources || allImageSources.length === 0) {
        console.warn("Aucune image de carrousel fournie. Le carrousel ne sera pas affiché.");
        texturesLoaded = true;
        // On précharge quand même les textures du bandeau
    } else {
        // 2. Précharger les images du carrousel
        allImageSources.forEach((source, index) => {
            // La source est soit un nom de fichier (P1.jpeg) soit une chaîne Base64
            const isBase64 = source.startsWith('data:image/');
            // Clé d'accès unique basée sur l'index (car la source peut être très longue si Base64)
            const sourceKey = isBase64 ? `admin_dynamic_${index}` : source; 

            const loaderSource = isBase64 ? source : `image_projets/${source}`;
            
            const promise = new Promise((resolve, reject) => {
                textureLoader.load(
                    loaderSource,
                    (texture) => {
                        texture.colorSpace = THREE.SRGBColorSpace;
                        texture.minFilter = THREE.LinearFilter;
                        preloadedTextures[sourceKey] = texture;
                        resolve();
                    },
                    undefined,
                    (error) => {
                        console.error('Erreur préchargement texture carrousel:', sourceKey, error);
                        // Remplacer la texture manquante par une texture vide
                        preloadedTextures[sourceKey] = new THREE.Texture();
                        resolve(); 
                    }
                );
            });
            promises.push(promise);
        });
    }
    
    // Précharger les images du bandeau (inchangé)
    imageBandFiles.forEach(filename => {
        const promise = new Promise((resolve, reject) => {
            const path = `image_bandeau/${filename}`;
            textureLoader.load(
                path,
                (texture) => {
                    texture.colorSpace = THREE.SRGBColorSpace;
                    texture.minFilter = THREE.LinearFilter;
                    bandPreloadedTextures[filename] = texture;
                    resolve();
                },
                undefined,
                (error) => {
                    console.error('Erreur préchargement texture bandeau:', filename, error);
                    bandPreloadedTextures[filename] = new THREE.Texture();
                    resolve();
                }
            );
        });
        promises.push(promise);
    });
    
    return Promise.all(promises).then(() => {
        texturesLoaded = true;
        console.log('Toutes les textures Phase 3 sont chargées (y compris celles de Firebase).');
    });
}

// ==========================================================
// INITIALISATION
// ==========================================================

function createRepeatingImageBand(group, yPosition, scaleX) {
    const bandElements = [];
    
    for (let j = 0; j < numCopies; j++) {
        imageBandFiles.forEach((filename, index) => {
            const geometry = new THREE.PlaneGeometry(imageBandWidth, imageBandHeight);
            
            const material = new THREE.MeshBasicMaterial({ 
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 1, // Directement à 1 car texture préchargée
                toneMapped: false,
                color: 0xffffff 
            });
            
            // Utiliser la texture préchargée
            if (bandPreloadedTextures[filename]) {
                material.map = bandPreloadedTextures[filename];
                material.needsUpdate = true;
            } else {
                console.warn('Texture non préchargée:', filename);
                material.color.set(0xf0c4df);
            }
            
            const mesh = new THREE.Mesh(geometry, material);
            const xOffset = j * bandSegmentWidth + index * (imageBandWidth + bandSpacing);
            mesh.position.set(xOffset, yPosition, -5.5); 
            mesh.scale.x = scaleX;
            mesh.userData.initialScaleXSign = scaleX; 
            mesh.userData.initialX = xOffset;
            group.add(mesh);
            bandElements.push(mesh);
        });
    }
    group.position.x = -bandSegmentWidth / 2;
    return bandElements;
}

/**
 * Initialise le carrousel et le bandeau d'images avec textures préchargées
 * MODIFIÉ: Reçoit la liste des images de `main.js`.
 * @param {THREE.Group} phase3Group
 * @param {Array<string>} allImageSources - Liste des images (fichiers ou Base64) venant de Firebase.
 */
export function initPhase3(phase3Group, allImageSources) {
    // S'assurer que le carrousel est vide avant de le remplir (important si on réinitialisait)
    imageCarousel.forEach(mesh => phase3Group.remove(mesh));
    imageCarousel = []; 
    
    // Vérification de sécurité: si aucune image n'est présente, on arrête l'initialisation du carrousel.
    if (!allImageSources || allImageSources.length === 0) {
        console.log("initPhase3 arrêté car allImageSources est vide.");
        return;
    }
    
    // Lumières Phase 3
    // Note: Les lumières ne sont pas recréées, elles sont juste ajoutées au groupe la première fois.
    // Pour simplifier, nous allons supposer que les lumières sont déjà là ou gérées ailleurs.
    if (phase3Group.children.length === 0) {
        const spotLight3 = new THREE.SpotLight(0xffffff, 4.0); 
        spotLight3.position.set(0, 8, 5);
        spotLight3.angle = Math.PI / 4;
        spotLight3.penumbra = 0.6;
        spotLight3.castShadow = true;
        spotLight3.shadow.mapSize.width = 1024;
        spotLight3.shadow.mapSize.height = 1024;
        phase3Group.add(spotLight3);

        const ambientLight3 = new THREE.AmbientLight(0xffffff, 1.2); 
        phase3Group.add(ambientLight3);

        const fillLight3 = new THREE.DirectionalLight(0xffffff, 0.8); 
        fillLight3.position.set(-5, 3, -3);
        phase3Group.add(fillLight3);
        
        // Bandeau d'images (seulement créé la première fois)
        const imageBandBottom = new THREE.Group();
        phase3Group.add(imageBandBottom);
        bandBottomElements = createRepeatingImageBand(imageBandBottom, -bandVerticalOffset, -1); 
    }

    // Carrousel d'images
    const photoWidth = 2.2;
    const photoHeight = 3;
    
    
    allImageSources.forEach((source, index) => { 
        const isBase64 = source.startsWith('data:image/');
        const sourceKey = isBase64 ? `admin_dynamic_${index}` : source; // Retrouver la clé de préchargement
        
        const imagePlaneGroup = new THREE.Group(); 
        const photoGeo = new THREE.PlaneGeometry(photoWidth, photoHeight);
        
        const photoMat = new THREE.MeshBasicMaterial({ 
            side: THREE.DoubleSide, 
            transparent: true, 
            opacity: 1, 
            toneMapped: false
        });
        
        // Utiliser la texture préchargée
        if (preloadedTextures[sourceKey] && preloadedTextures[sourceKey].image) {
            photoMat.map = preloadedTextures[sourceKey];
            photoMat.needsUpdate = true;
        } else {
            // Utiliser une couleur par défaut si le chargement a échoué 
            console.warn(`Texture réelle non disponible pour ${sourceKey}. Utilisation du fallback couleur.`);
            photoMat.color.set(0xaaaaaa);
        }
        
        const photo = new THREE.Mesh(photoGeo, photoMat);
        photo.receiveShadow = true;
        imagePlaneGroup.add(photo);
        
        // Calcul de l'angle basé sur le NOUVEAU nombre total d'images
        const angle = (index / allImageSources.length) * Math.PI * 2;
        const x = Math.cos(angle) * carouselRadius; 
        const z = Math.sin(angle) * carouselRadius;
        
        imagePlaneGroup.userData = {
            index: index,
            baseAngle: angle,
            currentAngle: angle,
            homePosition: new THREE.Vector3(x, 0, z),
            targetPosition: new THREE.Vector3(x, 0, z),
            currentPosition: new THREE.Vector3(x, 0, z),
            targetScale: 0, // Commence à 0 pour l'apparition en transition
            currentScale: 0, 
            isHovered: false,
            rotationLocked: false,
            originalPhotoWidth: photoWidth, 
            originalPhotoHeight: photoHeight 
        };
        
        imagePlaneGroup.position.copy(imagePlaneGroup.userData.homePosition);
        phase3Group.add(imagePlaneGroup);
        imageCarousel.push(imagePlaneGroup);
    });
}

// ==========================================================
// GESTION DU SURVOL
// ==========================================================

export function updateMousePosition3D(event, canvas) {
    if (!isPhase3Active) return;
    const rect = canvas.getBoundingClientRect();
    mouse3D.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse3D.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

export function checkHoveredImage(camera, canvas) {
    if (!isPhase3Active || imageCarousel.length === 0) return;
    
    raycaster3.setFromCamera(mouse3D, camera);
    
    const allPhotoMeshes = imageCarousel.map(group => group.children[0]); 
    const intersects = raycaster3.intersectObjects(allPhotoMeshes, false);
    
    let newHoveredImage = null;
    
    if (intersects.length > 0) {
        newHoveredImage = intersects[0].object.parent; 
    }
    
    if (newHoveredImage !== hoveredImage) {
        if (hoveredImage) {
            hoveredImage.userData.isHovered = false;
            hoveredImage.userData.rotationLocked = false;
        }
        
        hoveredImage = newHoveredImage;
        if (hoveredImage) {
            hoveredImage.userData.isHovered = true;
            hoveredImage.userData.rotationLocked = false; 
            canvas.style.cursor = 'pointer';
            isImageZoomed = true;
        } else {
            canvas.style.cursor = 'default';
            isImageZoomed = false;
        }
    }
}

// ==========================================================
// MISE À JOUR
// ==========================================================

export function updateCarouselPhase3(transitionProgress, camera) {
    // Le nombre total d'images est maintenant basé sur le tableau interne.
    const totalImages = imageCarousel.length; 

    if (totalImages === 0) return;
    
    if (!hoveredImage) { 
        carouselRotation += 0.004; 
    }
    
    const identityQuaternion = new THREE.Quaternion();
    
    imageCarousel.forEach((imagePlaneGroup) => {
        const userData = imagePlaneGroup.userData;
        const photoMaterial = imagePlaneGroup.children[0].material; 

        if (transitionProgress < 1) {
            // Fait apparaître les images en même temps que la transition
            userData.targetScale = transitionProgress;
        } else {
            userData.targetScale = 1;
        }
        
        if (userData.isHovered) {
            
            // Paramètres de zoom ajustés pour Desktop et Mobile
            const D_DESKTOP = 6.0; 
            const PADDING_FACTOR_DESKTOP = 0.75; 
            const PADDING_FACTOR_MOBILE = 0.85; 

            let D_ZOOM = D_DESKTOP;
            let paddingFactor = PADDING_FACTOR_DESKTOP;
            let targetZ = 4; 

            if (isMobile) {
                D_ZOOM = 8.0; 
                paddingFactor = PADDING_FACTOR_MOBILE; // Nouveau facteur mobile
                targetZ = -0.5; 
            }
            
            const currentFovRad = THREE.MathUtils.degToRad(camera.fov);
            const H_visible = 2 * D_ZOOM * Math.tan(currentFovRad / 2);
            const W_visible = H_visible * camera.aspect;

            const W_base = userData.originalPhotoWidth;
            const H_base = userData.originalPhotoHeight; 
            
            const scaleFactorW = (W_visible * paddingFactor) / W_base;
            const scaleFactorH = (H_visible * paddingFactor) / H_base; 

            userData.targetScale = Math.min(scaleFactorW, scaleFactorH);
            
            // Applique la position Z ajustée
            userData.targetPosition.set(0, -0.3, targetZ); 
            
            imagePlaneGroup.rotation.set(0, 0, 0); 
            photoMaterial.opacity = 1.0; 
            photoMaterial.transparent = false; 

        } else {
            if (transitionProgress < 1) {
                const t = transitionProgress; 
                
                imagePlaneGroup.rotation.y = (1 - t) * Math.PI * 4; 
                
                // Le nombre total d'images est maintenant basé sur imageCarousel.length
                const baseAngle = (userData.index / totalImages) * Math.PI * 2;
                
                const x_final = Math.cos(baseAngle) * carouselRadius;
                const z_final = Math.sin(baseAngle) * carouselRadius;
                
                userData.homePosition.set(
                    x_final * t, 
                    CAROUSEL_VERTICAL_OFFSET * t,
                    z_final * t + CAROUSEL_DEPTH_OFFSET * t
                );

                userData.targetPosition.copy(userData.homePosition);
                
            } else {
                // Si le nombre d'images a changé (suppression), on recalcule l'angle de base
                const baseAngle = (userData.index / totalImages) * Math.PI * 2;

                if (!userData.rotationLocked) {
                    userData.currentAngle = baseAngle + carouselRotation;
                }
                
                const x = Math.cos(userData.currentAngle) * carouselRadius;
                const z = Math.sin(userData.currentAngle) * carouselRadius;
                
                userData.homePosition.set(x, 
                                          CAROUSEL_VERTICAL_OFFSET,
                                          z + CAROUSEL_DEPTH_OFFSET);
                
                userData.targetPosition.copy(userData.homePosition);
                userData.targetScale = transitionProgress >= 1 ? 1 : transitionProgress;

                imagePlaneGroup.rotation.y = 0; 
                imagePlaneGroup.quaternion.slerp(identityQuaternion, 0.1);
            }

            imagePlaneGroup.rotation.x = 0;
            imagePlaneGroup.rotation.z = 0;
            
            if (hoveredImage) {
                photoMaterial.opacity = 0.0; 
                photoMaterial.transparent = true;
            } else {
                photoMaterial.opacity = 1.0; 
                photoMaterial.transparent = false;
            }
        }
        
        userData.currentPosition.lerp(userData.targetPosition, 0.05);
        imagePlaneGroup.position.copy(userData.currentPosition);
        
        userData.currentScale += (userData.targetScale - userData.currentScale) * 0.05;
        imagePlaneGroup.scale.setScalar(userData.currentScale);
        
        if (userData.isHovered) {
            imagePlaneGroup.renderOrder = 1;
        } else {
            imagePlaneGroup.renderOrder = 0;
        }
    });
}

export function updateImageBandPhase3(transitionProgress, scrollFactor) {
    const elements = bandBottomElements;
    const scrollMovement = scrollFactor * SCROLL_COEFFICIENT; 
    
    bandScrollOffset = (scrollMovement) % bandSegmentWidth;
    
    const time = performance.now() * 0.001 * WAVE_SPEED;
    const initialY = -bandVerticalOffset; 

    elements.forEach(mesh => {
        let newX = mesh.userData.initialX - bandScrollOffset;
        
        if (newX < mesh.parent.position.x - bandSegmentWidth) {
             newX += bandSegmentWidth * numCopies;
        }
        
        const waveOffset = Math.sin(newX * WAVE_FREQUENCY + time) * WAVE_AMPLITUDE;
        const rotationZ = Math.cos(newX * WAVE_FREQUENCY + time) * WAVE_AMPLITUDE * 0.5;

        mesh.position.x = newX;
        mesh.position.y = initialY + waveOffset; 
        
        mesh.rotation.z = rotationZ * mesh.userData.initialScaleXSign; 
        
        mesh.scale.y = 1;
        mesh.scale.x = mesh.userData.initialScaleXSign; 

        const targetOpacity = Math.min(1, transitionProgress * 3);
        
        if (mesh.material.map) {
            mesh.material.opacity = targetOpacity; 
        } else {
            mesh.material.opacity = Math.min(0.5, targetOpacity * 0.5);
        }
    });
}

export function setPhase3Active(active, canvas) { 
    isPhase3Active = active; 
    if (!active) {
        hoveredImage = null;
        canvas.style.cursor = 'default';
        imageCarousel.forEach(group => {
            group.userData.isHovered = false;
            group.userData.rotationLocked = false;
        });
    }
}