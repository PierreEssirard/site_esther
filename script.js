// ===== THREE.JS SETUP =====
const canvas = document.getElementById('canvas3d');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000); 

// Caméra
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

const light2 = new THREE.PointLight(0xf0c4df, 2, 10);
scene.add(light2);

// ==========================================================
// 1. GROUPES DE SCÈNE
// ==========================================================
const phase1Group = new THREE.Group();
scene.add(phase1Group);

const phase2Group = new THREE.Group();
scene.add(phase2Group);
phase2Group.visible = false; 

const phase3Group = new THREE.Group();
scene.add(phase3Group);
phase3Group.visible = false;

const globalParticlesGroup = new THREE.Group();
scene.add(globalParticlesGroup);


// ==========================================================
// 2. PHASE 1 : TRAIN (INCHANGÉ)
// ==========================================================
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
const circleCurve = new THREE.CatmullRomCurve3(circlePoints, true, 'centripetal', 0.5);
const railGeo = new THREE.TubeGeometry(circleCurve, 200, 0.08, 16, true);
const rail = new THREE.Mesh(railGeo, new THREE.MeshBasicMaterial({ color: 0xf0c4df }));
model.add(rail);

const railInner = new THREE.Mesh(new THREE.TubeGeometry(circleCurve, 200, 0.04, 12, true), new THREE.MeshBasicMaterial({ color: 0xf0c4df, transparent: true, opacity: 0.7 }));
railInner.scale.set(0.95, 0.95, 1);
model.add(railInner);

// Wagons
const wagonGroup = new THREE.Group();
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


// ==========================================================
// 3. PHASE 2 : PINCEAU & ÉCRITURE
// ==========================================================

function createPaintbrush() {
    const brushGroup = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.2, 16), new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5 }));
    handle.position.y = 1.1; brushGroup.add(handle);
    const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.4, 16), new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.2 }));
    ferrule.position.y = 0.0; brushGroup.add(ferrule);
    const bristles = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.5, 16), new THREE.MeshStandardMaterial({ color: 0xf0c4df }));
    bristles.position.y = -0.45; bristles.rotation.x = Math.PI; brushGroup.add(bristles);
    brushGroup.rotation.x = -Math.PI / 4; 
    return brushGroup;
}
const paintBrush = createPaintbrush();
phase2Group.add(paintBrush);

let brushPath = null;
let strokes = [];
const brushState = { position: new THREE.Vector3(-10, 0, 0) };

const loader = new THREE.FontLoader();
loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function (font) {
    const textShape = font.generateShapes('Mes Projets', 1.8); 
    const geometry = new THREE.ShapeGeometry(textShape);
    geometry.computeBoundingBox();
    const xMin = geometry.boundingBox.min.x;
    const xMax = geometry.boundingBox.max.x;
    const xMid = -(xMin + xMax) / 2;
    
    let rawContours = [];
    textShape.forEach(shape => {
        rawContours.push(shape.getPoints(8));
        if (shape.holes) shape.holes.forEach(h => rawContours.push(h.getPoints(8)));
    });

    const globalPathPoints = [];
    let currentLength = 0;
    
    const paintMat = new THREE.MeshStandardMaterial({ 
        color: 0xf0c4df, 
        emissive: 0xf0c4df, emissiveIntensity: 0.5,
        roughness: 0.3, metalness: 0.1,
        transparent: true, opacity: 1,
        side: THREE.DoubleSide
    });

    rawContours.forEach((contour, i) => {
        const pts3D = contour.map(p => new THREE.Vector3(p.x + xMid, p.y, 0));
        const curve = new THREE.CatmullRomCurve3(pts3D);
        const len = curve.getLength();
        const segs = Math.floor(len * 50); 
        const geo = new THREE.TubeGeometry(curve, Math.max(20, segs), 0.035, 8, false);
        const mesh = new THREE.Mesh(geo, paintMat);
        mesh.geometry.setDrawRange(0, 0); 
        phase2Group.add(mesh);

        const startDist = currentLength;
        pts3D.forEach(p => globalPathPoints.push(p));
        currentLength += len; 
        const endDist = currentLength;

        strokes.push({
            mesh: mesh,
            startDist: startDist,
            endDist: endDist,
            totalIndices: segs * 6 * 8
        });

        if (i < rawContours.length - 1) {
            const lastP = pts3D[pts3D.length - 1];
            const nextContour = rawContours[i + 1];
            const nextP = new THREE.Vector3(nextContour[0].x + xMid, nextContour[0].y, 0);
            const jumpHeight = 0.5;
            const midP = new THREE.Vector3().lerpVectors(lastP, nextP, 0.5);
            midP.z += jumpHeight;
            globalPathPoints.push(lastP); 
            globalPathPoints.push(midP);  
            globalPathPoints.push(nextP); 
            const jumpDist = lastP.distanceTo(midP) + midP.distanceTo(nextP);
            currentLength += jumpDist;
        }
    });

    if (globalPathPoints.length > 0) {
        brushPath = new THREE.CatmullRomCurve3(globalPathPoints, false, 'catmullrom', 0.1);
        const totalPathLength = currentLength; 
        strokes.forEach(s => {
            s.startP = s.startDist / totalPathLength;
            s.endP = s.endDist / totalPathLength;
        });
    }
    phase2Group.position.y = -0.5; 
});

