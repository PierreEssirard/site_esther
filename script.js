// ===== THREE.JS SETUP =====
const canvas = document.getElementById('canvas3d');
const scene = new THREE.Scene();
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

renderer.setClearColor(0x000000, 1);

// Lights
const ambientLight = new THREE.AmbientLight(0xf0c4df, 0.3);
scene.add(ambientLight);
const light1 = new THREE.DirectionalLight(0xf0c4df, 3.0);
light1.position.set(5, 5, 5);
scene.add(light1);
const light2 = new THREE.DirectionalLight(0xf0c4df, 2.8);
light2.position.set(-5, 3, -5);
scene.add(light2);

// Create train model with PERFECT circle
const model = new THREE.Group();
const radius = 2.5;
const circlePoints = [];
const segments = 120; // Plus de segments pour un cercle plus lisse

for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    circlePoints.push(new THREE.Vector3(
        Math.cos(angle) * radius, 
        Math.sin(angle) * radius, 
        0
    ));
}

const circleCurve = new THREE.CatmullRomCurve3(circlePoints, true, 'centripetal', 0.5);
const railGeo = new THREE.TubeGeometry(circleCurve, 200, 0.08, 16, true);
const rail = new THREE.Mesh(railGeo, new THREE.MeshBasicMaterial({ 
    color: 0xf0c4df
}));
model.add(rail);

const railInner = new THREE.Mesh(
    new THREE.TubeGeometry(circleCurve, 200, 0.04, 12, true), 
    new THREE.MeshBasicMaterial({ 
        color: 0xf0c4df, 
        transparent: true, 
        opacity: 0.7
    })
);
railInner.scale.set(0.95, 0.95, 1);
model.add(railInner);

// Create wagons with better geometry
const wagonGroup = new THREE.Group();
const numWagons = 8;

for (let i = 0; i < numWagons; i++) {
    const wagonContainer = new THREE.Group();
    
    // Corps du wagon
    const wagon = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.35, 0.35), 
        new THREE.MeshBasicMaterial({ 
            color: 0xa8d0ff
        })
    );
    wagonContainer.add(wagon);
    
    // Bande
    const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.52, 0.08, 0.36), 
        new THREE.MeshBasicMaterial({ 
            color: i % 3 === 0 ? 0xa8c9e8 : i % 3 === 1 ? 0xb8d4f0 : 0xc8def5,
            transparent: true, 
            opacity: 0.95
        })
    );
    stripe.position.y = 0.1;
    wagonContainer.add(stripe);
    
    // Fenêtres
    const windowGeo = new THREE.PlaneGeometry(0.12, 0.12);
    const windowMat = new THREE.MeshBasicMaterial({ 
        color: 0xfff1a8, 
        transparent: true, 
        opacity: 0.75 
    });
    for (let j = 0; j < 3; j++) {
        const win = new THREE.Mesh(windowGeo, windowMat);
        win.position.set((j - 1) * 0.15, 0, 0.181);
        wagonContainer.add(win);
        const winBack = win.clone();
        winBack.position.z = -0.181;
        winBack.rotation.y = Math.PI;
        wagonContainer.add(winBack);
    }
    
    // Toit
    const roof = new THREE.Mesh(
        new THREE.BoxGeometry(0.52, 0.03, 0.36), 
        new THREE.MeshBasicMaterial({ 
            color: 0xfff1a8
        })
    );
    roof.position.y = 0.19;
    wagonContainer.add(roof);

    // Roues
    const wheelGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.04, 16);
    const wheelMat = new THREE.MeshBasicMaterial({ 
        color: 0xfff1a8
    });
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
scene.add(model);

function adjustCameraForScreen() {
    const w = window.innerWidth;
    if (w <= 480) {
        camera.position.set(0, 0, 7);
        model.scale.set(1.1, 1.1, 1.1);
        model.position.set(0, 0, 0);
    } else if (w <= 900) {
        camera.position.set(0, 0, 7.5);
        model.scale.set(1.2, 1.2, 1.2);
        model.position.set(0, 0, 0);
    } else {
        camera.position.set(-1, 0, 7);
        model.scale.set(1, 1, 1);
        model.position.set(-4.5, 0, 0);
    }
}

setRendererToCanvasSize();
adjustCameraForScreen();

window.addEventListener('resize', () => { 
    setRendererToCanvasSize(); 
    adjustCameraForScreen(); 
});

// Train animation variables
let trainProgress = 0;

