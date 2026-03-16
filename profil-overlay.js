// ============================================================
// STERNY — Profil Overlay Component
// ============================================================
// Usage : inclure <script src="profil-overlay.js"></script> sur la page
// Appeler : ouvrirProfilOverlay(userId)
// ============================================================
// Niveaux de visibilité :
//   'none'         → aucun lien → email/téléphone masqués
//   'candidature'  → candidature en cours → email visible
//   'contrat'      → contrat signé → email + téléphone visibles
// ============================================================

(function () {
    'use strict';

    // ─── Injecter le CSS ───
    const style = document.createElement('style');
    style.textContent = `
        /* OVERLAY BACKDROP */
        .profil-overlay-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(30, 45, 61, 0.45);
            z-index: 99990;
            display: none;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.22s ease;
        }
        .profil-overlay-backdrop.visible {
            opacity: 1;
            display: flex;
            pointer-events: auto;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        /* CARTE PROFIL — même format que connexion/inscription */
        .profil-overlay-panel {
            position: relative;
            width: 100%;
            max-width: 460px;
            max-height: 85vh;
            background: white;
            z-index: 99991;
            overflow-y: auto;
            border-radius: 20px;
            box-shadow: 0 6px 28px rgba(232, 98, 42, 0.12);
            border: 1.5px solid #E8EAF0;
            transform: scale(0.96);
            opacity: 0;
            transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.22s ease;
        }
        .profil-overlay-panel.open {
            transform: scale(1);
            opacity: 1;
        }

        /* Scrollbar discrète */
        .profil-overlay-panel::-webkit-scrollbar { width: 4px; }
        .profil-overlay-panel::-webkit-scrollbar-track { background: transparent; }
        .profil-overlay-panel::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }

        /* BOUTON FERMER */
        .po-close {
            position: absolute;
            top: 16px;
            right: 16px;
            width: 28px;
            height: 28px;
            border: none;
            background: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
            transition: background 0.15s;
            z-index: 3;
            padding: 0;
        }
        .po-close:hover { background: #f3f4f6; }
        .po-close svg { width: 18px; height: 18px; color: #6b7280; }

        /* HEADER */
        .po-header {
            padding: 36px 36px 0;
            text-align: center;
        }
        .po-avatar {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: #1e2d3d;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
            font-weight: 700;
            color: white;
            overflow: hidden;
            margin: 0 auto 12px;
            letter-spacing: 0.5px;
        }
        .po-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .po-name {
            font-size: 20px;
            font-weight: 700;
            color: #1e2d3d;
            margin: 0 0 4px;
            line-height: 1.2;
        }
        .po-role-label {
            font-size: 11px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-bottom: 6px;
        }
        .po-badge-row {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            flex-wrap: wrap;
            margin-bottom: 4px;
        }
        .po-badge-verifie {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: #ecfdf5;
            color: #059669;
            font-size: 11px;
            font-weight: 600;
            padding: 3px 10px;
            border-radius: 20px;
        }
        .po-badge-verifie svg { width: 12px; height: 12px; }
        .po-badge-documents {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: #eff6ff;
            color: #2563eb;
            font-size: 11px;
            font-weight: 600;
            padding: 3px 10px;
            border-radius: 20px;
        }
        .po-badge-documents svg { width: 12px; height: 12px; }

        /* NOTE ÉTOILES */
        .po-rating {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            margin: 8px 0 0;
        }
        .po-stars { color: #f59e0b; font-size: 14px; letter-spacing: 1px; }
        .po-rating-text { font-size: 12px; color: #6b7280; font-weight: 500; }

        /* BOUTONS ACTION */
        .po-actions {
            display: flex;
            gap: 10px;
            padding: 20px 36px 16px;
        }
        .po-btn {
            flex: 1;
            padding: 10px 0;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s;
            text-decoration: none;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            font-family: inherit;
            text-align: center;
        }
        .po-btn-primary {
            background: #e8642a;
            color: #fff;
            border: none;
        }
        .po-btn-primary:hover { background: #d4571f; }
        .po-btn-secondary {
            background: #fff;
            color: #1e2d3d;
            border: 1.5px solid #e2e8f0;
        }
        .po-btn-secondary:hover { border-color: #e8642a; color: #e8642a; }

        /* TRUST PILLS (sous le rôle) */
        .po-trust-pills {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            flex-wrap: wrap;
            margin: 6px 0 2px;
        }
        .po-trust-pill {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 11px;
            font-weight: 500;
            color: #059669;
            background: #f0fdf4;
            padding: 3px 10px;
            border-radius: 20px;
        }
        .po-trust-pill svg { width: 12px; height: 12px; }

        /* SECTIONS */
        .po-section {
            padding: 16px 36px;
            border-top: 1px solid #f3f4f6;
        }
        .po-section-title {
            font-size: 11px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-bottom: 10px;
        }

        /* CONTACT LINES */
        .po-contact-lines {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .po-contact-line {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 13px;
            color: #1e2d3d;
            line-height: 1.4;
        }
        .po-contact-line svg {
            width: 16px;
            height: 16px;
            color: #94a3b8;
            flex-shrink: 0;
        }
        .po-contact-label {
            font-weight: 600;
            color: #1e2d3d;
            min-width: 75px;
        }
        .po-contact-value {
            color: #475569;
        }
        .po-contact-value a {
            color: #e8642a;
            text-decoration: none;
            font-weight: 500;
        }
        .po-contact-value a:hover { text-decoration: underline; }
        .po-contact-hidden {
            color: #94a3b8;
            font-style: italic;
            font-size: 12px;
        }

        /* INFO LINES */
        .po-info-lines {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .po-info-line {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 13px;
            color: #1e2d3d;
            line-height: 1.4;
        }
        .po-info-line svg {
            width: 16px;
            height: 16px;
            color: #94a3b8;
            flex-shrink: 0;
        }
        .po-info-label {
            font-weight: 600;
            color: #1e2d3d;
            min-width: 75px;
        }
        .po-info-value {
            color: #475569;
        }

        /* À PROPOS */
        .po-about {
            font-size: 13px;
            color: #475569;
            line-height: 1.55;
            margin: 0;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        /* ANNONCES MINI */
        .po-annonce {
            display: flex;
            gap: 10px;
            padding: 10px;
            border: 1.5px solid #e2e8f0;
            border-radius: 10px;
            text-decoration: none;
            color: inherit;
            transition: border-color 0.15s;
            margin-bottom: 6px;
        }
        .po-annonce:last-child { margin-bottom: 0; }
        .po-annonce:hover { border-color: #e8642a; }
        .po-annonce-photo {
            width: 48px; height: 48px; min-width: 48px;
            border-radius: 8px; object-fit: cover; background: #f3f4f6;
        }
        .po-annonce-info { flex: 1; min-width: 0; }
        .po-annonce-titre { font-size: 13px; font-weight: 600; color: #1e2d3d; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .po-annonce-detail { font-size: 11px; color: #6b7280; }
        .po-annonce-prix { font-size: 13px; font-weight: 700; color: #e8642a; margin-top: 2px; }

        /* MOYENNES CATÉGORIES */
        .po-cat-avgs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
        .po-cat-avg {
            flex: 1; min-width: 90px;
            padding: 8px 10px;
            background: #f3f4f6;
            border-radius: 8px;
            text-align: center;
        }
        .po-cat-avg-label { font-size: 10px; color: #6b7280; font-weight: 500; margin-bottom: 2px; }
        .po-cat-avg-stars { color: #f59e0b; font-size: 11px; letter-spacing: 1px; }
        .po-cat-avg-value { font-size: 12px; color: #1e2d3d; font-weight: 600; }

        /* AVIS */
        .po-avis-list { display: flex; flex-direction: column; gap: 8px; }
        .po-avis {
            display: flex;
            gap: 10px;
            padding: 12px;
            background: #f9fafb;
            border-radius: 10px;
        }
        .po-avis-avatar {
            width: 32px; height: 32px; border-radius: 50%;
            background: #1e2d3d;
            display: flex; align-items: center; justify-content: center;
            color: white; font-weight: 700; font-size: 11px;
            flex-shrink: 0; overflow: hidden;
        }
        .po-avis-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .po-avis-content { flex: 1; min-width: 0; }
        .po-avis-header { display: flex; align-items: center; justify-content: space-between; gap: 4px; }
        .po-avis-name { font-weight: 600; color: #1e2d3d; font-size: 13px; }
        .po-avis-date { font-size: 11px; color: #94a3b8; }
        .po-avis-stars { color: #f59e0b; font-size: 12px; margin-top: 2px; letter-spacing: 1px; }
        .po-avis-comment { font-size: 13px; color: #475569; margin-top: 4px; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .po-avis-cats { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px; }
        .po-avis-cat-tag { font-size: 10px; color: #6b7280; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; }
        .po-voir-tous {
            display: block;
            text-align: center;
            font-size: 13px;
            font-weight: 600;
            color: #e8642a;
            text-decoration: none;
            padding: 8px 0 0;
            transition: opacity 0.15s;
        }
        .po-voir-tous:hover { opacity: 0.8; }

        /* EMPTY STATE */
        .po-empty {
            text-align: center;
            padding: 16px 12px;
        }
        .po-empty-icon {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: #f3f4f6;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 6px;
        }
        .po-empty-icon svg { width: 14px; height: 14px; color: #94a3b8; }
        .po-empty-title { font-size: 12px; font-weight: 600; color: #1e2d3d; margin-bottom: 1px; }
        .po-empty-text { font-size: 11px; color: #94a3b8; line-height: 1.3; }

        /* LOADING */
        .po-loading { text-align: center; padding: 32px 20px; color: #94a3b8; font-size: 13px; }

        /* SIGNALER */
        .po-signaler {
            text-align: center;
            padding: 12px 36px 20px;
        }
        .po-signaler a {
            font-size: 11px;
            color: #c4c9d0;
            text-decoration: none;
            transition: color 0.15s;
        }
        .po-signaler a:hover { color: #6b7280; }

        /* MODALE SIGNALEMENT */
        .po-modal-signal {
            position: fixed; inset: 0;
            background: rgba(30, 45, 61, 0.5);
            z-index: 99995;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .po-modal-signal.visible { display: flex; }
        .po-modal-signal-inner {
            background: #fff;
            border-radius: 16px;
            padding: 28px;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 16px 48px rgba(0, 0, 0, 0.18);
        }

        /* RESPONSIVE */
        @media (max-width: 480px) {
            .profil-overlay-backdrop.visible { padding: 12px; }
            .profil-overlay-panel { max-height: 90vh; }
            .po-header { padding: 24px 20px 0; }
            .po-actions { padding: 16px 20px 0; }
            .po-section { padding: 14px 20px; }
            .po-signaler { padding: 10px 20px 16px; }
            .po-avatar { width: 56px; height: 56px; font-size: 20px; }
            .po-name { font-size: 18px; }
            .po-contact-label { min-width: 65px; }
            .po-info-label { min-width: 65px; }
        }
    `;
    document.head.appendChild(style);

    // ─── Injecter le HTML ───
    const overlay = document.createElement('div');
    overlay.id = 'profilOverlayRoot';
    overlay.innerHTML = `
        <div class="profil-overlay-backdrop" id="poBackdrop">
            <div class="profil-overlay-panel" id="poPanel" onclick="event.stopPropagation();">
                <button class="po-close" id="poCloseBtn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
                <div id="poContent">
                    <div class="po-loading">Chargement du profil...</div>
                </div>
            </div>
        </div>
        <div class="po-modal-signal" id="poModalSignal">
            <div class="po-modal-signal-inner">
                <h3 style="font-size:18px;font-weight:700;color:#1e2d3d;margin:0 0 14px;text-align:center;">Signaler cet utilisateur</h3>
                <div id="poSignalMsg" style="padding:8px 12px;border-radius:8px;font-size:13px;font-weight:600;text-align:center;margin-bottom:12px;display:none;"></div>
                <div style="margin-bottom:12px;">
                    <label style="display:block;font-size:13px;font-weight:600;color:#1e2d3d;margin-bottom:4px;">Motif</label>
                    <select id="poSignalMotif" style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;font-family:inherit;box-sizing:border-box;outline:none;background:#f3f4f6;">
                        <option value="">-- Choisir un motif --</option>
                        <option value="faux_profil">Faux profil</option>
                        <option value="comportement_suspect">Comportement suspect</option>
                        <option value="harcelement">Harc\u00e8lement</option>
                        <option value="arnaque">Tentative d'arnaque</option>
                        <option value="discrimination">Discrimination</option>
                        <option value="autre">Autre</option>
                    </select>
                </div>
                <div style="margin-bottom:12px;">
                    <label style="display:block;font-size:13px;font-weight:600;color:#1e2d3d;margin-bottom:4px;">Description (optionnel)</label>
                    <textarea id="poSignalDesc" rows="3" placeholder="D\u00e9cris le probl\u00e8me..." style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;font-family:inherit;box-sizing:border-box;outline:none;resize:vertical;"></textarea>
                </div>
                <div style="display:flex;gap:10px;">
                    <button id="poSignalCancel" style="flex:1;padding:10px;background:#fff;color:#1e2d3d;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;">Annuler</button>
                    <button id="poSignalSubmit" style="flex:1;padding:10px;background:#EF4444;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;">Signaler</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // ─── État ───
    let poCurrentUser = null;
    let poProfileUserId = null;
    let poProfileData = null;
    let poIsOpen = false;
    let poRelationLevel = 'none'; // 'none' | 'candidature' | 'contrat'

    // ─── Fermer ───
    function fermerProfilOverlay() {
        if (!poIsOpen) return;
        poIsOpen = false;
        document.getElementById('poPanel').classList.remove('open');
        document.getElementById('poBackdrop').classList.remove('visible');
        document.body.style.overflow = '';
    }
    window.fermerProfilOverlay = fermerProfilOverlay;

    document.getElementById('poBackdrop').addEventListener('click', fermerProfilOverlay);
    document.getElementById('poCloseBtn').addEventListener('click', fermerProfilOverlay);
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && poIsOpen) fermerProfilOverlay();
    });

    // ─── Signalement ───
    document.getElementById('poSignalCancel').addEventListener('click', function () {
        document.getElementById('poModalSignal').classList.remove('visible');
    });
    document.getElementById('poModalSignal').addEventListener('click', function (e) {
        if (e.target === this) this.classList.remove('visible');
    });
    document.getElementById('poSignalSubmit').addEventListener('click', async function () {
        var motif = document.getElementById('poSignalMotif').value;
        var desc = document.getElementById('poSignalDesc').value;
        var msg = document.getElementById('poSignalMsg');
        var btn = this;
        if (!motif) {
            msg.textContent = 'Choisis un motif.';
            msg.style.display = 'block';
            msg.style.background = 'rgba(232,98,42,0.08)';
            msg.style.color = '#e8642a';
            return;
        }
        if (typeof RateLimiter !== 'undefined' && !RateLimiter.check('signalement_user', 3, 600000, { persistent: true })) return;
        btn.disabled = true;
        btn.textContent = 'Envoi...';
        try {
            var result = await supabaseClient.from('signalements').insert({
                reporter_id: poCurrentUser.id,
                type: 'utilisateur',
                target_id: poProfileUserId,
                motif: motif,
                description: desc || null
            });
            if (result.error) throw result.error;
            msg.textContent = 'Signalement envoy\u00e9. Merci !';
            msg.style.display = 'block';
            msg.style.background = '#D1FAE5';
            msg.style.color = '#065F46';
            setTimeout(function () {
                document.getElementById('poModalSignal').classList.remove('visible');
            }, 1500);
        } catch (e) {
            console.error('Erreur signalement:', e);
            msg.textContent = "Erreur lors de l'envoi.";
            msg.style.display = 'block';
            msg.style.background = 'rgba(232,98,42,0.08)';
            msg.style.color = '#e8642a';
        }
        btn.disabled = false;
        btn.textContent = 'Signaler';
    });

    // ─── Utilitaires ───
    function poEscape(text) {
        if (!text) return '';
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    function poGenStars(note) {
        var plein = Math.round(note);
        return '\u2605'.repeat(plein) + '\u2606'.repeat(5 - plein);
    }
    function poGetCategoryLabels(typeUser) {
        if (typeUser === 'proprietaire' || typeUser === 'hote') {
            return { communication: 'Communication', categorie2: '\u00c9tat du logement', categorie3: 'Rapport qualit\u00e9-prix' };
        }
        return { communication: 'Communication', categorie2: 'Propret\u00e9', categorie3: 'Respect du logement' };
    }

    // ─── Déterminer le niveau de relation entre l'utilisateur connecté et le profil ───
    async function poDetecterRelation(currentUserId, profileUserId) {
        // 1) Vérifier s'il y a un contrat signé entre les deux
        var contratResult = await supabaseClient
            .from('contrats')
            .select('id')
            .or('and(locataire_id.eq.' + currentUserId + ',proprietaire_id.eq.' + profileUserId + '),and(locataire_id.eq.' + profileUserId + ',proprietaire_id.eq.' + currentUserId + ')')
            .eq('statut', 'signe')
            .limit(1);

        if (contratResult.data && contratResult.data.length > 0) {
            return 'contrat';
        }

        // 2) Vérifier s'il y a une candidature entre les deux
        // Cas A : le user connecté a candidaté sur une annonce du profil
        var candA = await supabaseClient
            .from('candidatures')
            .select('id, annonces!inner(proprietaire_id)')
            .eq('locataire_id', currentUserId)
            .eq('annonces.proprietaire_id', profileUserId)
            .in('statut', ['en_attente', 'acceptee'])
            .limit(1);

        if (candA.data && candA.data.length > 0) {
            return 'candidature';
        }

        // Cas B : le profil a candidaté sur une annonce du user connecté
        var candB = await supabaseClient
            .from('candidatures')
            .select('id, annonces!inner(proprietaire_id)')
            .eq('locataire_id', profileUserId)
            .eq('annonces.proprietaire_id', currentUserId)
            .in('statut', ['en_attente', 'acceptee'])
            .limit(1);

        if (candB.data && candB.data.length > 0) {
            return 'candidature';
        }

        return 'none';
    }

    // ─── Ouvrir l'overlay ───
    async function ouvrirProfilOverlay(userId) {
        if (!userId) return;

        var attempts = 0;
        while (typeof supabaseClient === 'undefined' && attempts < 50) {
            await new Promise(function (r) { setTimeout(r, 100); });
            attempts++;
        }
        if (typeof supabaseClient === 'undefined') return;

        if (!poCurrentUser) {
            var authResult = await supabaseClient.auth.getUser();
            poCurrentUser = authResult.data.user;
        }

        if (poCurrentUser && userId === poCurrentUser.id) {
            window.location.href = 'mon-profil.html';
            return;
        }

        poProfileUserId = userId;
        poProfileData = null;
        poRelationLevel = 'none';

        document.getElementById('poContent').innerHTML = '<div class="po-loading">Chargement du profil...</div>';
        document.body.style.overflow = 'hidden';

        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                document.getElementById('poBackdrop').classList.add('visible');
                document.getElementById('poPanel').classList.add('open');
            });
        });
        poIsOpen = true;

        try {
            // Détecter la relation en parallèle du chargement profil
            if (poCurrentUser) {
                poRelationLevel = await poDetecterRelation(poCurrentUser.id, userId);
            }
            await poChargerProfil();
        } catch (e) {
            console.error('Erreur chargement profil overlay:', e);
            document.getElementById('poContent').innerHTML = '<div class="po-loading">Erreur de chargement.</div>';
        }
    }
    window.ouvrirProfilOverlay = ouvrirProfilOverlay;

    // ─── Charger profil ───
    async function poChargerProfil() {
        var result = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', poProfileUserId)
            .single();

        if (result.error || !result.data) {
            document.getElementById('poContent').innerHTML = '<div class="po-loading">Profil introuvable.</div>';
            return;
        }

        var data = result.data;
        poProfileData = data;

        // Rôle
        var roleLabels = { locataire: 'Locataire', proprietaire: 'Propri\u00e9taire', hote: 'H\u00f4te' };
        var role = roleLabels[data.type_user] || '';

        // Avatar
        var avatarHtml;
        if (data.photo_profil_url) {
            avatarHtml = '<img src="' + poEscape(data.photo_profil_url) + '" alt="Photo">';
        } else {
            avatarHtml = poEscape(data.prenom[0]) + poEscape(data.nom[0]);
        }

        // Badge vérification
        var badgeHtml = '';
        if (data.identite_verifiee === 'verifiee') {
            badgeHtml = '<span class="po-badge-verifie"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>Identit\u00e9 v\u00e9rifi\u00e9e</span>';
        } else if (data.identite_verifiee === 'documents_fournis') {
            badgeHtml = '<span class="po-badge-documents"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg>Documents fournis</span>';
        }

        // ─── Construire le HTML ───
        var html = '';

        // Header
        html += '<div class="po-header">';
        html += '<div class="po-avatar">' + avatarHtml + '</div>';
        html += '<div class="po-name">' + poEscape(data.prenom) + ' ' + poEscape(data.nom) + '</div>';
        html += '<div class="po-role-label">' + poEscape(role) + '</div>';
        if (badgeHtml) html += '<div class="po-badge-row">' + badgeHtml + '</div>';

        html += '<div class="po-rating" id="poRating" style="display:none;"><span class="po-stars" id="poStars"></span><span class="po-rating-text" id="poRatingText"></span></div>';
        html += '</div>';

        // Action buttons
        html += '<div class="po-actions">';
        html += '<a href="conversation.html?user_id=' + poProfileUserId + '" class="po-btn po-btn-primary"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>Envoyer un message</a>';
        html += '<a href="avis.html?user_id=' + poProfileUserId + '" class="po-btn po-btn-secondary"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>Voir les avis</a>';
        html += '</div>';

        // ─── Section Contact (visible uniquement si contrat signé) ───
        if (poRelationLevel === 'contrat') {
            var emailSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>';
            var phoneSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';

            html += '<div class="po-section">';
            html += '<div class="po-section-title">Contact</div>';
            html += '<div class="po-contact-lines">';

            if (data.email) {
                html += '<div class="po-contact-line">' + emailSvg + '<span class="po-contact-label">Email</span><span class="po-contact-value"><a href="mailto:' + poEscape(data.email) + '">' + poEscape(data.email) + '</a></span></div>';
            }
            if (data.telephone) {
                html += '<div class="po-contact-line">' + phoneSvg + '<span class="po-contact-label">T\u00e9l\u00e9phone</span><span class="po-contact-value"><a href="tel:' + poEscape(data.telephone) + '">' + poEscape(data.telephone) + '</a></span></div>';
            }

            html += '</div></div>';
        }

        // ─── Section Informations en lignes ───
        var infoLines = poBuilInfoLines(data);
        if (infoLines) {
            html += '<div class="po-section"><div class="po-section-title">Informations</div><div class="po-info-lines">' + infoLines + '</div></div>';
        }

        // À propos
        if (data.description) {
            html += '<div class="po-section"><div class="po-section-title">\u00c0 propos</div><p class="po-about">' + poEscape(data.description) + '</p></div>';
        }

        // Annonces (remplie après)
        html += '<div class="po-section" id="poAnnoncesSection" style="display:none;"><div class="po-section-title">Annonces</div><div id="poAnnoncesList"></div></div>';

        // Signaler
        if (poCurrentUser && poProfileUserId !== poCurrentUser.id) {
            html += '<div class="po-signaler"><a href="#" id="poSignalerLink">Signaler cet utilisateur</a></div>';
        }

        document.getElementById('poContent').innerHTML = html;

        // Bouton signaler
        var sigLink = document.getElementById('poSignalerLink');
        if (sigLink) {
            sigLink.addEventListener('click', function (e) {
                e.preventDefault();
                document.getElementById('poSignalMsg').style.display = 'none';
                document.getElementById('poSignalMotif').value = '';
                document.getElementById('poSignalDesc').value = '';
                document.getElementById('poModalSignal').classList.add('visible');
            });
        }

        // Charger données async
        await Promise.all([
            poChargerMoyenne(),
            (data.type_user === 'proprietaire' || data.type_user === 'hote') ? poChargerAnnonces() : Promise.resolve()
        ]);
    }

    // ─── Infos en lignes lisibles ───
    function poBuilInfoLines(data) {
        var html = '';
        var ecoleSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1 4 3 6 3s6-2 6-3v-5"/></svg>';
        var rythmeSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>';
        var pinSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
        var entrepriseSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>';

        if (data.ecole) {
            html += '<div class="po-info-line">' + ecoleSvg + '<span class="po-info-label">\u00c9cole</span><span class="po-info-value">' + poEscape(data.ecole) + (data.filiere ? ' \u2014 ' + poEscape(data.filiere) : '') + '</span></div>';
        }
        if (data.rythme_alternance) {
            html += '<div class="po-info-line">' + rythmeSvg + '<span class="po-info-label">Rythme</span><span class="po-info-value">' + poEscape(data.rythme_alternance) + '</span></div>';
        }
        if (data.ville_ecole) {
            html += '<div class="po-info-line">' + pinSvg + '<span class="po-info-label">Ville \u00e9cole</span><span class="po-info-value">' + poEscape(data.ville_ecole) + '</span></div>';
        }
        if (data.ville_entreprise) {
            html += '<div class="po-info-line">' + entrepriseSvg + '<span class="po-info-label">Entreprise</span><span class="po-info-value">' + poEscape(data.ville_entreprise) + '</span></div>';
        }
        return html;
    }

    // ─── Charger annonces ───
    async function poChargerAnnonces() {
        var result = await supabaseClient
            .from('annonces')
            .select('id, titre, ville, type_logement, surface, prix_semaine, photos')
            .eq('proprietaire_id', poProfileUserId)
            .eq('statut', 'active');

        if (!result.data || result.data.length === 0) return;

        var container = document.getElementById('poAnnoncesList');
        if (!container) return;
        var html = '';
        for (var i = 0; i < result.data.length; i++) {
            var a = result.data[i];
            var photo = a.photos && a.photos.length > 0 ? a.photos[0] : '';
            var photoTag = photo
                ? '<img class="po-annonce-photo" src="' + poEscape(photo) + '" alt="' + poEscape(a.titre) + '" loading="lazy">'
                : '<div class="po-annonce-photo"></div>';

            html += '<a href="logement.html?id=' + a.id + '" class="po-annonce">' + photoTag + '<div class="po-annonce-info"><div class="po-annonce-titre">' + poEscape(a.titre) + '</div><div class="po-annonce-detail">' + poEscape(a.ville || '') + (a.type_logement ? ' \u00b7 ' + poEscape(a.type_logement) : '') + (a.surface ? ' \u00b7 ' + a.surface + ' m\u00b2' : '') + '</div><div class="po-annonce-prix">' + a.prix_semaine + '\u20ac/sem</div></div></a>';
        }
        container.innerHTML = html;
        document.getElementById('poAnnoncesSection').style.display = 'block';
    }

    // ─── Charger moyenne ───
    async function poChargerMoyenne() {
        var result = await supabaseClient
            .from('avis')
            .select('note, note_communication, note_categorie_2, note_categorie_3')
            .eq('profil_evalue_id', poProfileUserId);

        var ratingEl = document.getElementById('poRating');
        if (!ratingEl) return;

        if (result.data && result.data.length > 0) {
            var moy = result.data.reduce(function (s, a) { return s + a.note; }, 0) / result.data.length;
            var moyR = Math.round(moy * 10) / 10;
            document.getElementById('poStars').textContent = poGenStars(moy);
            document.getElementById('poRatingText').textContent = moyR + '/5 \u2014 ' + result.data.length + ' avis';
            ratingEl.style.display = 'flex';

            var labels = poGetCategoryLabels(poProfileData.type_user);
            var catData = { communication: [], categorie2: [], categorie3: [] };
            for (var i = 0; i < result.data.length; i++) {
                var a = result.data[i];
                if (a.note_communication) catData.communication.push(a.note_communication);
                if (a.note_categorie_2) catData.categorie2.push(a.note_categorie_2);
                if (a.note_categorie_3) catData.categorie3.push(a.note_categorie_3);
            }

            var avgContainer = document.getElementById('poCatAvgs');
            if (avgContainer && catData.communication.length > 0) {
                var catHtml = '';
                var keys = Object.keys(labels);
                for (var k = 0; k < keys.length; k++) {
                    var key = keys[k];
                    var arr = catData[key];
                    if (arr.length > 0) {
                        var avg = arr.reduce(function (a, b) { return a + b; }, 0) / arr.length;
                        var avgR = Math.round(avg * 10) / 10;
                        catHtml += '<div class="po-cat-avg"><div class="po-cat-avg-label">' + labels[key] + '</div><div class="po-cat-avg-stars">' + poGenStars(avg) + '</div><div class="po-cat-avg-value">' + avgR + '/5</div></div>';
                    }
                }
                if (catHtml) {
                    avgContainer.innerHTML = catHtml;
                    avgContainer.style.display = 'flex';
                }
            }
        }
    }

    // ─── Charger avis ───
    async function poChargerAvis() {
        var container = document.getElementById('poAvisList');
        if (!container) return;

        var result = await supabaseClient
            .from('avis')
            .select('id, note, note_communication, note_categorie_2, note_categorie_3, commentaire, created_at, evaluateur: users!avis_evaluateur_id_fkey(id, prenom, nom, photo_profil_url)')
            .eq('profil_evalue_id', poProfileUserId)
            .order('created_at', { ascending: false });

        if (!result.data || result.data.length === 0) {
            container.innerHTML = '<div class="po-empty"><div class="po-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div><div class="po-empty-title">Pas encore d\'avis</div><div class="po-empty-text">Les avis appara\u00eetront apr\u00e8s des s\u00e9jours.</div></div>';
            return;
        }

        var html = '';
        var maxAvis = 2;
        var total = result.data.length;
        for (var i = 0; i < Math.min(total, maxAvis); i++) {
            var avis = result.data[i];
            var eval_ = avis.evaluateur;
            var nom = eval_ ? poEscape(eval_.prenom) + ' ' + poEscape(eval_.nom) : 'Utilisateur';
            var photo = eval_ ? eval_.photo_profil_url : null;
            var initials = eval_ ? poEscape(eval_.prenom[0]) + poEscape(eval_.nom[0]) : '?';
            var date = new Date(avis.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
            var stars = poGenStars(avis.note);
            var avatarInner = photo ? '<img loading="lazy" src="' + poEscape(photo) + '" alt="' + nom + '">' : initials;

            var catHtml = '';
            if (avis.note_communication || avis.note_categorie_2 || avis.note_categorie_3) {
                var labels = poGetCategoryLabels(poProfileData.type_user);
                catHtml = '<div class="po-avis-cats">';
                if (avis.note_communication) catHtml += '<span class="po-avis-cat-tag">' + labels.communication + ' ' + poGenStars(avis.note_communication) + '</span>';
                if (avis.note_categorie_2) catHtml += '<span class="po-avis-cat-tag">' + labels.categorie2 + ' ' + poGenStars(avis.note_categorie_2) + '</span>';
                if (avis.note_categorie_3) catHtml += '<span class="po-avis-cat-tag">' + labels.categorie3 + ' ' + poGenStars(avis.note_categorie_3) + '</span>';
                catHtml += '</div>';
            }

            html += '<div class="po-avis"><div class="po-avis-avatar">' + avatarInner + '</div><div class="po-avis-content"><div class="po-avis-header"><span class="po-avis-name">' + nom + '</span><span class="po-avis-date">' + date + '</span></div><div class="po-avis-stars">' + stars + '</div>' + catHtml + (avis.commentaire ? '<div class="po-avis-comment">' + poEscape(avis.commentaire) + '</div>' : '') + '</div></div>';
        }
        if (total > maxAvis) {
            html += '<a href="avis.html?user_id=' + poProfileUserId + '" class="po-voir-tous">Voir les ' + total + ' avis \u2192</a>';
        }
        container.innerHTML = html;
    }

})();