// ==========================================================
// 4. PHASE 3 : CARROUSEL AUTOUR DU TEXTE "MES PROJETS"
// ==========================================================

const imageFiles = [
    '2dbd022d-1656-400d-a9cd-1d055e1730ec.jpeg',
    '7f7b9637-8979-4268-b60e-628afe4b3975.jpeg',
    '025b9c1a-10a3-48b7-889c-48cdb9e5ac19.jpeg',
    '909b39b2-338e-49e9-9c33-1c1bdb240e30.jpeg',
    '982a3aef-2302-4db3-969f-507aaade59fe.jpeg',
    'b8dfc9dd-80f4-42ad-b159-b6d8c2e60b68.jpeg',
    'BF2CAF69-68BE-4BF4-982z-24FEE1383FC4.jpeg'
];

const imageCarousel = [];
const carouselRadius = 6; // Distance du centre (texte)
const textureLoader = new THREE.TextureLoader();

// Raycaster pour la détection de survol
const raycaster3 = new THREE.Raycaster();
const mouse3D = new THREE.Vector2();
let hoveredImage = null;
let isPhase3Active = false;

// Créer les cadres façon vieux papier
imageFiles.forEach((filename, index) => {
    const frameGroup = new THREE.Group();
    
    // Cadre beige/crème style vieux papier
    const frameThickness = 0.08;
    const frameGeo = new THREE.BoxGeometry(2.4, 3.2, frameThickness);
    const frameMat = new THREE.MeshStandardMaterial({ 
        color: 0xf5e6d3, // Beige clair papier ancien
        roughness: 0.8,
        metalness: 0.1
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frameGroup.add(frame);
    
    // Bordure dorée fine
    const borderGeo = new THREE.BoxGeometry(2.5, 3.3, frameThickness + 0.01);
    const borderMat = new THREE.MeshStandardMaterial({ 
        color: 0xc9a961, // Or antique
        roughness: 0.4,
        metalness: 0.6
    });
    const border = new THREE.Mesh(borderGeo, borderMat);
    border.position.z = -0.001;
    frameGroup.add(border);
    
    // Photo avec ratio préservé
    const photoGeo = new THREE.PlaneGeometry(2.0, 2.8);
    const photoMat = new THREE.MeshStandardMaterial({ 
        color: 0xffffff,
        side: THREE.DoubleSide
    });
    
    // Charger l'image SANS déformation
    textureLoader.load(
        `image_projets/${filename}`,
        (texture) => {
            // Préserver le ratio de l'image
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            
            photoMat.map = texture;
            photoMat.needsUpdate = true;
        },
        undefined,
        () => {
            // Fallback
            photoMat.color.set(0xf0c4df);
        }
    );
    
    const photo = new THREE.Mesh(photoGeo, photoMat);
    photo.position.z = frameThickness / 2 + 0.01;
    frameGroup.add(photo);
    
    // Position initiale sur le cercle (PLAN XZ horizontal)
    const angle = (index / imageFiles.length) * Math.PI * 2;
    const x = Math.cos(angle) * carouselRadius;
    const z = Math.sin(angle) * carouselRadius;
    
    frameGroup.userData = {
        index: index,
        baseAngle: angle,
        currentAngle: angle,
        homePosition: new THREE.Vector3(x, 0, z), // Y=0 pour rester autour du texte
        targetPosition: new THREE.Vector3(x, 0, z),
        currentPosition: new THREE.Vector3(x, 0, z),
        targetScale: 1,
        currentScale: 0,
        isHovered: false,
        rotationLocked: false
    };
    
    frameGroup.position.copy(frameGroup.userData.homePosition);
    
    phase3Group.add(frameGroup);
    imageCarousel.push(frameGroup);
});

// Lumières
const spotLight3 = new THREE.SpotLight(0xffffff, 2.5);
spotLight3.position.set(0, 8, 5);
spotLight3.angle = Math.PI / 4;
spotLight3.penumbra = 0.6;
phase3Group.add(spotLight3);

const ambientLight3 = new THREE.AmbientLight(0xffeedd, 0.7); // Lumière chaude
phase3Group.add(ambientLight3);

const fillLight3 = new THREE.DirectionalLight(0xffd700, 0.4);
fillLight3.position.set(-5, 3, -3);
phase3Group.add(fillLight3);

// Gestion du survol
function updateMousePosition3D(event) {
    if (!isPhase3Active) return;
    
    const rect = canvas.getBoundingClientRect();
    mouse3D.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse3D.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function checkHoveredImage() {
    if (!isPhase3Active || imageCarousel.length === 0) return;
    
    raycaster3.setFromCamera(mouse3D, camera);
    
    const allMeshes = [];
    imageCarousel.forEach(frame => {
        frame.traverse(child => {
            if (child.isMesh) allMeshes.push(child);
        });
    });
    
    const intersects = raycaster3.intersectObjects(allMeshes, false);
    
    let newHoveredImage = null;
    
    if (intersects.length > 0) {
        let object = intersects[0].object;
        while (object.parent && !imageCarousel.includes(object)) {
            object = object.parent;
        }
        if (imageCarousel.includes(object)) {
            newHoveredImage = object;
        }
    }
    
    if (newHoveredImage !== hoveredImage) {
        if (hoveredImage) {
            hoveredImage.userData.isHovered = false;
            hoveredImage.userData.rotationLocked = false;
        }
        
        hoveredImage = newHoveredImage;
        if (hoveredImage) {
            hoveredImage.userData.isHovered = true;
            hoveredImage.userData.rotationLocked = true; // BLOQUER la rotation
            canvas.style.cursor = 'pointer';
        } else {
            canvas.style.cursor = 'default';
        }
    }
}

canvas.addEventListener('mousemove', updateMousePosition3D);
canvas.addEventListener('mousemove', checkHoveredImage);

// Animation du carrousel
let carouselRotation = 0;

function updateCarouselPhase3(transitionProgress) {
    // Rotation SEULEMENT si aucune image n'est survolée
    if (!hoveredImage) {
        carouselRotation += 0.004;
    }
    
    imageCarousel.forEach((frame, i) => {
        const userData = frame.userData;
        
        // Apparition progressive
        if (transitionProgress < 1) {
            userData.targetScale = transitionProgress;
        } else {
            userData.targetScale = 1;
        }
        
        // Si image survolée : ARRÊTER et venir au premier plan
        if (userData.isHovered) {
            // Position FIXE devant la caméra
            userData.targetPosition.set(0, 0, 6); // Plus près de la caméra
            userData.targetScale = 3.0; // Plus grande
            
            // Regarder directement la caméra
            frame.lookAt(camera.position);
            
        } else {
            // Position sur le cercle qui tourne (PLAN HORIZONTAL)
            if (!userData.rotationLocked) {
                userData.currentAngle = userData.baseAngle + carouselRotation;
            }
            
            const x = Math.cos(userData.currentAngle) * carouselRadius;
            const z = Math.sin(userData.currentAngle) * carouselRadius;
            userData.homePosition.set(x, 0, z); // Y = 0 (plan horizontal)
            
            userData.targetPosition.copy(userData.homePosition);
            userData.targetScale = transitionProgress >= 1 ? 1 : transitionProgress;
            
            // Regarder le centre (texte "Mes Projets")
            const lookTarget = new THREE.Vector3(0, 0, 0);
            const targetQuat = new THREE.Quaternion();
            const currentQuat = frame.quaternion.clone();
            
            frame.lookAt(lookTarget);
            targetQuat.copy(frame.quaternion);
            frame.quaternion.copy(currentQuat);
            frame.quaternion.slerp(targetQuat, 0.1);
        }
        
        // Interpolation ULTRA-DOUCE
        userData.currentPosition.lerp(userData.targetPosition, 0.15);
        frame.position.copy(userData.currentPosition);
        
        userData.currentScale += (userData.targetScale - userData.currentScale) * 0.15;
        frame.scale.setScalar(userData.currentScale);
    });
}

window.updateCarouselPhase3 = updateCarouselPhase3;
window.setPhase3Active = (active) => { 
    isPhase3Active = active; 
    if (!active) {
        hoveredImage = null;
        canvas.style.cursor = 'default';
        imageCarousel.forEach(frame => {
            frame.userData.isHovered = false;
            frame.userData.rotationLocked = false;
        });
    }
};


// ==========================================================
// 5. DÉCOR & PARTICULES
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

function createFallingCube() {
    const colors = [0xa8d0ff, 0xf0c4df, 0xfff1a8];
    const cube = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshBasicMaterial({ color: colors[Math.floor(Math.random() * colors.length)], transparent: true, opacity: 0.9 }));
    cube.position.set((Math.random() - 0.5) * 10, 6, (Math.random() - 0.5) * 5);
    cube.userData = { velocity: new THREE.Vector3(0, -0.03 - Math.random() * 0.04, 0), rotation: new THREE.Vector3(Math.random()*0.1, Math.random()*0.1, Math.random()*0.1) };
    return cube;
}

// ==========================================================
// 6. SETUP & LOGIQUE GÉNÉRALE
// ==========================================================
function adjustCameraForScreen() {
    const w = window.innerWidth;
    if (w <= 480) { camera.position.set(0, 0, 7); phase1Group.scale.set(1.1, 1.1, 1.1); phase1Group.position.set(0, 0, 0); } 
    else { camera.position.set(-1, 0, 7); phase1Group.scale.set(1, 1, 1); phase1Group.position.set(0, 0, 0); }
}
setRendererToCanvasSize(); 
adjustCameraForScreen(); 
window.addEventListener('resize', () => { setRendererToCanvasSize(); adjustCameraForScreen(); });

let trainProgress = 0; let currentSpeed = 0.0012; let isAccelerating = false; let fastLapCount = 0; let hasExploded = false; let particles = []; let fallingCubes = []; let haussmannBuilding = null; let lapStarted = false;

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

function createParticle(position, velocity) { 
    const size = Math.random() * 0.15 + 0.05; 
    const colors = [0xa8d0ff, 0xf0c4df, 0xfff1a8]; 
    const particle = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), new THREE.MeshBasicMaterial({ color: colors[Math.floor(Math.random() * colors.length)] })); 
    particle.position.copy(position); 
    particle.userData.velocity = velocity; 
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
// 7. BOUCLE D'ANIMATION PRINCIPALE - CORRIGÉE
// ==========================================================
function animate() {
    requestAnimationFrame(animate);
    
    const scrollY = window.scrollY;
    const heroHeight = window.innerHeight;
    const scroll3dSection = document.getElementById('scroll3dSection');
    const carouselSection = document.getElementById('carouselScrollSection');
    const heroContent = document.querySelector('.hero-content');
    
    let phase1to2Transition = Math.max(0, Math.min(1, (scrollY - (heroHeight * 0.1)) / (heroHeight * 0.9)));
    
    const scroll3dHeight = scroll3dSection ? scroll3dSection.offsetHeight : 0;
    const carouselHeight = carouselSection ? carouselSection.offsetHeight : 0;
    const phase2Start = heroHeight;
    const phase2End = phase2Start + scroll3dHeight;
    const phase3Start = phase2End;
    
    let phase2to3Transition = 0;
    if (scrollY > phase2End - heroHeight) {
        phase2to3Transition = Math.max(0, Math.min(1, (scrollY - (phase2End - heroHeight)) / (heroHeight * 1.5)));
    }
    
    // --- PHASE 1 : TRAIN ---
    if (phase1to2Transition < 1) {
        phase1Group.visible = true;
        const opacity = 1 - phase1to2Transition;
        const pixelScale = (camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov/2)) * 2) / window.innerHeight;
        phase1Group.position.y = scrollY * pixelScale * 0.9; 
        phase1Group.traverse(o => { if(o.material) { o.material.transparent = true; o.material.opacity = opacity; } });
        
        if (!hasExploded) {
            if (isAccelerating) currentSpeed += (0.05 - currentSpeed) * 0.1; 
            else currentSpeed += (0.0012 - currentSpeed) * 0.05;
            const oldP = trainProgress; 
            trainProgress = (trainProgress + currentSpeed) % 1;
            if (currentSpeed > 0.025) { 
                if (!lapStarted) lapStarted = true; 
                if (oldP > 0.9 && trainProgress < 0.1) { 
                    fastLapCount++; 
                    if (fastLapCount >= 2) explodeTrain(); 
                } 
            } else { 
                lapStarted = false; 
                fastLapCount = 0; 
            }
            wagonGroup.children.forEach(w => { 
                const t = (trainProgress + w.userData.offset) % 1; 
                const pos = circleCurve.getPoint(t); 
                const tan = circleCurve.getTangent(t); 
                w.position.copy(pos); 
                w.rotation.z = Math.atan2(tan.y, tan.x); 
            });
        } else {
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
            if (haussmannBuilding) { 
                haussmannBuilding.rotation.y += 0.002; 
                if (Math.random() < 0.03) { 
                    const fallingCube = createFallingCube(); 
                    fallingCubes.push(fallingCube); 
                    globalParticlesGroup.add(fallingCube); 
                } 
            }
        }
    } else { 
        phase1Group.visible = false; 
        if (hasExploded && Math.random() < 0.02) { 
            const fallingCube = createFallingCube(); 
            fallingCubes.push(fallingCube); 
            globalParticlesGroup.add(fallingCube); 
        } 
    }

    // --- CUBES TOMBANTS ---
    for (let i = fallingCubes.length - 1; i >= 0; i--) { 
        let p = fallingCubes[i]; 
        p.position.add(p.userData.velocity); 
        p.rotation.x += p.userData.rotation.x; 
        p.rotation.y += p.userData.rotation.y; 
        if (p.position.y < -10) { 
            globalParticlesGroup.remove(p); 
            fallingCubes.splice(i, 1); 
        } 
    }

    // --- PHASE 2 : PINCEAU ---
    if (phase1to2Transition > 0) {
        phase2Group.visible = true;
        
        camera.position.set(0, 0, 10);
        camera.lookAt(0, 0, 0);

        const rect = scroll3dSection.getBoundingClientRect();
        const scrollH = scroll3dSection.offsetHeight - window.innerHeight;
        let p = 0; 
        if (scrollH > 0) p = -rect.top / scrollH;
        p = Math.min(1, Math.max(0, p));

        if (brushPath && strokes.length > 0) {
            const targetPos = brushPath.getPointAt(p);
            const brushOffset = new THREE.Vector3(0, 0.4, 0.4); 
            const finalPos = targetPos.clone().add(brushOffset);
            brushState.position.lerp(finalPos, 0.1);
            paintBrush.position.copy(brushState.position);
            paintBrush.rotation.set(-Math.PI / 4, 0, 0);
            const deltaX = targetPos.x - brushState.position.x;
            paintBrush.rotation.z = -deltaX * 2.0;

            strokes.forEach(s => {
                if (p < s.startP) {
                    s.mesh.geometry.setDrawRange(0, 0);
                } else if (p > s.endP) {
                    s.mesh.geometry.setDrawRange(0, Infinity);
                } else {
                    const localP = (p - s.startP) / (s.endP - s.startP);
                    const drawCount = Math.floor(s.totalIndices * localP);
                    s.mesh.geometry.setDrawRange(0, drawCount);
                }
            });
            
            light2.position.copy(brushState.position); 
            light2.position.z += 1;
        }
        
        // Pas de fade du texte - il reste visible en Phase 3
        if (phase2to3Transition > 0 && phase2to3Transition < 0.3) {
            const phase2Opacity = 1 - (phase2to3Transition / 0.3);
            paintBrush.traverse(o => {
                if (o.material) {
                    o.material.transparent = true;
                    o.material.opacity = phase2Opacity;
                }
            });
        } else if (phase2to3Transition >= 0.3) {
            paintBrush.visible = false;
        }

    } else { 
        phase2Group.visible = false; 
    }
    
    // --- PHASE 3 : CARROUSEL AUTOUR DU TEXTE ---
    if (phase2to3Transition > 0.2) {
        phase3Group.visible = true;
        
        if (window.setPhase3Active) {
            window.setPhase3Active(true);
        }
        
        camera.position.set(0, 0, 10);
        camera.lookAt(0, 0, 0);
        
        const phase3Progress = Math.min(1, (phase2to3Transition - 0.2) / 0.8);
        
        if (window.updateCarouselPhase3) {
            window.updateCarouselPhase3(phase3Progress);
        }
        
        // GARDER "Mes Projets" COMPLÈTEMENT VISIBLE
        strokes.forEach(s => {
            if (s.mesh.material) {
                s.mesh.material.opacity = 1; // Toujours visible
            }
        });
        
    } else {
        phase3Group.visible = false;
        
        if (window.setPhase3Active) {
            window.setPhase3Active(false);
        }
    }
    
    if (heroContent) {
        heroContent.style.opacity = Math.max(0, 1 - phase1to2Transition * 1.5);
    }
    
    renderer.render(scene, camera);
}
animate();

