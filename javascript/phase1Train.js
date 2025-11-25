// phase1Train.js

// Déclarations des variables d'état (exportées si modifiées depuis l'extérieur)
export let trainProgress = 0; 
export let currentSpeed = 0.0012; 
export let isAccelerating = false; 
export let hasExploded = false;
let fastLapCount = 0; 
let lapStarted = false;
let particles = []; 
let haussmannBuilding = null;

// Objets Three.js de la phase 1
let wagonGroup, circleCurve, rail, railInner;

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);


// ==========================================================
// A. Fonctions de création (Décor & Train)
// ==========================================================

function createParticle(position, velocity) { 
    const size = Math.random() * 0.15 + 0.05; 
    const colors = [0xa8d0ff, 0xf0c4df, 0xfff1a8]; 
    const particle = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), new THREE.MeshBasicMaterial({ color: colors[Math.floor(Math.random() * colors.length)] })); 
    particle.position.copy(position); 
    particle.userData.velocity = velocity; 
    return particle; 
}

function createHaussmannBuilding() {
    const sculpture = new THREE.Group();
    const colors = [0xa8d0ff, 0xf0c4df, 0xfff1a8]; 
    const spiralPoints = [];
    const turns = 3; const height = 5; const radiusBase = 1.5;
    for (let i = 0; i <= 120; i++) {
        const t = i / 120; const angle = t * Math.PI * 2 * turns;
        const r = radiusBase * (1 - t * 0.4); const y = t * height - height / 2;
        spiralPoints.push(new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r));
    }
    const spiralPath = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spiralPoints), 120, 0.1, 12, false), new THREE.MeshBasicMaterial({ color: 0xfff1a8, transparent: true, opacity: 0.9 }));
    sculpture.add(spiralPath);
    for (let i = 0; i <= 15; i++) {
        const t = i / 15; const point = new THREE.CatmullRomCurve3(spiralPoints).getPoint(t);
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), new THREE.MeshBasicMaterial({ color: colors[i % 3], transparent: true, opacity: 0.95 }));
        sphere.position.copy(point); sculpture.add(sphere);
    }
    const topPoint = spiralPoints[spiralPoints.length - 1];
    const petalCount = 6;
    for (let i = 0; i < petalCount; i++) {
        const angle = (i / petalCount) * Math.PI * 2;
        const petal = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), new THREE.MeshBasicMaterial({ color: 0xf0c4df }));
        petal.scale.set(1, 0.2, 0.5); petal.position.set(topPoint.x + Math.cos(angle) * 0.6, topPoint.y, topPoint.z + Math.sin(angle) * 0.6);
        petal.lookAt(topPoint); sculpture.add(petal);
    }
    const flowerCenter = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), new THREE.MeshBasicMaterial({ color: 0xa8d0ff }));
    flowerCenter.position.copy(topPoint); sculpture.add(flowerCenter);
    sculpture.position.set(-4.5, 0, 0);
    return sculpture;
}


/**
 * Initialise et ajoute tous les objets de la Phase 1 au groupe.
 * @param {THREE.Group} phase1Group
 */
export function initPhase1(phase1Group) {
    const model = new THREE.Group();
    model.position.set(-4.5, 0, 0); 
    phase1Group.add(model);

    // Rails
    const radius = 2.5;
    const circlePoints = [];
    const segments = 120; 
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        circlePoints.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0));
    }
    circleCurve = new THREE.CatmullRomCurve3(circlePoints, true, 'centripetal', 0.5);
    const railGeo = new THREE.TubeGeometry(circleCurve, 200, 0.08, 16, true);
    rail = new THREE.Mesh(railGeo, new THREE.MeshBasicMaterial({ color: 0xf0c4df }));
    model.add(rail);

    railInner = new THREE.Mesh(new THREE.TubeGeometry(circleCurve, 200, 0.04, 12, true), new THREE.MeshBasicMaterial({ color: 0xf0c4df, transparent: true, opacity: 0.7 }));
    railInner.scale.set(0.95, 0.95, 1);
    model.add(railInner);

    // Wagons
    wagonGroup = new THREE.Group();
    const numWagons = 8;
    for (let i = 0; i < numWagons; i++) {
        const wagonContainer = new THREE.Group();
        const wagon = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.35), new THREE.MeshBasicMaterial({ color: 0xa8d0ff }));
        wagonContainer.add(wagon);
        
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.36), new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0xa8c9e8 : i % 3 === 1 ? 0xb8d4f0 : 0xc8def5, transparent: true, opacity: 0.95 }));
        stripe.position.y = 0.1; 
        wagonContainer.add(stripe);
        
        const wheelGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.04, 16);
        const wheelMat = new THREE.MeshBasicMaterial({ color: 0xfff1a8 }); 
        for (let w = 0; w < 4; w++) {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.rotation.z = Math.PI / 2; 
            wheel.position.set(w < 2 ? -0.16 : 0.16, -0.18, w % 2 === 0 ? 0.12 : -0.12);
            wagonContainer.add(wheel);
        }
        wagonContainer.userData.offset = i / numWagons;
        wagonGroup.add(wagonContainer);
    }
    model.add(wagonGroup);
}

