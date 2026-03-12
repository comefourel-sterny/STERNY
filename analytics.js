// ============================================================
// STERNY — Analytics (configurable)
// ============================================================
// Remplacer MEASUREMENT_ID par ton ID Google Analytics (G-XXXXXXXXXX)
// ou utiliser Plausible/autre outil en modifiant ce fichier.
//
// Inclure dans chaque page HTML :
//   <script src="analytics.js"></script>
// ============================================================

(function() {
    // ---- CONFIGURATION ----
    const GA_MEASUREMENT_ID = ''; // ← Mettre ton ID GA4 ici (ex: 'G-ABC123XYZ')

    // Si pas d'ID configuré, ne rien charger
    if (!GA_MEASUREMENT_ID) return;

    // ---- Google Analytics 4 (gtag.js) ----
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;

    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID, {
        anonymize_ip: true,        // RGPD : anonymiser les IP
        cookie_flags: 'SameSite=None;Secure',
        send_page_view: true
    });

    // ---- Événements personnalisés STERNY ----
    window.sternyTrack = function(eventName, params = {}) {
        if (window.gtag) {
            gtag('event', eventName, params);
        }
    };
})();