// --- EVENTS ---
window.addEventListener('scroll', () => {
    const h = document.getElementById('header'); 
    const scrollY = window.scrollY; 
    const heroHeight = window.innerHeight;
    const scroll3dSection = document.getElementById('scroll3dSection');
    const carouselSection = document.getElementById('carouselScrollSection');
    const scroll3dEnd = heroHeight + (scroll3dSection ? scroll3dSection.offsetHeight : 0);
    const carouselEnd = scroll3dEnd + (carouselSection ? carouselSection.offsetHeight : 0);
    
    if (scrollY > carouselEnd - 200) {
        h.classList.add('scrolled'); 
        h.classList.remove('phase2-header');
    } else if (scrollY > scroll3dEnd - 100) { 
        h.classList.add('phase2-header'); 
        h.classList.remove('scrolled'); 
    } else if (scrollY > heroHeight - 100) { 
        h.classList.add('phase2-header'); 
        h.classList.remove('scrolled'); 
    } else if (scrollY > 50) { 
        h.classList.add('scrolled'); 
        h.classList.remove('phase2-header'); 
    } else { 
        h.classList.remove('scrolled'); 
        h.classList.remove('phase2-header'); 
    }
    
    const intro = document.getElementById('projectsIntro'); 
    if (intro && intro.getBoundingClientRect().top < window.innerHeight * 0.8) {
        intro.classList.add('visible');
    }
});

const adminBtn = document.getElementById('adminBtn'); 
const adminModal = document.getElementById('adminModal'); 
const closeModal = document.getElementById('closeModal');
if (adminBtn) { 
    adminBtn.addEventListener('click', () => adminModal.classList.add('active')); 
    closeModal.addEventListener('click', () => adminModal.classList.remove('active')); 
}