// javascript/phase3Carousel.js

let imageCarousel = [];
const carouselRadius = 9; 
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

// === CONSTANTES D'ONDES POUR LE BANDEAU ===
const WAVE_AMPLITUDE = 0.4;
const WAVE_FREQUENCY = 0.5;
const WAVE_SPEED = 1.0;

// ==========================================================
// A. Initialisation (Aucun changement ici)
// ==========================================================

function createRepeatingImageBand(group, yPosition, scaleX) {
    const bandElements = [];
    
    for (let j = 0; j < numCopies; j++) {
        imageBandFiles.forEach((filename, index) => {
            const path = `image_bandeau/${filename}`;
            const geometry = new THREE.PlaneGeometry(imageBandWidth, imageBandHeight);
            
            const material = new THREE.MeshBasicMaterial({ 
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0, 
                toneMapped: false,
                color: 0xffffff 
            });
            
            textureLoader.load(path, (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace; 
                texture.minFilter = THREE.LinearFilter;
                material.map = texture;
                material.opacity = 1; 
                material.needsUpdate = true;
            }, undefined, (error) => {
                console.error('Erreur lors du chargement du bandeau:', filename, error);
                material.color.set(0xffffff); 
                material.opacity = 1.0; 
            });
            
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
 * Initialise le carrousel et le bandeau d'images.
 * @param {THREE.Group} phase3Group
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
    const photoWidth = 1.6; // Largeur de base de la photo
    const photoHeight = 2.2; // Hauteur de base de la photo
    
    imageFiles.forEach((filename, index) => {
        const imagePlaneGroup = new THREE.Group(); 
        const photoGeo = new THREE.PlaneGeometry(photoWidth, photoHeight);
        
        const photoMat = new THREE.MeshBasicMaterial({ 
            side: THREE.DoubleSide, transparent: true, opacity: 1, toneMapped: false
        });
        
        textureLoader.load(
            `image_projets/${filename}`,
            (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace; 
                texture.minFilter = THREE.LinearFilter;
                photoMat.map = texture;
                photoMat.needsUpdate = true;
            },
            undefined,
            (error) => {
                console.error('Erreur lors du chargement de la texture:', filename, error);
                photoMat.color.set(0xf0c4df);
            }
        );
        
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
// B. Gestion du survol (Aucun changement ici)
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
        } else {
            canvas.style.cursor = 'default';
        }
    }
}

// ==========================================================
// C. Mise à jour (Nouvelle position Y = -1.5)
// ==========================================================

export function updateCarouselPhase3(transitionProgress, camera) {
    carouselRotation += 0.004; 
    
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
            // --- Calcul dynamique de l'échelle ---
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
            
            // MODIFICATION CLÉ : Position Y ajustée à -1.5
            userData.targetPosition.set(0, -1.8, 4); 
            
            imagePlaneGroup.rotation.set(0, 0, 0); 

            // Masquer les autres images derrière la photo zoomée
            photoMaterial.opacity = 1.0; 
            photoMaterial.transparent = false; 

        } else {
            // Logique de rotation et position du carrousel
            if (!userData.rotationLocked) {
                userData.currentAngle = userData.baseAngle + carouselRotation;
            }
            
            const x = Math.cos(userData.currentAngle) * carouselRadius;
            const z = Math.sin(userData.currentAngle) * carouselRadius;
            userData.homePosition.set(x, 0, z); 
            
            userData.targetPosition.copy(userData.homePosition);
            userData.targetScale = transitionProgress >= 1 ? 1 : transitionProgress;

            // Interpolation vers la rotation Y=0 (Face-On)
            imagePlaneGroup.quaternion.slerp(identityQuaternion, 0.1);

            // Écraser les rotations X et Z pour une verticalité parfaite
            imagePlaneGroup.rotation.x = 0;
            imagePlaneGroup.rotation.z = 0;
            
            // Les autres images deviennent transparentes si une autre est zoomée
            if (hoveredImage) {
                photoMaterial.opacity = 0.0; 
                photoMaterial.transparent = true;
            } else {
                photoMaterial.opacity = 1.0; 
                photoMaterial.transparent = false;
            }
        }
        
        // Mise à jour douce de la position et de l'échelle
        userData.currentPosition.lerp(userData.targetPosition, 0.15);
        imagePlaneGroup.position.copy(userData.currentPosition);
        
        userData.currentScale += (userData.targetScale - userData.currentScale) * 0.15;
        imagePlaneGroup.scale.setScalar(userData.currentScale);
        
        // Mettre à jour la propriété renderOrder pour que l'image survolée soit toujours devant
        if (userData.isHovered) {
            imagePlaneGroup.renderOrder = 1; // La plus haute priorité de rendu
        } else {
            imagePlaneGroup.renderOrder = 0; // Priorité normale
        }
    });
}

/**
 * Anime le défilement du bandeau d'images (Sinusoidal) (inchangée)
 */
export function updateImageBandPhase3(transitionProgress, scrollFactor) {
    const elements = bandBottomElements;
    const scrollMovement = scrollFactor * SCROLL_COEFFICIENT; 
    
    bandScrollOffset = (scrollMovement) % bandSegmentWidth;
    
    // Temps pour l'animation continue de la vague
    const time = performance.now() * 0.001 * WAVE_SPEED;
    const initialY = -bandVerticalOffset; 

    elements.forEach(mesh => {
        let newX = mesh.userData.initialX - bandScrollOffset;
        
        if (newX < mesh.parent.position.x - bandSegmentWidth) {
             newX += bandSegmentWidth * numCopies;
        }
        
        // --- CALCULS DE VAGUE SINUSOÏDALE (BASE) ---
        const waveOffset = Math.sin(newX * WAVE_FREQUENCY + time) * WAVE_AMPLITUDE;
        const rotationZ = Math.cos(newX * WAVE_FREQUENCY + time) * WAVE_AMPLITUDE * 0.5;

        // 1. Application des positions et rotations
        mesh.position.x = newX;
        mesh.position.y = initialY + waveOffset; 
        
        mesh.rotation.z = rotationZ * mesh.userData.initialScaleXSign; 
        
        // 2. Réinitialisation du Scale 
        mesh.scale.y = 1;
        mesh.scale.x = mesh.userData.initialScaleXSign; 

        // Opacité (non modifiée)
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