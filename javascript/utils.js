// javascript/utils.js

/**
 * Ajuste le renderer à la taille du canvas/fenêtre et met à jour la caméra.
 * @param {THREE.WebGLRenderer} renderer
 * @param {THREE.PerspectiveCamera} camera
 */
export function setRendererToCanvasSize(renderer, camera) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
}

/**
 * Ajuste la position et l'échelle de la Phase 1 pour la responsivité.
 * @param {THREE.PerspectiveCamera} camera
 * @param {THREE.Group} phase1Group
 */
export function adjustCameraForScreen(camera, phase1Group) {
    const w = window.innerWidth;
    
    // Position Z par défaut pour desktop
    let baseCameraZ = 7;
    let phase1Scale = 1.0;
    let cameraX = -1; // Position standard X (pour décentrer le tapis sur desktop)

    if (w <= 480) { 
        // MODIFICATION: Augmentation de la distance Z à 20.0 pour un effet de 'très très petit'
        baseCameraZ = 20.0; 
        
        // On recentre la caméra en X sur mobile
        cameraX = 0; 
        
        // On conserve le scale pour la phase 1 (zoom initial)
        phase1Scale = 1.1; 
    } 
    
    // Position de la caméra Phase 1
    camera.position.set(cameraX, 0, baseCameraZ); 
    
    // Scale du groupe Phase 1
    phase1Group.scale.set(phase1Scale, phase1Scale, phase1Scale); 
    phase1Group.position.set(0, 0, 0); 
    
    camera.updateProjectionMatrix(); // Mise à jour de la matrice de projection
}

/**
 * Met à jour la position 2D de la souris/touch pour les raycasters.
 * @param {Event} event
 * @param {HTMLElement} canvas
 * @param {THREE.Vector2} mouse
 */
export function updateMousePosition(event, canvas, mouse) { 
    const rect = canvas.getBoundingClientRect(); 
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1; 
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1; 
}