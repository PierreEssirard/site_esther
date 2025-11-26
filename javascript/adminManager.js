// javascript/adminManager.js

const ADMIN_CODE = '0000'; // Code secret de l'administrateur
let isAdminLoggedIn = false; // État de connexion

/**
 * Initialise la logique du bouton admin et de la modal.
 * @param {HTMLElement} adminBtn - Le bouton déclencheur.
 * @param {HTMLElement} adminModal - La modal de connexion.
 * @param {HTMLElement} closeModal - Le bouton de fermeture de la modal.
 */
export function initAdmin(adminBtn, adminModal, closeModal) {
    if (!adminBtn || !adminModal || !closeModal) {
        console.error('Éléments Admin non trouvés dans le DOM.');
        return;
    }

    const pinInputs = Array.from(adminModal.querySelectorAll('.pin-input'));
    const pinScreen = document.getElementById('pinScreen');
    const adminPanel = document.getElementById('adminPanel');
    const pinError = document.getElementById('pinError');

    // Réinitialisation de l'état visuel à l'ouverture de la modal
    function resetModal() {
        pinInputs.forEach(input => input.value = '');
        pinError.style.opacity = 0;
        pinScreen.style.display = 'block';
        adminPanel.style.display = 'none';
        
        // Assurer le focus sur le premier champ après un petit délai
        setTimeout(() => {
            if (pinInputs.length > 0) {
                 pinInputs[0].focus();
            }
        }, 100); 
    }

    // Événement d'ouverture de la modal
    adminBtn.addEventListener('click', () => {
        adminModal.classList.add('active');
        if (isAdminLoggedIn) {
            // Si déjà connecté, afficher le panneau directement
            pinScreen.style.display = 'none';
            adminPanel.style.display = 'block';
        } else {
            resetModal();
        }
    });

    // Événement de fermeture de la modal
    closeModal.addEventListener('click', () => {
        adminModal.classList.remove('active');
    });

    // Gestion de la saisie des PINs
    pinInputs.forEach((input, index) => {
        input.addEventListener('input', () => {
            // Passe automatiquement au champ suivant si un caractère est entré
            if (input.value.length === 1 && index < pinInputs.length - 1) {
                pinInputs[index + 1].focus();
            }
            attemptLogin();
        });

        // Gérer le retour arrière (Backspace)
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && input.value === '' && index > 0) {
                pinInputs[index - 1].focus();
            }
        });
        
        // Empêcher l'entrée de caractères non numériques (juste au cas où)
        input.addEventListener('keypress', (e) => {
            // Seuls les chiffres sont autorisés
            if (e.key === ' ' || isNaN(parseInt(e.key))) {
                e.preventDefault();
            }
        });
    });

    function attemptLogin() {
        const enteredCode = pinInputs.map(input => input.value).join('');

        if (enteredCode.length === ADMIN_CODE.length) {
            if (enteredCode === ADMIN_CODE) {
                isAdminLoggedIn = true;
                pinError.textContent = 'Connexion réussie !';
                pinError.style.color = 'green';
                pinError.style.opacity = 1;

                // IMPORTANT : Bascule d'affichage vers le panneau d'administration après succès
                setTimeout(() => {
                    pinScreen.style.display = 'none';
                    adminPanel.style.display = 'block';
                    pinError.style.opacity = 0; 
                }, 500); // Laisse 0.5s pour voir le message "Connexion réussie"

            } else {
                isAdminLoggedIn = false;
                pinError.textContent = 'Code incorrect.';
                pinError.style.color = 'red';
                pinError.style.opacity = 1;
                
                // Effacer tous les champs après un échec
                setTimeout(() => {
                    pinInputs.forEach(input => input.value = '');
                    if (pinInputs.length > 0) {
                         pinInputs[0].focus();
                    }
                }, 300);
            }
        } else {
            // Masquer le message d'erreur si le code est incomplet
            pinError.style.opacity = 0;
        }
    }
}

/**
 * Renvoie l'état de connexion de l'administrateur.
 * @returns {boolean}
 */
export function getAdminStatus() {
    return isAdminLoggedIn;
}