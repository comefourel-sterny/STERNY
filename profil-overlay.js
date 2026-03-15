// ============================================================
// STERNY — Profil Overlay Component
// ============================================================
// Usage : inclure <script src="profil-overlay.js"></script> sur la page
// Appeler : ouvrirProfilOverlay(userId)
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
            background: rgba(0,0,0,0.45);
            z-index: 99990;
            display: none;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.25s ease;
        }
        .profil-overlay-backdrop.visible { opacity: 1; display: flex; pointer-events: auto; align-items: center; justify-content: center; padding: 24px; }

        /* CARTE PROFIL CENTRÉE */
        .profil-overlay-panel {
            position: relative;
            width: 100%;
            max-width: 480px;
            max-height: 85vh;
            background: white;
            z-index: 99991;
            overflow-y: auto;
            border-radius: 20px;
            box-shadow: 0 16px 48px rgba(0,0,0,0.2);
            transform: scale(0.95);
            opacity: 0;
            transition: transform 0.25s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease;
        }
        .profil-overlay-panel.open { transform: scale(1); opacity: 1; }

        /* BOUTON FERMER */
        .profil-overlay-close {
            position: sticky;
            top: 0;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            padding: 12px 16px;
            background: white;
            z-index: 2;
            border-radius: 20px 20px 0 0;
        }
        .profil-overlay-close-label {
            display: none;
        }
        .profil-overlay-close-btn {
            width: 32px;
            height: 32px;
            border: none;
            background: #F4F5F7;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
        }
        .profil-overlay-close-btn:hover { background: #E8EAF0; }
        .profil-overlay-close-btn svg { width: 16px; height: 16px; color: #1E293B; }

        /* EN-TÊTE PROFIL */
        .po-top {
            padding: 24px 20px 0;
            text-align: center;
        }
        .po-avatar {
            width: 72px;
            height: 72px;
            border-radius: 50%;
            background: linear-gradient(135deg, #1E293B 0%, #334155 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: 700;
            color: white;
            overflow: hidden;
            margin: 0 auto 10px;
        }
        .po-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .po-name { font-size: 20px; font-weight: 700; color: #1E293B; margin-bottom: 3px; }
        .po-role { font-size: 13px; color: #6B7280; margin-bottom: 6px; }
        .po-badge-row {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            flex-wrap: wrap;
            margin-bottom: 8px;
        }
        .po-badge-verifie {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: #ECFDF5;
            color: #059669;
            font-size: 11px;
            font-weight: 600;
            padding: 3px 10px;
            border-radius: 20px;
            border: 1px solid rgba(167,243,208,0.6);
        }
        .po-badge-verifie svg { width: 12px; height: 12px; }
        .po-badge-documents {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: #EFF6FF;
            color: #2563EB;
            font-size: 11px;
            font-weight: 600;
            padding: 3px 10px;
            border-radius: 20px;
            border: 1px solid rgba(191,219,254,0.6);
        }
        .po-badge-documents svg { width: 12px; height: 12px; }

        /* Étoiles */
        .po-rating {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            margin-bottom: 14px;
        }
        .po-stars { color: #fbbf24; font-size: 14px; letter-spacing: 1px; }
        .po-rating-text { font-size: 12px; color: #6B7280; }

        /* Boutons */
        .po-actions {
            display: flex;
            gap: 8px;
            justify-content: center;
            padding-bottom: 18px;
        }
        .po-btn {
            padding: 8px 16px;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            font-family: inherit;
            border: 1.5px solid #E8EAF0;
            background: white;
            color: #1E293B;
        }
        .po-btn:hover { border-color: #E8622A; color: #E8622A; }
        .po-btn.primary { background: #E8622A; border-color: #E8622A; color: white; }
        .po-btn.primary:hover { background: #d4571f; border-color: #d4571f; }

        /* Badges confiance */
        .po-trust {
            display: flex;
            gap: 14px;
            justify-content: center;
            flex-wrap: wrap;
            padding: 12px 20px;
            border-top: 1px solid #E8EAF0;
            border-bottom: 1px solid #E8EAF0;
        }
        .po-trust-item {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 11px;
            color: #94A3B8;
        }
        .po-trust-item svg { width: 14px; height: 14px; flex-shrink: 0; }
        .po-trust-item.verified { color: #059669; }

        /* Sections */
        .po-section {
            padding: 16px 20px;
            border-bottom: 1px solid #E8EAF0;
        }
        .po-section:last-child { border-bottom: none; }
        .po-section-title {
            font-size: 12px;
            font-weight: 700;
            color: #94A3B8;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 10px;
        }

        /* À propos */
        .po-about { font-size: 13px; color: #475569; line-height: 1.6; }

        /* Infos */
        .po-info-compact { display: flex; flex-wrap: wrap; gap: 6px; }
        .po-info-tag {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 12px;
            color: #475569;
            background: #F4F5F7;
            padding: 4px 10px;
            border-radius: 7px;
        }
        .po-info-tag svg { width: 13px; height: 13px; color: #94A3B8; flex-shrink: 0; }

        /* Annonces mini */
        .po-annonce {
            display: flex;
            gap: 10px;
            padding: 10px;
            border: 1.5px solid #E8EAF0;
            border-radius: 10px;
            text-decoration: none;
            color: inherit;
            transition: border-color 0.2s;
            margin-bottom: 6px;
        }
        .po-annonce:last-child { margin-bottom: 0; }
        .po-annonce:hover { border-color: #E8622A; }
        .po-annonce-photo {
            width: 48px; height: 48px; min-width: 48px;
            border-radius: 8px; object-fit: cover; background: #F4F5F7;
        }
        .po-annonce-info { flex: 1; min-width: 0; }
        .po-annonce-titre { font-size: 13px; font-weight: 600; color: #1E293B; margin-bottom: 1px; }
        .po-annonce-detail { font-size: 11px; color: #6B7280; }
        .po-annonce-prix { font-size: 13px; font-weight: 700; color: #E8622A; margin-top: 1px; }

        /* Moyennes catégories */
        .po-cat-avgs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
        .po-cat-avg {
            flex: 1; min-width: 80px;
            padding: 8px 10px;
            background: #F4F5F7;
            border-radius: 8px;
            text-align: center;
        }
        .po-cat-avg-label { font-size: 10px; color: #6B7280; margin-bottom: 1px; }
        .po-cat-avg-stars { color: #fbbf24; font-size: 11px; letter-spacing: 1px; }
        .po-cat-avg-value { font-size: 11px; color: #1E293B; font-weight: 600; }

        /* Avis */
        .po-avis-list { display: flex; flex-direction: column; gap: 10px; }
        .po-avis {
            display: flex; gap: 10px; padding: 12px;
            background: #F9FAFB; border-radius: 10px;
        }
        .po-avis-avatar {
            width: 32px; height: 32px; border-radius: 50%;
            background: linear-gradient(135deg, #1E293B 0%, #334155 100%);
            display: flex; align-items: center; justify-content: center;
            color: white; font-weight: 700; font-size: 11px;
            flex-shrink: 0; overflow: hidden;
        }
        .po-avis-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .po-avis-content { flex: 1; min-width: 0; }
        .po-avis-header { display: flex; align-items: center; justify-content: space-between; gap: 4px; flex-wrap: wrap; }
        .po-avis-name { font-weight: 600; color: #1E293B; font-size: 12px; }
        .po-avis-date { font-size: 10px; color: #94A3B8; }
        .po-avis-stars { color: #fbbf24; font-size: 12px; margin-top: 1px; letter-spacing: 1px; }
        .po-avis-comment { font-size: 12px; color: #475569; margin-top: 3px; line-height: 1.5; }
        .po-avis-cats { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px; }
        .po-avis-cat-tag { font-size: 10px; color: #6B7280; background: #E8EAF0; padding: 2px 5px; border-radius: 4px; }

        /* Empty & loading */
        .po-empty { text-align: center; padding: 24px 12px; }
        .po-empty-icon { font-size: 28px; opacity: 0.3; margin-bottom: 6px; }
        .po-empty-title { font-size: 14px; font-weight: 600; color: #1E293B; margin-bottom: 3px; }
        .po-empty-text { font-size: 12px; color: #94A3B8; }
        .po-loading { text-align: center; padding: 20px; color: #94A3B8; font-size: 12px; }

        /* Signaler */
        .po-signaler { text-align: center; padding: 12px 20px 20px; }
        .po-signaler a { font-size: 11px; color: #94A3B8; text-decoration: none; transition: color 0.2s; }
        .po-signaler a:hover { color: #E8622A; }

        /* Modale signalement overlay */
        .po-modal-signal {
            position: fixed; inset: 0;
            background: rgba(0,0,0,0.5);
            z-index: 99995;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .po-modal-signal.visible { display: flex; }
        .po-modal-signal-inner {
            background: #fff; border-radius: 20px; padding: 28px;
            max-width: 400px; width: 100%;
            box-shadow: 0 16px 48px rgba(0,0,0,0.2);
        }
    `;
    document.head.appendChild(style);

    // ─── Injecter le HTML ───
    const overlay = document.createElement('div');
    overlay.id = 'profilOverlayRoot';
    overlay.innerHTML = `
        <div class="profil-overlay-backdrop" id="poBackdrop">
            <div class="profil-overlay-panel" id="poPanel" onclick="event.stopPropagation();">
                <div class="profil-overlay-close">
                    <button class="profil-overlay-close-btn" id="poCloseBtn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
                <div id="poContent">
                    <div class="po-loading">Chargement du profil...</div>
                </div>
            </div>
        </div>
        <div class="po-modal-signal" id="poModalSignal">
            <div class="po-modal-signal-inner">
                <h3 style="font-size:18px;font-weight:700;color:#1E293B;margin:0 0 14px;text-align:center;">Signaler cet utilisateur</h3>
                <div id="poSignalMsg" style="padding:8px 12px;border-radius:8px;font-size:13px;font-weight:600;text-align:center;margin-bottom:12px;display:none;"></div>
                <div style="margin-bottom:12px;">
                    <label style="display:block;font-size:13px;font-weight:600;color:#1E293B;margin-bottom:4px;">Motif</label>
                    <select id="poSignalMotif" style="width:100%;padding:10px 14px;border:1.5px solid #E8EAF0;border-radius:10px;font-size:14px;font-family:inherit;box-sizing:border-box;outline:none;background:#F4F5F7;">
                        <option value="">-- Choisir un motif --</option>
                        <option value="faux_profil">Faux profil</option>
                        <option value="comportement_suspect">Comportement suspect</option>
                        <option value="harcelement">Harcèlement</option>
                        <option value="arnaque">Tentative d'arnaque</option>
                        <option value="discrimination">Discrimination</option>
                        <option value="autre">Autre</option>
                    </select>
                </div>
                <div style="margin-bottom:12px;">
                    <label style="display:block;font-size:13px;font-weight:600;color:#1E293B;margin-bottom:4px;">Description (optionnel)</label>
                    <textarea id="poSignalDesc" rows="3" placeholder="Décris le problème..." style="width:100%;padding:10px 14px;border:1.5px solid #E8EAF0;border-radius:10px;font-size:14px;font-family:inherit;box-sizing:border-box;outline:none;resize:vertical;"></textarea>
                </div>
                <div style="display:flex;gap:10px;">
                    <button id="poSignalCancel" style="flex:1;padding:10px;background:#fff;color:#1E293B;border:1.5px solid #E8EAF0;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;">Annuler</button>
                    <button id="poSignalSubmit" style="flex:1;padding:10px;background:#EF4444;color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;">Signaler</button>
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

    // ─── Fermer ───
    function fermerProfilOverlay() {
        if (!poIsOpen) return;
        poIsOpen = false;
        document.getElementById('poPanel').classList.remove('open');
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
            msg.style.color = '#E8622A';
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
            msg.textContent = 'Signalement envoyé. Merci !';
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
            msg.style.color = '#E8622A';
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
    function poCalculerAge(dateNaissance) {
        var today = new Date();
        var bd = new Date(dateNaissance);
        var age = today.getFullYear() - bd.getFullYear();
        var m = today.getMonth() - bd.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
        return age;
    }
    function poGetCategoryLabels(typeUser) {
        if (typeUser === 'proprietaire' || typeUser === 'hote') {
            return { communication: 'Communication', categorie2: '\u00c9tat du logement', categorie3: 'Rapport qualit\u00e9-prix' };
        }
        return { communication: 'Communication', categorie2: 'Propret\u00e9', categorie3: 'Respect du logement' };
    }

    // ─── Ouvrir l'overlay ───
    async function ouvrirProfilOverlay(userId) {
        if (!userId) return;

        // Attendre supabase
        var attempts = 0;
        while (typeof supabaseClient === 'undefined' && attempts < 50) {
            await new Promise(function (r) { setTimeout(r, 100); });
            attempts++;
        }
        if (typeof supabaseClient === 'undefined') return;

        // User courant
        if (!poCurrentUser) {
            var authResult = await supabaseClient.auth.getUser();
            poCurrentUser = authResult.data.user;
        }

        // Si c'est son propre profil, redirigr
        if (poCurrentUser && userId === poCurrentUser.id) {
            window.location.href = 'mon-profil.html';
            return;
        }

        poProfileUserId = userId;
        poProfileData = null;

        // Afficher la carte
        document.getElementById('poContent').innerHTML = '<div class="po-loading">Chargement du profil...</div>';
        document.body.style.overflow = 'hidden';

        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                document.getElementById('poBackdrop').classList.add('visible');
                document.getElementById('poPanel').classList.add('open');
            });
        });
        poIsOpen = true;

        // Charger les données
        try {
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

        // Nom & rôle
        var roleLabels = { locataire: 'Locataire', proprietaire: 'Propri\u00e9taire', hote: 'H\u00f4te' };
        var role = roleLabels[data.type_user] || '';
        var roleDetails = role;
        if (data.date_naissance) {
            roleDetails += roleDetails ? ' \u00b7 ' + poCalculerAge(data.date_naissance) + ' ans' : poCalculerAge(data.date_naissance) + ' ans';
        }
        if (data.ville_origine) {
            roleDetails += roleDetails ? ' \u00b7 ' + poEscape(data.ville_origine) : poEscape(data.ville_origine);
        }

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

        // Trust badges
        var trustHtml = '<div class="po-trust-item verified"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>Email</div>';
        if (data.telephone) {
            trustHtml += '<div class="po-trust-item verified"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.81.36 1.6.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c1.21.34 2 .57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>T\u00e9l\u00e9phone</div>';
        }
        if (data.identite_verifiee === 'verifiee') {
            trustHtml += '<div class="po-trust-item verified"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>Identit\u00e9</div>';
        }

        // À propos
        var aboutHtml = '';
        if (data.description) {
            aboutHtml = '<div class="po-section"><div class="po-section-title">\u00c0 propos</div><p class="po-about">' + poEscape(data.description) + '</p></div>';
        }

        // Infos compactes
        var infoHtml = poBuilInfoCompact(data);

        // Construire le contenu
        var html = '';
        html += '<div class="po-top">';
        html += '<div class="po-avatar">' + avatarHtml + '</div>';
        html += '<div class="po-name">' + poEscape(data.prenom) + ' ' + poEscape(data.nom) + '</div>';
        html += '<div class="po-role">' + poEscape(roleDetails) + '</div>';
        if (badgeHtml) html += '<div class="po-badge-row">' + badgeHtml + '</div>';
        html += '<div class="po-rating" id="poRating" style="display:none;"><span class="po-stars" id="poStars">\u2606\u2606\u2606\u2606\u2606</span><span class="po-rating-text" id="poRatingText">Aucun avis</span></div>';
        html += '<div class="po-actions">';
        html += '<a href="conversation.html?user_id=' + poProfileUserId + '" class="po-btn primary"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>Message</a>';
        html += '<a href="avis.html?user_id=' + poProfileUserId + '" class="po-btn"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>Avis</a>';
        html += '</div>';
        html += '</div>';

        html += '<div class="po-trust">' + trustHtml + '</div>';
        html += aboutHtml;
        if (infoHtml) html += '<div class="po-section"><div class="po-section-title">Informations</div><div class="po-info-compact">' + infoHtml + '</div></div>';

        // Zone annonces (remplie après)
        html += '<div class="po-section" id="poAnnoncesSection" style="display:none;"><div class="po-section-title">Annonces</div><div id="poAnnoncesList"></div></div>';

        // Avis
        html += '<div class="po-section"><div class="po-section-title">Avis re\u00e7us</div><div class="po-cat-avgs" id="poCatAvgs" style="display:none;"></div><div class="po-avis-list" id="poAvisList"><div class="po-loading">Chargement des avis...</div></div></div>';

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
            poChargerAvis(),
            (data.type_user === 'proprietaire' || data.type_user === 'hote') ? poChargerAnnonces() : Promise.resolve()
        ]);
    }

    // ─── Infos compactes ───
    function poBuilInfoCompact(data) {
        var html = '';
        if (data.ecole) {
            html += '<span class="po-info-tag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1 4 3 6 3s6-2 6-3v-5"/></svg>' + poEscape(data.ecole) + (data.filiere ? ' \u00b7 ' + poEscape(data.filiere) : '') + '</span>';
        }
        if (data.annee_etudes) {
            html += '<span class="po-info-tag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' + poEscape(data.annee_etudes) + '</span>';
        }
        if (data.rythme_alternance) {
            html += '<span class="po-info-tag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>' + poEscape(data.rythme_alternance) + '</span>';
        }
        if (data.ville_ecole) {
            html += '<span class="po-info-tag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' + poEscape(data.ville_ecole) + '</span>';
        }
        if (data.ville_entreprise) {
            html += '<span class="po-info-tag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>' + poEscape(data.ville_entreprise) + '</span>';
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
        ratingEl.style.display = 'flex';

        if (result.data && result.data.length > 0) {
            var moy = result.data.reduce(function (s, a) { return s + a.note; }, 0) / result.data.length;
            var moyR = Math.round(moy * 10) / 10;
            document.getElementById('poStars').textContent = poGenStars(moy);
            document.getElementById('poRatingText').textContent = moyR + '/5 \u2014 ' + result.data.length + ' avis';

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
        } else {
            document.getElementById('poStars').textContent = '\u2606\u2606\u2606\u2606\u2606';
            document.getElementById('poRatingText').textContent = 'Aucun avis encore';
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
            container.innerHTML = '<div class="po-empty"><div class="po-empty-icon">\u2b50</div><div class="po-empty-title">Pas encore d\'avis</div><div class="po-empty-text">Les premiers avis appara\u00eetront ici apr\u00e8s des s\u00e9jours.</div></div>';
            return;
        }

        var html = '';
        for (var i = 0; i < result.data.length; i++) {
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
        container.innerHTML = html;
    }

})();
