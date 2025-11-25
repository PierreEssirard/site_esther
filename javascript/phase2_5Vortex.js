// javascript/phase2_5Vortex.js

let vortexElements = [];

// Constantes pour contrôler l'animation (ajustées pour une meilleure visibilité)
const VORTEX_RADIUS_START = 12; // Plus petit que 15, plus visible au début
const VORTEX_RADIUS_END = 9;    // Rayon final (correspond au carrousel)
const VORTEX_HEIGHT = 10;       // Moins de hauteur, plus de concentration
const VORTEX_SPEED = 15;        // Moins rapide que 30, plus lisible

/**
 * Prépare les images du carrousel pour l'animation de tourbillon.
 * @param {THREE.Group} phase2_5Group
 * @param {Array<THREE.Group>} images - Référence au tableau d'images créées par Phase 3
 */
export function initPhase2_5(phase2_5Group, images) {
    if (images.length === 0) return;
    
    vortexElements = images;
    
    images.forEach((group, index) => {
        group.userData.vortexIndex = index;
        group.userData.initialRotationY = (index / images.length) * Math.PI * 2;
        group.userData.currentRotationY = group.userData.initialRotationY;
        
        // S'assurer qu'ils sont invisibles et petits au départ
        group.scale.setScalar(0.01);
        group.children[0].material.opacity = 0;
        
        // Ajout des éléments pour la phase 2.5
        phase2_5Group.add(group);
    });
}

/**
 * Anime les images dans un tourbillon qui se resserre.
 * @param {number} progress - Progression du tourbillon (0 à 1)
 */
export function updatePhase2_5(progress) {
    if (vortexElements.length === 0) return;
    
    // Progression normalisée (accélération/décélération douce)
    const easedProgress = THREE.MathUtils.smoothstep(progress, 0, 1);
    
    vortexElements.forEach((group) => {
        const index = group.userData.vortexIndex;
        
        // 1. Calcul du rayon : resserrement
        const radius = VORTEX_RADIUS_START * (1 - easedProgress) + VORTEX_RADIUS_END * easedProgress;
        
        // 2. Calcul de l'angle du tourbillon (progression + indice)
        const angle = group.userData.initialRotationY + (progress * VORTEX_SPEED);
        
        // 3. Application des positions X et Z (cercle + rétrécissement)
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        // 4. Mouvement vertical : Balaye l'espace
        const yOffset = Math.sin(progress * Math.PI) * VORTEX_HEIGHT * (1 - progress); // Balayage s'amortit
        
        group.position.set(x, yOffset + 1.5, z); 
        
        // Rotation de l'image pour qu'elle suive le tourbillon
        group.rotation.y = angle + Math.PI / 2;
        group.rotation.x = Math.sin(progress * Math.PI) * Math.PI * 0.1; 
        group.rotation.z = 0; 
        
        // Opacité / Echelle: Apparition progressive pendant le vortex
        const visualProgress = THREE.MathUtils.smoothstep(progress, 0, 0.5);
        const targetScale = visualProgress;

        group.children[0].material.opacity = visualProgress;
        group.scale.setScalar(targetScale);
    });
}

/**
 * Renvoie les éléments pour la Phase 3.
 */
export function getTransitionedElements() {
    return vortexElements;
}