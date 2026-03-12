/**
 * STERNY — Bandeau Cookies RGPD
 * Script autonome : injecte HTML + CSS + logique au chargement.
 * Utilisation : <script src="cookie-banner.js"></script> (avant </body>)
 */
(function () {
    'use strict';

    // Si l'utilisateur a déjà fait son choix, on ne fait rien
    if (localStorage.getItem('sterny_cookie_consent')) return;

    // ── CSS ──────────────────────────────────────────────
    var css = document.createElement('style');
    css.textContent = [
        '#sterny-cookie-banner {',
        '  position: fixed;',
        '  bottom: 0;',
        '  left: 0;',
        '  right: 0;',
        '  z-index: 99999;',
        '  background: #fff;',
        '  border-top: 1.5px solid #E8EAF0;',
        '  box-shadow: 0 -4px 24px rgba(0,0,0,0.08);',
        '  padding: 20px 24px;',
        '  font-family: "DM Sans", sans-serif;',
        '  animation: sterny-slide-up 0.4s ease;',
        '}',
        '@keyframes sterny-slide-up {',
        '  from { transform: translateY(100%); opacity: 0; }',
        '  to   { transform: translateY(0);    opacity: 1; }',
        '}',
        '#sterny-cookie-banner .cookie-inner {',
        '  max-width: 1100px;',
        '  margin: 0 auto;',
        '  display: flex;',
        '  align-items: center;',
        '  gap: 24px;',
        '  flex-wrap: wrap;',
        '}',
        '#sterny-cookie-banner .cookie-text {',
        '  flex: 1;',
        '  min-width: 280px;',
        '  font-size: 14px;',
        '  line-height: 1.6;',
        '  color: #1E293B;',
        '}',
        '#sterny-cookie-banner .cookie-text a {',
        '  color: #E8622A;',
        '  text-decoration: underline;',
        '}',
        '#sterny-cookie-banner .cookie-buttons {',
        '  display: flex;',
        '  gap: 12px;',
        '  flex-shrink: 0;',
        '}',
        '#sterny-cookie-banner .cookie-btn {',
        '  padding: 10px 24px;',
        '  border-radius: 12px;',
        '  font-size: 14px;',
        '  font-weight: 600;',
        '  font-family: "DM Sans", sans-serif;',
        '  cursor: pointer;',
        '  transition: all 0.2s ease;',
        '  border: none;',
        '}',
        '#sterny-cookie-banner .cookie-btn-accept {',
        '  background: #E8622A;',
        '  color: #fff;',
        '}',
        '#sterny-cookie-banner .cookie-btn-accept:hover {',
        '  background: #d4571f;',
        '}',
        '#sterny-cookie-banner .cookie-btn-refuse {',
        '  background: #fff;',
        '  color: #1E293B;',
        '  border: 1.5px solid #E8EAF0;',
        '}',
        '#sterny-cookie-banner .cookie-btn-refuse:hover {',
        '  border-color: #E8622A;',
        '  color: #E8622A;',
        '}',
        '@media (max-width: 600px) {',
        '  #sterny-cookie-banner .cookie-inner {',
        '    flex-direction: column;',
        '    align-items: stretch;',
        '    gap: 16px;',
        '  }',
        '  #sterny-cookie-banner .cookie-buttons {',
        '    justify-content: stretch;',
        '  }',
        '  #sterny-cookie-banner .cookie-btn {',
        '    flex: 1;',
        '    text-align: center;',
        '  }',
        '}'
    ].join('\n');
    document.head.appendChild(css);

    // ── HTML ─────────────────────────────────────────────
    var banner = document.createElement('div');
    banner.id = 'sterny-cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Consentement cookies');
    banner.innerHTML = [
        '<div class="cookie-inner">',
        '  <div class="cookie-text">',
        '    Ce site utilise des cookies essentiels au fonctionnement de la plateforme ',
        '    (authentification, préférences). Aucun cookie publicitaire n\'est utilisé. ',
        '    En savoir plus dans notre <a href="/politique-confidentialite.html">politique de confidentialité</a>.',
        '  </div>',
        '  <div class="cookie-buttons">',
        '    <button class="cookie-btn cookie-btn-refuse" id="cookieRefuse">Refuser</button>',
        '    <button class="cookie-btn cookie-btn-accept" id="cookieAccept">Accepter</button>',
        '  </div>',
        '</div>'
    ].join('\n');

    // ── Injection ────────────────────────────────────────
    document.body.appendChild(banner);

    // ── Logique ──────────────────────────────────────────
    function closeBanner(choice) {
        localStorage.setItem('sterny_cookie_consent', choice);
        localStorage.setItem('sterny_cookie_consent_date', new Date().toISOString());
        banner.style.animation = 'sterny-slide-up 0.3s ease reverse forwards';
        setTimeout(function () {
            banner.remove();
        }, 300);
    }

    document.getElementById('cookieAccept').addEventListener('click', function () {
        closeBanner('accepted');
    });

    document.getElementById('cookieRefuse').addEventListener('click', function () {
        closeBanner('refused');
    });
})();
