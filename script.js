// ... (Code JS précédent) ...

// --- CONSTANTES ET INITIALISATION THREE.JS ---
// ... (Code Three.js pour la configuration, les lumières, etc. reste inchangé) ...

// --- NOUVELLE FONCTION : Ajuster la position du modèle ---
function adjustCameraForScreen() {
    const w = window.innerWidth;
    const modelOffset = -2.0; // Décaler le modèle 3D de 2 unités vers la GAUCHE (par défaut 0)

    if (w <= 480) {
        camera.position.set(0, 0, 7);
        model.scale.set(1.1, 1.1, 1.1);
        model.position.set(0, 0, 0); // Recentrer sur mobile
    } else if (w <= 900) {
        camera.position.set(0, 0, 7.5);
        model.scale.set(1.2, 1.2, 1.2);
        model.position.set(0, 0, 0); // Recentrer sur tablette
    } else {
        camera.position.set(0, 0, 7);
        model.scale.set(1, 1, 1);
        model.position.set(modelOffset, 0, 0); // Décalage vers la gauche sur desktop
    }
    camera.lookAt(model.position);
}

// ... (Le code de setup, des listeners 'resize', 'mousemove', 'touch', etc. reste inchangé) ...

let trainProgress = 0;
const trainSpeedSlow = 0.0008;
const trainSpeedFast = 0.01;
let currentSpeed = trainSpeedSlow;
let isAccelerating = false;
let fastLapCount = 0;
let hasExploded = false;
let particles = [];
let lapStarted = false;
let timerExplosion = 0; // NOUVEAU : Compteur pour la réapparition

// ... (La fonction createParticle reste inchangée) ...

function explodeTrain() {
    hasExploded = true;
    isAccelerating = false;
    canvas.style.cursor = 'default';
    
    // ... (Le code de création des particules reste inchangé) ...

    wagonGroup.visible = false;
    // Les rails sont masqués juste après l'explosion
    rail.visible = false;
    railInner.visible = false;
    
    timerExplosion = 0; // Réinitialiser le compteur de temps
}

// --- BOUCLE D'ANIMATION (MODIFICATION CLÉ) ---

function animate() {
    requestAnimationFrame(animate);

    // Mise à jour de la vitesse
    if (isAccelerating) {
        currentSpeed = Math.min(trainSpeedFast, currentSpeed * 1.05 + 0.0002);
    } else {
        currentSpeed = Math.max(trainSpeedSlow, currentSpeed * 0.98);
    }

    if (!hasExploded) {
        // Mouvement du train
        let oldProgress = trainProgress;
        trainProgress += currentSpeed;
        trainProgress %= 1; 
        
        // Détection de tour rapide (pour l'explosion)
        if (currentSpeed > trainSpeedFast * 0.95 && oldProgress > 0.9 && trainProgress < 0.1) {
            if (lapStarted) {
                fastLapCount++;
            } else {
                lapStarted = true;
            }
            if (fastLapCount >= 3) {
                explodeTrain();
            }
        }

        // ... (Le code de mise à jour de la position des wagons reste inchangé) ...
        wagonGroup.children.forEach(wagonContainer => {
            const p = circleCurve.getPointAt((trainProgress + wagonContainer.userData.offset) % 1);
            const tangent = circleCurve.getTangentAt((trainProgress + wagonContainer.userData.offset) % 1);
            
            wagonContainer.position.copy(p);
            wagonContainer.rotation.y = Math.atan2(tangent.x, -tangent.y) + Math.PI / 2;
            wagonContainer.rotation.z = Math.atan2(tangent.y, tangent.x);
        });
        
        model.rotation.z += 0.001;
    } else {
        // Mouvement des particules après explosion
        particles.forEach(p => {
            p.userData.velocity.y -= 0.03; // Gravité
            p.position.add(p.userData.velocity.clone().multiplyScalar(0.016));
            p.rotation.x += p.userData.rotation.x;
            p.rotation.y += p.userData.rotation.y;
            p.rotation.z += p.userData.rotation.z;
        });

        // NOUVEAU : Logique de réapparition des rails (Chemin de Vie)
        timerExplosion += 1;
        
        if (timerExplosion > 300) { // Après environ 5 secondes (300 frames)
            // Afficher le rail progressivement
            rail.visible = true;
            railInner.visible = true;

            // Masquer les particules après un certain temps pour nettoyer la scène
            if (timerExplosion > 400) { 
                particles.forEach(p => scene.remove(p));
                particles = [];
                
                // Réinitialiser le mode normal
                hasExploded = false;
                wagonGroup.visible = true;
                fastLapCount = 0;
                lapStarted = false;
            }
        }
    }

    renderer.render(scene, camera);
}

// ... (Le reste du code DOM/Admin/Storage reste inchangé) ...