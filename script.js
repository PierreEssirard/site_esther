// ===== THREE.JS SETUP =====
const canvas = document.getElementById('canvas3d');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000); 

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });

function setRendererToCanvasSize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
}

// Lumières
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const light1 = new THREE.DirectionalLight(0xffffff, 1.2);
light1.position.set(5, 5, 5);
scene.add(light1);
const light2 = new THREE.PointLight(0xf0c4df, 1, 10); // Lumière rose locale pinceau
scene.add(light2);

// ==========================================================
// 1. GROUPES DE SCÈNE
// ==========================================================
const phase1Group = new THREE.Group();
scene.add(phase1Group);

const phase2Group = new THREE.Group();
scene.add(phase2Group);
phase2Group.visible = false; 

// GROUPE GLOBAL POUR LES CUBES QUI TOMBENT (Toujours visible)
const globalParticlesGroup = new THREE.Group();
scene.add(globalParticlesGroup);


// ==========================================================
// 2. PHASE 1 : TRAIN
// ==========================================================
const model = new THREE.Group();
model.position.set(-4.5, 0, 0); 
phase1Group.add(model);

const radius = 2.5;
const circlePoints = [];
const segments = 120; 
for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    circlePoints.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0));
}
const circleCurve = new THREE.CatmullRomCurve3(circlePoints, true, 'centripetal', 0.5);
const railGeo = new THREE.TubeGeometry(circleCurve, 200, 0.08, 16, true);
const rail = new THREE.Mesh(railGeo, new THREE.MeshBasicMaterial({ color: 0xf0c4df }));
model.add(rail);
const railInner = new THREE.Mesh(new THREE.TubeGeometry(circleCurve, 200, 0.04, 12, true), new THREE.MeshBasicMaterial({ color: 0xf0c4df, transparent: true, opacity: 0.7 }));
railInner.scale.set(0.95, 0.95, 1);
model.add(railInner);

const wagonGroup = new THREE.Group();
const numWagons = 8;
for (let i = 0; i < numWagons; i++) {
    const wagonContainer = new THREE.Group();
    const wagon = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.35), new THREE.MeshBasicMaterial({ color: 0xa8d0ff }));
    wagonContainer.add(wagon);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.36), new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0xa8c9e8 : i % 3 === 1 ? 0xb8d4f0 : 0xc8def5, transparent: true, opacity: 0.95 }));
    stripe.position.y = 0.1; wagonContainer.add(stripe);
    const wheelGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.04, 16);
    const wheelMat = new THREE.MeshBasicMaterial({ color: 0xfff1a8 }); 
    for (let w = 0; w < 4; w++) {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = Math.PI / 2; wheel.position.set(w < 2 ? -0.16 : 0.16, -0.18, w % 2 === 0 ? 0.12 : -0.12);
        wagonContainer.add(wheel);
    }
    wagonContainer.userData.offset = i / numWagons;
    wagonGroup.add(wagonContainer);
}
model.add(wagonGroup);


// ==========================================================
// 3. PHASE 2 : PINCEAU ÉCRIVAIN
// ==========================================================

// Création du pinceau
function createPaintbrush() {
    const brushGroup = new THREE.Group();
    // Manche
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 2.5, 16), new THREE.MeshStandardMaterial({ color: 0x8B4513 }));
    handle.position.y = 1.5; brushGroup.add(handle);
    // Virole
    const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.1, 0.6, 16), new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8 }));
    ferrule.position.y = 0.2; brushGroup.add(ferrule);
    // Poils (Rose)
    const bristles = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.8, 16), new THREE.MeshStandardMaterial({ color: 0xf0c4df }));
    bristles.position.y = -0.4; bristles.rotation.x = Math.PI; brushGroup.add(bristles);
    
    brushGroup.rotation.x = -Math.PI / 2; // Couché pour écrire
    return brushGroup;
}
const paintBrush = createPaintbrush();
phase2Group.add(paintBrush);

// Chargement de la police et génération du tracé "Mes Projets"
let paintStroke = null;
let paintCurve = null;
let paintGeometry = null;