// ==========================================================
// B. Logique d'Explosion et Accélération
// ==========================================================

export function explodeTrain(phase1Group) { 
    if (hasExploded) return;
    hasExploded = true; 
    isAccelerating = false; 
    const canvas = document.getElementById('canvas3d');
    canvas.style.cursor = 'default'; 
    wagonGroup.visible = false; 
    rail.visible = false; 
    railInner.visible = false; 
    for (let i = 0; i < 150; i++) { 
        const v = new THREE.Vector3((Math.random()-0.5)*4, (Math.random()-0.5)*4, (Math.random()-0.5)*4); 
        const p = createParticle(new THREE.Vector3(-4.5, 0, 0), v); 
        particles.push(p); 
        phase1Group.add(p); 
    } 
    setTimeout(() => { 
        haussmannBuilding = createHaussmannBuilding(); 
        phase1Group.add(haussmannBuilding); 
        haussmannBuilding.scale.set(0, 0, 0); 
        let startTime = Date.now(); 
        function appear() { 
            const p = Math.min((Date.now() - startTime) / 1500, 1); 
            const s = 1 - Math.pow(1 - p, 3); 
            haussmannBuilding.scale.set(s, s, s); 
            if (p < 1) requestAnimationFrame(appear); 
        } 
        appear(); 
    }, 1000); 
}

// ==========================================================
// C. Logique de Mise à Jour (dans la boucle animate)
// ==========================================================

/**
 * Met à jour la position du train ou l'animation d'explosion/chute.
 * @param {THREE.Group} phase1Group
 * @param {THREE.Group} globalParticlesGroup
 * @param {Array<THREE.Mesh>} fallingCubes - Référence à la liste des cubes globaux
 */
export function updatePhase1(phase1Group, globalParticlesGroup, fallingCubes) {
    if (!hasExploded) {
        if (isAccelerating) currentSpeed += (0.05 - currentSpeed) * 0.1; 
        else currentSpeed += (0.0012 - currentSpeed) * 0.05;
        
        const oldP = trainProgress; 
        trainProgress = (trainProgress + currentSpeed) % 1;
        
        // Logique de détection de tour rapide pour l'explosion
        if (currentSpeed > 0.025) { 
            if (!lapStarted) lapStarted = true; 
            if (oldP > 0.9 && trainProgress < 0.1) { 
                fastLapCount++; 
                if (fastLapCount >= 2) explodeTrain(phase1Group); // Appel de la fonction d'explosion
            } 
        } else { 
            lapStarted = false; 
            fastLapCount = 0; 
        }

        // Mise à jour de la position des wagons
        if (wagonGroup.children.length > 0) {
            wagonGroup.children.forEach(w => { 
                const t = (trainProgress + w.userData.offset) % 1; 
                const pos = circleCurve.getPoint(t); 
                const tan = circleCurve.getTangent(t); 
                w.position.copy(pos); 
                w.rotation.z = Math.atan2(tan.y, tan.x); 
            });
        }
    } else {
        // Animation d'explosion
        for (let i = particles.length - 1; i >= 0; i--) { 
            let p = particles[i]; 
            p.position.add(p.userData.velocity); 
            p.userData.velocity.y -= 0.002; 
            p.rotation.x += 0.02; 
            p.rotation.y += 0.02; 
            if (p.position.y < -10) { 
                phase1Group.remove(p); 
                particles.splice(i, 1); 
            } 
        }
        
        // Bâtiment après explosion
        if (haussmannBuilding) { 
            haussmannBuilding.rotation.y += 0.002; 
            if (Math.random() < 0.03) { 
                const fallingCube = createFallingCube(); 
                fallingCubes.push(fallingCube); 
                globalParticlesGroup.add(fallingCube); 
            } 
        }
    }
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
 * Vérifie l'intersection avec les wagons du train (pour les appareils mobiles).
 */
export function checkTrainIntersection(raycaster, camera, mouse) { 
    if (!wagonGroup) return false;
    raycaster.setFromCamera(mouse, camera); 
    return raycaster.intersectObjects(wagonGroup.children, true).length > 0; 
}

// Export pour le contrôle de l'accélération depuis main.js
export function setAcceleratingState(state) {
    if (hasExploded) return;
    isAccelerating = state;
    const canvas = document.getElementById('canvas3d');
    canvas.style.cursor = state ? 'pointer' : 'default';
}

export { isMobile };