// vitesse normale un peu plus rapide
const trainSpeedSlow = 0.0012;

// vitesse turbo vraiment hyper rapide
const trainSpeedFast = 0.05;

let currentSpeed = trainSpeedSlow;
let isAccelerating = false;
let fastLapCount = 0;
let hasExploded = false;

let particles = [];
let haussmannBuilding = null;
let lapStarted = false;

// Raycaster for interaction
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
    const intersects = raycaster.intersectObjects(wagonGroup.children, true);
    return intersects.length > 0;
}

// Mouse/Touch events
if (!isMobile) {
canvas.addEventListener('mousemove', (e) => {
    if (hasExploded) return;

    const isOverTrainZone = isInTrainZone(e.clientX, e.clientY);

    if (isOverTrainZone) {
        isAccelerating = true;
        canvas.style.cursor = 'pointer';
    } else {
        isAccelerating = false;
        canvas.style.cursor = 'default';
    }
});

    
    canvas.addEventListener('mouseleave', () => {
        isAccelerating = false;
        canvas.style.cursor = 'default';
    });
} else {
    canvas.addEventListener('touchstart', (e) => {
        if (hasExploded) return;
        e.preventDefault();
        const touch = e.touches[0];
        updateMousePosition(touch.clientX, touch.clientY);
        if (checkTrainIntersection()) {
            isAccelerating = true;
        }
    });
    
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        isAccelerating = false;
    });
    
    canvas.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        isAccelerating = false;
    });
    
canvas.addEventListener('touchmove', (e) => {
    if (hasExploded) return;
    e.preventDefault();
    const touch = e.touches[0];

    const isOverTrainZone = isInTrainZone(touch.clientX, touch.clientY);
    if (!isOverTrainZone) {
        isAccelerating = false;
    }
});


}

function createHaussmannBuilding() {
    const sculpture = new THREE.Group();
    const spiralPoints = [];
    const turns = 3;
    const height = 4;
    const radiusBase = 1.5;
    
    for (let i = 0; i <= 100; i++) {
        const t = i / 100;
        const angle = t * Math.PI * 2 * turns;
        const r = radiusBase * (1 - t * 0.3);
        const y = t * height - height / 2;
        spiralPoints.push(new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r));
    }
    
    const spiralCurve = new THREE.CatmullRomCurve3(spiralPoints);
    const spiralPath = new THREE.Mesh(
        new THREE.TubeGeometry(spiralCurve, 100, 0.08, 8, false),
        new THREE.MeshBasicMaterial({ 
            color: 0xfff1a8, 
            transparent: true, 
            opacity: 0.9
        })
    );
    sculpture.add(spiralPath);
    
    for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const point = spiralCurve.getPoint(t);
        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.15 + Math.sin(i) * 0.05, 16, 16),
            new THREE.MeshBasicMaterial({ 
                color: i % 3 === 0 ? 0xa8d0ff : i % 3 === 1 ? 0xf0c4df : 0xfff1a8,
                transparent: true,
                opacity: 0.85
            })
        );
        sphere.position.copy(point);
        sculpture.add(sphere);
    }
    
    const baseRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.8, 0.12, 16, 32),
        new THREE.MeshBasicMaterial({ 
            color: 0xb8d4f0, 
            transparent: true, 
            opacity: 0.7
        })
    );
    baseRing.position.y = -height / 2 - 0.3;
    baseRing.rotation.x = Math.PI / 2;
    sculpture.add(baseRing);
    
    const petalCount = 8;
    for (let i = 0; i < petalCount; i++) {
        const angle = (i / petalCount) * Math.PI * 2;
        const petal = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 0.15, 0.08),
            new THREE.MeshBasicMaterial({ 
                color: i % 2 === 0 ? 0xf0c4df : 0xeac0e1,
                transparent: true,
                opacity: 0.8
            })
        );
        petal.position.set(Math.cos(angle) * 0.5, height / 2 + 0.3, Math.sin(angle) * 0.5);
        petal.rotation.y = angle;
        petal.rotation.z = Math.PI / 6;
        sculpture.add(petal);
    }
    
    const flowerCenter = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 16, 16),
        new THREE.MeshBasicMaterial({ 
            color: 0xfff1a8
        })
    );
    flowerCenter.position.y = height / 2 + 0.3;
    sculpture.add(flowerCenter);
    
    for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 2 + Math.random() * 1;
        const yPos = (Math.random() - 0.5) * height;
        const particle = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.08, 0.08),
            new THREE.MeshBasicMaterial({ 
                color: [0xa8d0ff, 0xf0c4df, 0xfff1a8][Math.floor(Math.random() * 3)],
                transparent: true,
                opacity: 0.6
            })
        );
        particle.position.set(Math.cos(angle) * distance, yPos, Math.sin(angle) * distance);
        particle.userData.orbitSpeed = 0.001 + Math.random() * 0.002;
        particle.userData.orbitRadius = distance;
        particle.userData.orbitAngle = angle;
        particle.userData.yBase = yPos;
        sculpture.add(particle);
        sculpture.userData.orbitingParticles = sculpture.userData.orbitingParticles || [];
        sculpture.userData.orbitingParticles.push(particle);
    }
    
    sculpture.position.set(-4.5, 0, 0);
    return sculpture;
}