const loader = new THREE.FontLoader();
// Utilisation d'une police standard Three.js en ligne (Helvetiker)
loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function (font) {
    
    const xMid = -3.5; // Décalage pour centrer approximativement
    const textShape = font.generateShapes('Mes Projets', 1.5); // Taille 1.5
    
    // On extrait les points des formes pour créer un chemin continu (approximatif pour l'effet pinceau)
    // Astuce : on connecte les formes entre elles pour faire un seul trait continu
    const points = [];
    const holeShapes = [];

    textShape.forEach((shape) => {
        if (shape.holes && shape.holes.length > 0) {
            shape.holes.forEach((hole) => holeShapes.push(hole));
        }
        const shapePoints = shape.getPoints(5); // Résolution faible pour style "fluide"
        shapePoints.forEach((p) => {
            points.push(new THREE.Vector3(p.x + xMid, p.y, 0));
        });
        // Petit saut entre les lettres (zhop vers le haut puis bas)
        const lastP = shapePoints[shapePoints.length - 1];
        points.push(new THREE.Vector3(lastP.x + xMid + 0.1, lastP.y, 0.5)); // Leve le pinceau
        points.push(new THREE.Vector3(lastP.x + xMid + 0.2, lastP.y, 0)); // Baisse le pinceau
    });

    // Création de la courbe
    if (points.length > 0) {
        paintCurve = new THREE.CatmullRomCurve3(points);
        // Géométrie tube (la peinture)
        paintGeometry = new THREE.TubeGeometry(paintCurve, 600, 0.15, 8, false);
        const paintMat = new THREE.MeshPhysicalMaterial({ 
            color: 0xf0c4df, // ROSE PALE
            roughness: 0.2, metalness: 0.1, clearcoat: 1.0,
            transparent: true, opacity: 0.9
        });
        
        paintStroke = new THREE.Mesh(paintGeometry, paintMat);
        
        // Initialiser invisible (drawRange 0)
        paintGeometry.setDrawRange(0, 0);
        
        // Centrer le texte
        paintStroke.position.set(-2, 0, 0); 
        paintBrush.position.set(-10, 0, 0); // Pinceau au loin au début

        phase2Group.add(paintStroke);
    }
});


// ==========================================================
// 4. PHASE 1 : SCULPTURE & CUBES
// ==========================================================
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

// Helper pour les cubes qui tombent (Ajoutés au groupe GLOBAL)
function createFallingCube() {
    const colors = [0xa8d0ff, 0xf0c4df, 0xfff1a8];
    const cube = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.2, 0.2),
        new THREE.MeshBasicMaterial({ color: colors[Math.floor(Math.random() * colors.length)], transparent: true, opacity: 0.9 })
    );
    
    const angle = Math.random() * Math.PI * 2;
    const radius = 1 + Math.random() * 3;
    // On les fait apparaître sur toute la largeur pour la phase 2
    cube.position.set(
        (Math.random() - 0.5) * 10, // Largeur aléatoire
        6, // Commence bien haut
        (Math.random() - 0.5) * 5
    );
    
    cube.userData = {
        velocity: new THREE.Vector3(0, -0.03 - Math.random() * 0.04, 0), 
        rotation: new THREE.Vector3(Math.random()*0.1, Math.random()*0.1, Math.random()*0.1)
    };
    return cube;
}

// ==========================================================
// SETUP
// ==========================================================
function adjustCameraForScreen() {
    const w = window.innerWidth;
    if (w <= 480) {
        camera.position.set(0, 0, 7);
        phase1Group.scale.set(1.1, 1.1, 1.1);
        phase1Group.position.set(0, 0, 0);
    } else {
        camera.position.set(-1, 0, 7);
        phase1Group.scale.set(1, 1, 1);
        phase1Group.position.set(0, 0, 0); 
    }
}
setRendererToCanvasSize();
adjustCameraForScreen();
window.addEventListener('resize', () => { setRendererToCanvasSize(); adjustCameraForScreen(); });

// Variables
let trainProgress = 0;
let currentSpeed = 0.0012;
let isAccelerating = false;
let fastLapCount = 0;
let hasExploded = false;
let particles = []; 
let fallingCubes = []; // Liste séparée pour les cubes persistants
let haussmannBuilding = null;
let lapStarted = false;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

function updateMousePosition(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
}
function checkTrainIntersection() {
    raycaster.setFromCamera(mouse, camera);
    return raycaster.intersectObjects(wagonGroup.children, true).length > 0;
}

