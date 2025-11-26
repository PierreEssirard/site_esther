// javascript/girlCharacter.js - VERSION SANS ANIMATIONS

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let girlCharacter = null;
let isLoaded = false;

/**
 * Charge le modèle GLTF du personnage (sans animations).
 */
export function loadGirlCharacter(scene) {
    console.log('🔄 Chargement du personnage...');
    const loader = new GLTFLoader();
    
    loader.load(
        'models/mei.glb', 
        (gltf) => {
            console.log('✅ Modèle chargé avec succès!');
            
            girlCharacter = gltf.scene;
            
            // Calculer les dimensions pour un bon positionnement
            const box = new THREE.Box3().setFromObject(girlCharacter);
            const size = box.getSize(new THREE.Vector3());
            
            // Échelle et position
            girlCharacter.scale.setScalar(0.25);
            girlCharacter.position.set(-20, -1.8, 0); 
            girlCharacter.rotation.y = Math.PI / 2;
            girlCharacter.visible = true;
            
            console.log('📏 Dimensions du modèle:', size);
            
            // Appliquer les matériaux
            girlCharacter.traverse(o => {
                if (o.isMesh) {
                    console.log('🎨 Mesh:', o.name);
                    o.castShadow = true;
                    o.receiveShadow = true;
                    
                    if (o.material) {
                        o.material = o.material.clone();
                        o.material.flatShading = true;
                    }
                }
            });
            
            scene.add(girlCharacter);
            isLoaded = true;
            
            console.log('✅ Personnage ajouté à la scène');
            console.log('ℹ️  Animations:', gltf.animations.length);
        },
        (progress) => {
            const percent = (progress.loaded / progress.total * 100).toFixed(2);
            console.log(`⏳ Chargement: ${percent}%`);
        },
        (error) => {
            console.error('❌ Erreur de chargement:', error);
            console.error('Vérifiez que models/mei.glb existe');
        }
    );
}

/**
 * Mise à jour du personnage (pas d'animations).
 */
export function updateGirlCharacter(deltaTime) {
    // Pas d'animations à mettre à jour
    // On peut ajouter des rotations manuelles si besoin
}

/**
 * "Animation" manuelle par rotation/position.
 * Aucune vraie animation, juste du déplacement.
 */
export function playAnimation(name, fadeDuration = 0.2) {
    // Pas d'animations réelles, on peut ignorer ou faire des rotations simples
    if (girlCharacter) {
        console.log(`ℹ️  État: ${name} (pas d'animation réelle)`);
    }
}

/**
 * Renvoie le personnage.
 */
export function getGirlCharacter() {
    return girlCharacter;
}

/**
 * Vérifie si le personnage est chargé.
 */
export function isCharacterLoaded() {
    return isLoaded;
}

// Clock (même si pas utilisé pour les animations)
export const clock = new THREE.Clock();