function createParticle(position, velocity) {
    const size = Math.random() * 0.15 + 0.05;
    const colors = [0xa8d0ff, 0xfff1a8, 0xb8d4f0, 0xc8def5, 0xf0c4df, 0xeac0e1, 0xffd4e5];
    const particle = new THREE.Mesh(
        new THREE.BoxGeometry(size, size, size), 
        new THREE.MeshBasicMaterial({ 
            color: colors[Math.floor(Math.random() * colors.length)]
        })
    );
    particle.position.copy(position);
    particle.userData.velocity = velocity;
    particle.userData.rotation = new THREE.Vector3(
        (Math.random() - 0.5) * 0.2, 
        (Math.random() - 0.5) * 0.2, 
        (Math.random() - 0.5) * 0.2
    );
    return particle;
}

function explodeTrain() {
    hasExploded = true;
    isAccelerating = false;
    canvas.style.cursor = 'default';
    
    wagonGroup.children.forEach(wagon => {
        const pos = wagon.position.clone();
        for (let i = 0; i < 60; i++) {
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 4,
                (Math.random() - 0.5) * 4,
                (Math.random() - 0.5) * 4
            );
            const particle = createParticle(pos, velocity);
            particles.push(particle);
            scene.add(particle);
        }
    });
    
    // Explosion centrale
    for (let i = 0; i < 300; i++) {
        const centerPos = new THREE.Vector3(-4.5, 0, 0);
        const angle = (i / 300) * Math.PI * 2;
        const elevation = (Math.random() - 0.5) * Math.PI;
        const speed = 3 + Math.random() * 6;
        
        const velocity = new THREE.Vector3(
            Math.cos(angle) * Math.cos(elevation) * speed,
            Math.sin(elevation) * speed,
            Math.sin(angle) * Math.cos(elevation) * speed
        );
        
        const particle = createParticle(centerPos, velocity);
        particles.push(particle);
        scene.add(particle);
    }
    
    wagonGroup.visible = false;
    rail.visible = false;
    railInner.visible = false;
    
    setTimeout(() => {
        haussmannBuilding = createHaussmannBuilding();
        scene.add(haussmannBuilding);
        haussmannBuilding.scale.set(0, 0, 0);
        const startTime = Date.now();
        function animateAppear() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / 2000, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            haussmannBuilding.scale.set(eased, eased, eased);
            if (progress < 1) requestAnimationFrame(animateAppear);
        }
        animateAppear();
    }, 1500);
}

