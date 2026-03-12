// ============================================================
// STERNY — Rate Limiter (client-side)
// ============================================================
// Protection contre les abus : brute-force, spam, double-soumission
// Usage : if (!RateLimiter.check('login', 5, 60000)) return;
//         → max 5 tentatives par fenêtre de 60 secondes
// ============================================================

const RateLimiter = (() => {
    // Stockage en mémoire des tentatives : { actionName: [timestamp, ...] }
    const attempts = {};

    // Stockage persistant (survit au refresh) pour les actions critiques
    const PERSISTENT_KEY = 'sterny_rate_limits';

    function loadPersistent() {
        try {
            const stored = localStorage.getItem(PERSISTENT_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch { return {}; }
    }

    function savePersistent(data) {
        try {
            localStorage.setItem(PERSISTENT_KEY, JSON.stringify(data));
        } catch { /* silently fail */ }
    }

    /**
     * Vérifie si une action est autorisée selon le rate limit.
     * @param {string} action - Nom unique de l'action (ex: 'login', 'signup', 'candidature')
     * @param {number} maxAttempts - Nombre max de tentatives dans la fenêtre
     * @param {number} windowMs - Fenêtre de temps en millisecondes
     * @param {object} options - { persistent: bool, message: string }
     * @returns {boolean} true si autorisé, false si bloqué
     */
    function check(action, maxAttempts, windowMs, options = {}) {
        const now = Date.now();
        const store = options.persistent ? loadPersistent() : attempts;

        if (!store[action]) store[action] = [];

        // Nettoyer les tentatives hors fenêtre
        store[action] = store[action].filter(t => now - t < windowMs);

        if (store[action].length >= maxAttempts) {
            const waitSec = Math.ceil((store[action][0] + windowMs - now) / 1000);
            const message = options.message ||
                `Trop de tentatives. Réessaie dans ${waitSec} seconde${waitSec > 1 ? 's' : ''}.`;
            alert(message);

            if (options.persistent) savePersistent(store);
            return false;
        }

        store[action].push(now);
        if (options.persistent) savePersistent(store);
        return true;
    }

    /**
     * Réinitialise le compteur d'une action (après succès par exemple).
     */
    function reset(action) {
        delete attempts[action];
        const stored = loadPersistent();
        delete stored[action];
        savePersistent(stored);
    }

    /**
     * Désactive un bouton pendant X ms pour éviter le double-clic.
     * @param {HTMLElement} btn - Le bouton à protéger
     * @param {number} delayMs - Durée de désactivation (défaut 2000ms)
     * @param {string} loadingText - Texte pendant le chargement (optionnel)
     */
    function disableButton(btn, delayMs = 2000, loadingText = null) {
        if (!btn || btn.disabled) return false;
        btn.disabled = true;
        const originalText = btn.textContent;
        if (loadingText) btn.textContent = loadingText;

        setTimeout(() => {
            btn.disabled = false;
            btn.textContent = originalText;
        }, delayMs);
        return true;
    }

    /**
     * Désactive un bouton et le réactive manuellement (pour les actions async).
     * Retourne une fonction enableBtn() à appeler quand l'action est terminée.
     */
    function disableButtonAsync(btn, loadingText = null) {
        if (!btn || btn.disabled) return null;
        btn.disabled = true;
        const originalText = btn.textContent;
        const originalHTML = btn.innerHTML;
        if (loadingText) btn.textContent = loadingText;

        return function enableBtn() {
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        };
    }

    return { check, reset, disableButton, disableButtonAsync };
})();

// ============================================================
// Anti double-clic automatique sur boutons critiques
// ============================================================
// Tout bouton avec onclick qui contient des mots-clés critiques
// sera automatiquement protégé contre le double-clic (500ms).
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('button, [type="submit"]');
        if (!btn || btn.disabled) return;

        // Vérifier si c'est un bouton critique (paiement, signature, suppression, envoi)
        const text = (btn.textContent || '').toLowerCase();
        const onclick = (btn.getAttribute('onclick') || '').toLowerCase();
        const criticalWords = ['signer', 'payer', 'supprimer', 'envoyer', 'confirmer', 'valider', 'publier'];

        const isCritical = criticalWords.some(w => text.includes(w) || onclick.includes(w));
        if (!isCritical) return;

        // Empêcher le double-clic pendant 1.5s
        if (btn.dataset.clicking === 'true') {
            e.preventDefault();
            e.stopImmediatePropagation();
            return;
        }

        btn.dataset.clicking = 'true';
        setTimeout(() => {
            btn.dataset.clicking = 'false';
        }, 1500);
    }, true); // capture phase pour intercepter avant onclick
});

