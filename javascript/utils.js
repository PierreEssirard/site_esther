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
    if (w <= 480) { 
        camera.position.set(0, 0, 7); 
        phase1Group.scale.set(1.1, 1.1, 1.1); 
        phase1Group.position.set(0, 0, 0); 
    } 
    else { 
        camera.position.set(-1, 0, 7); 
        phase1Group.scale.set(1, 1, 1); 
        phase1Group.position.set(0, 0, 0); 
    }
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