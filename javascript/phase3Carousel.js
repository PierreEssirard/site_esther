// phase3Carousel.js - VERSION OPTIMISÉE AVEC PRELOADER

let imageCarousel = [];
const carouselRadius = 5; 
const imageFiles = [
    'P1.jpeg', 'P2.jpeg', 'P3.jpeg', 'P4.jpeg', 
    'P5.jpeg', 'P6.jpeg', 'P7.jpeg'
];
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

// ==========================================================
// PRÉCHARGEMENT DES TEXTURES
// ==========================================================

/**
 * Précharge toutes les textures du carrousel
 */
export function preloadCarouselTextures() {
    const promises = [];
    
    // Précharger les images du carrousel
    imageFiles.forEach(filename => {
        const promise = new Promise((resolve, reject) => {
            const path = `image_projets/${filename}`;
            textureLoader.load(
                path,
                (texture) => {
                    texture.colorSpace = THREE.SRGBColorSpace;
                    texture.minFilter = THREE.LinearFilter;
                    preloadedTextures[filename] = texture;
                    resolve();
                },
                undefined,
                (error) => {
                    console.error('Erreur préchargement texture carrousel:', filename, error);
                    reject(error);
                }
            );
        });
        promises.push(promise);
    });
    
    // Précharger les images du bandeau
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
                    reject(error);
                }
            );
        });
        promises.push(promise);
    });
    
    return Promise.all(promises).then(() => {
        texturesLoaded = true;
        console.log('Toutes les textures Phase 3 sont chargées');
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
 */
export function initPhase3(phase3Group) {
    // Lumières Phase 3
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

    // Carrousel d'images
    const photoWidth = 2.2;
    const photoHeight = 3;
    
    imageFiles.forEach((filename, index) => {
        const imagePlaneGroup = new THREE.Group(); 
        const photoGeo = new THREE.PlaneGeometry(photoWidth, photoHeight);
        
        const photoMat = new THREE.MeshBasicMaterial({ 
            side: THREE.DoubleSide, 
            transparent: true, 
            opacity: 1, 
            toneMapped: false
        });
        
        // Utiliser la texture préchargée
        if (preloadedTextures[filename]) {
            photoMat.map = preloadedTextures[filename];
            photoMat.needsUpdate = true;
        } else {
            console.warn('Texture carrousel non préchargée:', filename);
            photoMat.color.set(0xf0c4df);
        }
        
        const photo = new THREE.Mesh(photoGeo, photoMat);
        photo.receiveShadow = true;
        imagePlaneGroup.add(photo);
        
        const angle = (index / imageFiles.length) * Math.PI * 2;
        const x = Math.cos(angle) * carouselRadius; 
        const z = Math.sin(angle) * carouselRadius;
        
        imagePlaneGroup.userData = {
            index: index,
            baseAngle: angle,
            currentAngle: angle,
            homePosition: new THREE.Vector3(x, 0, z),
            targetPosition: new THREE.Vector3(x, 0, z),
            currentPosition: new THREE.Vector3(x, 0, z),
            targetScale: 1, 
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

    // Bandeau d'images
    const imageBandBottom = new THREE.Group();
    phase3Group.add(imageBandBottom);
    bandBottomElements = createRepeatingImageBand(imageBandBottom, -bandVerticalOffset, -1); 
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
    if (!hoveredImage) { 
        carouselRotation += 0.004; 
    }
    
    const identityQuaternion = new THREE.Quaternion();
    
    imageCarousel.forEach((imagePlaneGroup) => {
        const userData = imagePlaneGroup.userData;
        const photoMaterial = imagePlaneGroup.children[0].material; 

        if (transitionProgress < 1) {
            userData.targetScale = transitionProgress;
        } else {
            userData.targetScale = 1;
        }
        
        if (userData.isHovered) {
            const D = 6.0; 
            const paddingFactor = 0.90; 

            const currentFovRad = THREE.MathUtils.degToRad(camera.fov);
            const H_visible = 2 * D * Math.tan(currentFovRad / 2);
            const W_visible = H_visible * camera.aspect;

            const W_base = userData.originalPhotoWidth;
            const H_base = userData.originalPhotoHeight; 
            
            const scaleFactorW = (W_visible * paddingFactor) / W_base;
            const scaleFactorH = (H_visible * paddingFactor) / H_base;

            userData.targetScale = Math.min(scaleFactorW, scaleFactorH);
            userData.targetPosition.set(0, -0.3, 4); 
            
            imagePlaneGroup.rotation.set(0, 0, 0); 
            photoMaterial.opacity = 1.0; 
            photoMaterial.transparent = false; 

        } else {
            if (transitionProgress < 1) {
                const t = transitionProgress; 
                
                imagePlaneGroup.rotation.y = (1 - t) * Math.PI * 4; 
                
                const x_final = Math.cos(userData.baseAngle) * carouselRadius;
                const z_final = Math.sin(userData.baseAngle) * carouselRadius;
                
                userData.homePosition.set(
                    x_final * t, 
                    CAROUSEL_VERTICAL_OFFSET * t,
                    z_final * t + CAROUSEL_DEPTH_OFFSET * t
                );

                userData.targetPosition.copy(userData.homePosition);
                
            } else {
                if (!userData.rotationLocked) {
                    userData.currentAngle = userData.baseAngle + carouselRotation;
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