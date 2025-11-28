// javascript/phase2Brush.js

import { getBrushColors } from './adminManager.js'; // NOUVEAU: Import pour les couleurs dynamiques

let paintBrush = null;
let brushPath = null;
let strokes = [];
const brushState = { position: new THREE.Vector3(-10, 0, 0) };

let currentBrushColors = {
    brushHandle: 0x333333,
    brushBristles: 0xf0c4df,
    brushStroke: 0xc84508 // Couleur du tracé (par défaut à la couleur Phase 2)
};

/**
 * Crée l'objet 3D du pinceau.
 * @param {Object} colors - Couleurs dynamiques du pinceau.
 */
function createPaintbrush(colors) {
    const brushGroup = new THREE.Group();
    
    // 1. Manche/Handle
    const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.08, 2.2, 16), 
        new THREE.MeshStandardMaterial({ 
            color: colors.brushHandle, 
            roughness: 0.5 
        })
    );
    handle.position.y = 1.1; 
    brushGroup.add(handle);
    
    // 2. Vilebrequin/Ferrule (Métal) - Conserve la couleur fixe dorée
    const ferrule = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.06, 0.4, 16), 
        new THREE.MeshStandardMaterial({ 
            color: 0xd4af37, // Couleur métal fixe
            metalness: 0.8, 
            roughness: 0.2 
        })
    );
    ferrule.position.y = 0.0; 
    brushGroup.add(ferrule);
    
    // 3. Mine/Bristles
    const bristles = new THREE.Mesh(
        new THREE.ConeGeometry(0.06, 0.5, 16), 
        new THREE.MeshStandardMaterial({ 
            color: colors.brushBristles, // Couleur dynamique
            side: THREE.DoubleSide
        })
    );
    bristles.position.y = -0.45; 
    bristles.rotation.x = Math.PI; 
    brushGroup.add(bristles);
    
    // Règle la visibilité initiale à false
    brushGroup.visible = false;
    
    brushGroup.rotation.x = -Math.PI / 4; 
    return brushGroup;
}

/**
 * Initialise le pinceau et charge le texte "Mes dessins" en courbes 3D.
 * @param {THREE.Group} phase2Group
 */
export async function initPhase2(phase2Group) {
    // Étape 1: Charger les couleurs dynamiques du pinceau
    try {
        currentBrushColors = await getBrushColors();
    } catch (e) {
        console.error("Erreur chargement couleurs pinceau, utilisation des couleurs par défaut.", e);
    }

    // Étape 2: Créer le pinceau avec les couleurs
    paintBrush = createPaintbrush(currentBrushColors);
    phase2Group.add(paintBrush);

    // Étape 3: Créer les tracés de texte
    const fontLoader = new THREE.FontLoader();
    fontLoader.load('https://threejs.org/examples/fonts/gentilis_bold.typeface.json', function (font) {
        // MODIFICATION: Réduction de la taille du texte de 2.0 à 1.5 pour l'effet "beaucoup trop grand" sur mobile.
        const textShape = font.generateShapes('Mes dessins', 1.5); 
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
        
        const paintMat = new THREE.MeshBasicMaterial({ 
            color: currentBrushColors.brushStroke, // COULEUR DYNAMIQUE DU TRACÉ DE TEXTE
            transparent: true, 
            opacity: 0, // Opacité initiale à 0 pour tous les tracés
            side: THREE.DoubleSide
        });

        rawContours.forEach((contour, i) => {
            const pts3D = contour.map(p => new THREE.Vector3(p.x + xMid, p.y, 0));
            const curve = new THREE.CatmullRomCurve3(pts3D);
            const len = curve.getLength();
            const segs = Math.floor(len * 50); 
            const geo = new THREE.TubeGeometry(curve, Math.max(20, segs), 0.035, 8, false);
            const mesh = new THREE.Mesh(geo, paintMat.clone());
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
        // Position par défaut
        phase2Group.position.y = -1; 
    });
}

/**
 * Met à jour le dessin du pinceau en fonction de la progression du scroll.
 * @param {number} scrollProgress - Progression du scroll dans la section (0 à 1)
 * @param {number} phase2to3Transition - Facteur de transition vers la phase 3 (0 à 1)
 * @param {THREE.PointLight} light2 - Lumière à suivre
 */
export function updatePhase2(scrollProgress, phase2to3Transition, light2) {
    if (paintBrush && brushPath && strokes.length > 0) {
        const p = scrollProgress;
        
        // NOUVEAU: Facteur d'apparition progressif
        // Le pinceau apparaît sur les 5 premiers pourcents (0.0 à 0.05) du scroll de la section.
        // On s'assure qu'il est visible avant de commencer le tracé.
        const appearanceFactor = Math.min(1, p / 0.05); 
        
        // La visibilité est basée sur l'apparition (si le scroll a commencé)
        paintBrush.visible = appearanceFactor > 0.001; 
        paintBrush.parent.visible = true; // S'assurer que le groupe parent est visible

        // 1. Position du Pinceau
        const targetPos = brushPath.getPointAt(p);
        const brushOffset = new THREE.Vector3(0, 0.4, 0.4); 
        const finalPos = targetPos.clone().add(brushOffset);
        brushState.position.lerp(finalPos, 0.1);
        paintBrush.position.copy(brushState.position);
        paintBrush.rotation.set(-Math.PI / 4, 0, 0);
        const deltaX = targetPos.x - brushState.position.x;
        paintBrush.rotation.z = -deltaX * 2.0;

        // 2. Traçage du Texte
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
        
        // 3. Lumière
        light2.position.copy(brushState.position); 
        light2.position.z += 1;
        
        // 4. Contrôle de l'opacité (Apparition * Transition Phase 3)
        const finalOpacity = appearanceFactor * (1 - phase2to3Transition);
        
        // Appliquer l'opacité au pinceau
        paintBrush.traverse(o => {
            if (o.material) {
                o.material.transparent = true;
                o.material.opacity = finalOpacity;
            }
        });

        // Appliquer l'opacité aux tracés (strokes)
        strokes.forEach(s => { 
            s.mesh.material.transparent = true;
            s.mesh.material.opacity = finalOpacity; 
        });
    }
    
    // 5. Effet vortex de transition vers Phase 3
    if (phase2to3Transition > 0) {
        const t = Math.min(1, phase2to3Transition);
        
        // Vortex: rotation, retrait en Z, et réduction de taille
        paintBrush.parent.rotation.y = t * Math.PI * 4; 
        paintBrush.parent.scale.setScalar(1 - t);       
        paintBrush.parent.position.z = t * 5;           
        
        // L'opacité est déjà gérée par le calcul `finalOpacity` ci-dessus
        
        if (t >= 1) {
            // Désactiver le groupe entier une fois la transition terminée
            paintBrush.parent.visible = false;
        }

    } else {
        // État normal
        if (paintBrush) { // Vérification de sécurité
            paintBrush.parent.rotation.y = 0;
            paintBrush.parent.scale.setScalar(1);
            paintBrush.parent.position.z = 0;
            
            // Le parent reste visible s'il n'y a pas de transition Phase 3
            paintBrush.parent.visible = true;
            // La visibilité du pinceau et l'opacité sont gérées par `appearanceFactor`
        }
    }
}