function animate() {
    requestAnimationFrame(animate);
    
    if (!hasExploded) {
    if (isAccelerating) {
        // accélère beaucoup plus vite vers la vitesse turbo
        currentSpeed += (trainSpeedFast - currentSpeed) * 0.25;
    } else {
        // revient doucement vers la vitesse normale
        currentSpeed += (trainSpeedSlow - currentSpeed) * 0.06;
    }
        
        const oldProgress = trainProgress;
        trainProgress = (trainProgress + currentSpeed) % 1;
        
        const isInFastMode = currentSpeed > (trainSpeedSlow + trainSpeedFast) / 2;
        
        if (isInFastMode) {
            if (!lapStarted) {
                lapStarted = true;
            }
            if (oldProgress > 0.9 && trainProgress < 0.1) {
                fastLapCount += 1;
                
                if (fastLapCount >= 1.5) {
                    explodeTrain();
                }
            }
        } else {
            if (lapStarted) {
                if (fastLapCount >= 0.5) fastLapCount -= 0.05;
                if (fastLapCount < 0) {
                    fastLapCount = 0;
                    lapStarted = false;
                }
            }
        }

        wagonGroup.children.forEach(wagon => {
            const t = (trainProgress + wagon.userData.offset) % 1;
            const pos = circleCurve.getPoint(t);
            const tangent = circleCurve.getTangent(t);
            
            wagon.position.copy(pos);
            
            // Orientation correcte du wagon sur le cercle
            const angle = Math.atan2(tangent.y, tangent.x);
            wagon.rotation.z = angle;
        });

        // Rotation subtile du modèle entier
        model.rotation.y = Math.sin(Date.now() * 0.0003) * 0.1;
        model.rotation.x = Math.cos(Date.now() * 0.0002) * 0.05;
    } else {
        particles.forEach((particle, index) => {
            particle.position.add(particle.userData.velocity);
            particle.userData.velocity.y -= 0.002;
            particle.userData.velocity.multiplyScalar(0.995);
            particle.rotation.x += particle.userData.rotation.x;
            particle.rotation.y += particle.userData.rotation.y;
            particle.rotation.z += particle.userData.rotation.z;
            
            if (particle.position.y < -30 || Math.abs(particle.position.x) > 60 || Math.abs(particle.position.z) > 60) {
                scene.remove(particle);
                particles.splice(index, 1);
            }
        });
        
        if (haussmannBuilding) {
            haussmannBuilding.rotation.y += 0.003;
            
            if (Math.random() < 0.015) {
                const angle = Math.random() * Math.PI * 2;
                const distance = 3 + Math.random() * 2;
                const colors = [0xa8d0ff, 0xf0c4df, 0xfff1a8, 0xb8d4f0, 0xeac0e1];
                
                const fallingCube = new THREE.Mesh(
                    new THREE.BoxGeometry(0.1, 0.1, 0.1),
                    new THREE.MeshBasicMaterial({ 
                        color: colors[Math.floor(Math.random() * colors.length)],
                        transparent: true,
                        opacity: 0.8
                    })
                );
                fallingCube.position.set(
                    Math.cos(angle) * distance,
                    3 + Math.random() * 2,
                    Math.sin(angle) * distance
                );
                fallingCube.userData.velocity = new THREE.Vector3(0, -0.02, 0);
                fallingCube.userData.rotation = new THREE.Vector3(
                    (Math.random() - 0.5) * 0.1,
                    (Math.random() - 0.5) * 0.1,
                    (Math.random() - 0.5) * 0.1
                );
                particles.push(fallingCube);
                scene.add(fallingCube);
            }
            
            if (haussmannBuilding.userData.orbitingParticles) {
                haussmannBuilding.userData.orbitingParticles.forEach(p => {
                    p.userData.orbitAngle += p.userData.orbitSpeed;
                    p.position.x = Math.cos(p.userData.orbitAngle) * p.userData.orbitRadius;
                    p.position.z = Math.sin(p.userData.orbitAngle) * p.userData.orbitRadius;
                    p.position.y = p.userData.yBase + Math.sin(Date.now() * 0.001 + p.userData.orbitAngle) * 0.2;
                    p.rotation.x += 0.01;
                    p.rotation.y += 0.01;
                });
            }
        }
    }

    renderer.render(scene, camera);
}
animate();

// Scroll animations
window.addEventListener('scroll', () => {
    const header = document.getElementById('header');
    if(window.scrollY > 50) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
    
    const intro = document.getElementById('projectsIntro');
    const rect = intro.getBoundingClientRect();
    if(rect.top < window.innerHeight * 0.8) intro.classList.add('visible');
});

// ===== ADMIN FUNCTIONALITY =====
const adminBtn = document.getElementById('adminBtn');
const adminModal = document.getElementById('adminModal');
const closeModal = document.getElementById('closeModal');
const pinInputs = document.querySelectorAll('.pin-input');
const pinError = document.getElementById('pinError');
const pinScreen = document.getElementById('pinScreen');
const adminPanel = document.getElementById('adminPanel');
const projectForm = document.getElementById('projectForm');
const gallery = document.getElementById('gallery');
const projectImage = document.getElementById('projectImage');
const imagePreview = document.getElementById('imagePreview');

let isAdminMode = false;
let projects = [];

adminBtn.addEventListener('click', () => {
    adminModal.classList.add('active');
    pinInputs[0].focus();
});

closeModal.addEventListener('click', () => {
    adminModal.classList.remove('active');
    resetPinInputs();
});