if (!isMobile) {
    canvas.addEventListener('mousemove', (e) => {
        if (hasExploded) return;
        const rect = canvas.getBoundingClientRect();
        const relX = (e.clientX - rect.left) / rect.width;
        const relY = (e.clientY - rect.top) / rect.height;
        if (relX > 0.0 && relX < 0.6 && relY > 0.2 && relY < 0.8) { isAccelerating = true; canvas.style.cursor = 'pointer'; }
        else { isAccelerating = false; canvas.style.cursor = 'default'; }
    });
} else {
    canvas.addEventListener('touchstart', (e) => {
        if (hasExploded) return;
        const touch = e.touches[0];
        updateMousePosition(touch.clientX, touch.clientY);
        if (checkTrainIntersection()) isAccelerating = true;
    });
    canvas.addEventListener('touchend', () => isAccelerating = false);
}

// Helper explosion
function createParticle(position, velocity) {
    const size = Math.random() * 0.15 + 0.05;
    const colors = [0xa8d0ff, 0xf0c4df, 0xfff1a8];
    const particle = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), new THREE.MeshBasicMaterial({ color: colors[Math.floor(Math.random() * colors.length)] }));
    particle.position.copy(position); particle.userData.velocity = velocity;
    return particle;
}

function explodeTrain() {
    hasExploded = true; isAccelerating = false; canvas.style.cursor = 'default';
    wagonGroup.visible = false; rail.visible = false; railInner.visible = false;
    
    for (let i = 0; i < 150; i++) {
        const v = new THREE.Vector3((Math.random()-0.5)*4, (Math.random()-0.5)*4, (Math.random()-0.5)*4);
        const p = createParticle(new THREE.Vector3(-4.5, 0, 0), v); 
        particles.push(p); phase1Group.add(p);
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
// BOUCLE D'ANIMATION
// ==========================================================
function animate() {
    requestAnimationFrame(animate);
    
    const scrollY = window.scrollY;
    const heroHeight = window.innerHeight;
    const scroll3dSection = document.getElementById('scroll3dSection');
    const heroContent = document.querySelector('.hero-content');

    let transitionFactor = Math.max(0, Math.min(1, (scrollY - (heroHeight * 0.1)) / (heroHeight * 0.9)));
    
    // --- GESTION PHASE 1 ---
    if (transitionFactor < 1) {
        phase1Group.visible = true;
        const opacity = 1 - transitionFactor;
        
        // Parallaxe verticale inversée
        const pixelScale = (camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov/2)) * 2) / window.innerHeight;
        phase1Group.position.y = scrollY * pixelScale * 0.9; 

        phase1Group.traverse(o => { 
            if(o.material) { o.material.transparent = true; o.material.opacity = opacity; }
        });

        if (!hasExploded) {
            if (isAccelerating) currentSpeed += (0.05 - currentSpeed) * 0.1;
            else currentSpeed += (0.0012 - currentSpeed) * 0.05;
            const oldP = trainProgress; trainProgress = (trainProgress + currentSpeed) % 1;
            if (currentSpeed > 0.025) {
                if (!lapStarted) lapStarted = true;
                if (oldP > 0.9 && trainProgress < 0.1) { fastLapCount++; if (fastLapCount >= 2) explodeTrain(); }
            } else { lapStarted = false; fastLapCount = 0; }
            wagonGroup.children.forEach(w => {
                const t = (trainProgress + w.userData.offset) % 1;
                const pos = circleCurve.getPoint(t); const tan = circleCurve.getTangent(t);
                w.position.copy(pos); w.rotation.z = Math.atan2(tan.y, tan.x);
            });
        } else {
            // Particules explosion
            for (let i = particles.length - 1; i >= 0; i--) {
                let p = particles[i];
                p.position.add(p.userData.velocity); 
                p.userData.velocity.y -= 0.002;
                p.rotation.x += 0.02; p.rotation.y += 0.02;
                if (p.position.y < -10) { phase1Group.remove(p); particles.splice(i, 1); }
            }
            
            if (haussmannBuilding) {
                haussmannBuilding.rotation.y += 0.002;
                // Génération cubes qui tombent (Phase 1 active)
                if (Math.random() < 0.03) { 
                    const fallingCube = createFallingCube();
                    fallingCubes.push(fallingCube);
                    globalParticlesGroup.add(fallingCube); // AJOUT AU GROUPE GLOBAL
                }
            }
        }
    } else {
        phase1Group.visible = false;
        
        // Continuer à générer des cubes même en phase 2 (si sculpture est "active" conceptuellement)
        if (hasExploded && Math.random() < 0.02) {
             const fallingCube = createFallingCube();
             fallingCubes.push(fallingCube);
             globalParticlesGroup.add(fallingCube);
        }
    }

    // --- GESTION CUBES TOMBANTS (GLOBAL) ---
    // On les anime indépendamment de la phase
    for (let i = fallingCubes.length - 1; i >= 0; i--) {
        let p = fallingCubes[i];
        p.position.add(p.userData.velocity);
        p.rotation.x += p.userData.rotation.x; 
        p.rotation.y += p.userData.rotation.y;
        // Supprimer si trop bas
        if (p.position.y < -10) { 
            globalParticlesGroup.remove(p); 
            fallingCubes.splice(i, 1); 
        }
    }

    // --- GESTION PHASE 2 : PINCEAU ---
    if (transitionFactor > 0) {
        phase2Group.visible = true;
        
        // Position caméra Phase 2
        camera.position.set(0, 0, 10);
        camera.lookAt(0, 0, 0);

        const rect = scroll3dSection.getBoundingClientRect();
        const scrollH = scroll3dSection.offsetHeight - window.innerHeight;
        let p = 0;
        if (scrollH > 0) p = -rect.top / scrollH;
        p = Math.min(1, Math.max(0, p));

        // Animation du Pinceau sur le tracé
        if (paintCurve && paintStroke) {
            // Déplacer le pinceau
            const pointOnCurve = paintCurve.getPointAt(p);
            
            // On décale le pinceau pour qu'il touche le point
            paintBrush.position.copy(pointOnCurve);
            // Ajout léger décalage pour simuler la main
            paintBrush.position.y += 0.5; 
            paintBrush.position.z += 0.5;

            const tangent = paintCurve.getTangentAt(p).normalize();
            const lookTarget = pointOnCurve.clone().add(tangent);
            paintBrush.lookAt(lookTarget);
            paintBrush.rotateX(-Math.PI / 4); 
            
            // Dessiner la trace
            const totalIndices = 600 * 8 * 6; // geometry size approx
            const drawCount = Math.floor(totalIndices * p);
            paintStroke.geometry.setDrawRange(0, drawCount);
            
            // Lumière suiveuse
            light2.position.copy(pointOnCurve);
            light2.position.z += 2;
        }
        
        // Fade in global phase 2
        // (On n'applique pas d'opacité au pinceau lui-même pour qu'il reste solide, juste au groupe si besoin)

    } else {
        phase2Group.visible = false;
        if (transitionFactor === 0) adjustCameraForScreen();
    }
    
    if (heroContent) heroContent.style.opacity = Math.max(0, 1 - transitionFactor * 1.5);

    renderer.render(scene, camera);
}
animate();

window.addEventListener('scroll', () => {
    const h = document.getElementById('header');
    const scrollY = window.scrollY;
    const heroHeight = window.innerHeight;

    // Logique Header : Noir en Phase 2, Blanc/Gris en Phase 1 scrollée
    if (scrollY > heroHeight - 100) {
        // Phase 2 : Forcer noir
        h.classList.add('phase2-header');
        h.classList.remove('scrolled'); // Enlever le style blanc
    } else if (scrollY > 50) {
        // Phase 1 scrollée : Blanc
        h.classList.add('scrolled');
        h.classList.remove('phase2-header');
    } else {
        // Phase 1 haut : Transparent/Noir par défaut
        h.classList.remove('scrolled');
        h.classList.remove('phase2-header');
    }
    
    const intro = document.getElementById('projectsIntro');
    if (intro && intro.getBoundingClientRect().top < window.innerHeight * 0.8) intro.classList.add('visible');
});

const adminBtn = document.getElementById('adminBtn');
const adminModal = document.getElementById('adminModal');
const closeModal = document.getElementById('closeModal');
if (adminBtn) {
    adminBtn.addEventListener('click', () => adminModal.classList.add('active'));
    closeModal.addEventListener('click', () => adminModal.classList.remove('active'));
}