adminModal.addEventListener('click', (e) => {
    if (e.target === adminModal) {
        adminModal.classList.remove('active');
        resetPinInputs();
    }
});

pinInputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
        if (e.target.value) {
            if (index < pinInputs.length - 1) {
                pinInputs[index + 1].focus();
            } else {
                checkPin();
            }
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
            pinInputs[index - 1].focus();
        }
    });
});

function checkPin() {
    const pin = Array.from(pinInputs).map(input => input.value).join('');
    if (pin === '0000') {
        pinScreen.style.display = 'none';
        adminPanel.classList.add('active');
        pinError.classList.remove('show');
        isAdminMode = true;
        document.body.classList.add('admin-mode');
    } else {
        pinError.classList.add('show');
        resetPinInputs();
    }
}

function resetPinInputs() {
    pinInputs.forEach(input => input.value = '');
    pinError.classList.remove('show');
    pinInputs[0].focus();
}

projectImage.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            imagePreview.src = event.target.result;
            imagePreview.classList.add('show');
        };
        reader.readAsDataURL(file);
    }
});

projectForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const title = document.getElementById('projectTitle').value;
    const desc = document.getElementById('projectDesc').value;
    const imgSrc = imagePreview.src;

    const project = {
        id: Date.now(),
        title,
        description: desc,
        image: imgSrc
    };

    projects.push(project);
    renderProjects();
    
    projectForm.reset();
    imagePreview.classList.remove('show');
    adminModal.classList.remove('active');
    pinScreen.style.display = 'block';
    adminPanel.classList.remove('active');
    resetPinInputs();
});

function renderProjects() {
    gallery.innerHTML = '';
    
    if (projects.length === 0) {
        gallery.innerHTML = '<div class="empty-state">Aucun projet pour le moment</div>';
        return;
    }

    projects.forEach(project => {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.innerHTML = `
            <img src="${project.image}" alt="${project.title}">
            <div class="project-info">
                <h3>${project.title}</h3>
                <p>${project.description}</p>
            </div>
            <button class="delete-btn" onclick="deleteProject(${project.id})">×</button>
        `;
        gallery.appendChild(card);
    });
}

window.deleteProject = function(id) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) {
        projects = projects.filter(p => p.id !== id);
        renderProjects();
    }
};

function isInTrainZone(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const relX = (clientX - rect.left) / rect.width;   // 0 = gauche, 1 = droite
    const relY = (clientY - rect.top) / rect.height;   // 0 = haut, 1 = bas

    // zone approx. où il y a le train (à ajuster si tu veux)
    return (
        relX > 0.0 && relX < 0.6 &&   // partie gauche de la scène
        relY > 0.2 && relY < 0.8      // milieu vertical
    );
}

// ==========================================================
// NOUVEAU CODE : SYNCHRONISATION VIDÉO AVEC LE SCROLL
// ==========================================================

const scrollVideo = document.getElementById('scrollAnimation');
const videoSection = document.querySelector('.video-scroll-section');

if (scrollVideo && videoSection) {
    // Attendre que la vidéo soit prête (méta-données chargées)
    scrollVideo.addEventListener('loadedmetadata', () => {
        
        function updateVideoScroll() {
            // 1. Déterminer la position relative de la section vidéo
            const rect = videoSection.getBoundingClientRect();

            // La lecture commence quand le haut de la section arrive en haut de l'écran (rect.top = 0)
            // La lecture se termine quand le bas de la section arrive en bas de l'écran (rect.bottom = window.innerHeight)
            
            // Hauteur totale de l'espace de défilement (ex: 400vh = 4 * window.innerHeight)
            const scrollAreaHeight = videoSection.offsetHeight - window.innerHeight;
            
            // La position de défilement à l'intérieur de la zone (commence à 0 et va jusqu'à scrollAreaHeight)
            let scrollPositionInArea = -rect.top;

            // 2. Calculer la progression (entre 0 et 1)
            let progress = scrollPositionInArea / scrollAreaHeight;

            // Clamper la valeur entre 0 et 1
            progress = Math.min(1, Math.max(0, progress));

            // 3. Synchroniser la position de la vidéo
            // video.duration est la durée totale de la vidéo en secondes.
            scrollVideo.currentTime = scrollVideo.duration * progress;
        }

        // 4. Attacher l'événement de défilement
        window.addEventListener('scroll', updateVideoScroll);

        // 5. Exécuter une première fois
        updateVideoScroll();
    });
}

renderProjects();