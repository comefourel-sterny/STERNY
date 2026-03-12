// ============================================================
// STERNY — Notifications In-App (cloche dans la nav)
// ============================================================
// Inclure après config.js + supabase dans les pages connectées :
//   <script src="notifications.js"></script>
// Ajouter dans la nav : <div id="notif-bell-container"></div>
// ============================================================

const SternyNotifications = (() => {
    let notifs = [];
    let unreadCount = 0;
    let isOpen = false;
    let pollInterval = null;

    // Icônes par type de notification
    const ICONS = {
        candidature_recue: '📩',
        candidature_acceptee: '🎉',
        candidature_refusee: '❌',
        match_cree: '🤝',
        contrat_signe: '✍️',
        paiement_recu: '💰',
        paiement_confirme: '✅',
        avis_recu: '⭐',
        message_recu: '💬',
        annonce_expiree: '⏰',
        identite_verifiee: '🛡️',
        systeme: '🔔'
    };

    /**
     * Initialise le système de notifications
     */
    function init() {
        const container = document.getElementById('notif-bell-container');
        if (!container) return;

        // Créer le HTML de la cloche
        container.innerHTML = `
            <div id="notif-bell" style="position:relative;cursor:pointer;" onclick="SternyNotifications.toggle()">
                <svg width="22" height="22" fill="none" stroke="#475569" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 01-3.46 0"/>
                </svg>
                <span id="notif-badge" style="display:none;position:absolute;top:-4px;right:-6px;background:#EF4444;color:white;font-size:10px;font-weight:700;min-width:16px;height:16px;border-radius:8px;display:none;align-items:center;justify-content:center;padding:0 4px;line-height:1;"></span>
            </div>
            <div id="notif-dropdown" style="display:none;position:absolute;top:calc(100% + 8px);right:0;width:360px;max-height:420px;background:white;border:1.5px solid #E8EAF0;border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,0.12);z-index:1100;overflow:hidden;">
                <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #F1F5F9;">
                    <span style="font-size:15px;font-weight:700;color:#1E293B;">Notifications</span>
                    <a id="notif-mark-all" onclick="SternyNotifications.markAllRead()" style="font-size:12px;color:#E8622A;cursor:pointer;font-weight:600;display:none;">Tout marquer lu</a>
                </div>
                <div id="notif-list" style="max-height:340px;overflow-y:auto;"></div>
                <div id="notif-empty" style="display:none;text-align:center;padding:40px 20px;color:#9CA3AF;">
                    <div style="font-size:28px;margin-bottom:8px;">🔔</div>
                    <div style="font-size:13px;font-weight:500;">Aucune notification</div>
                </div>
            </div>
        `;

        // Style du container parent pour le positionnement
        container.style.position = 'relative';
        container.style.display = 'flex';
        container.style.alignItems = 'center';

        // Fermer au clic extérieur
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target) && isOpen) {
                close();
            }
        });

        // Charger les notifications
        charger();

        // Polling toutes les 30 secondes
        pollInterval = setInterval(charger, 30000);
    }

    /**
     * Charge les notifications depuis Supabase
     */
    async function charger() {
        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) return;

            const { data, error } = await supabaseClient
                .from('notifications_in_app')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(30);

            if (error) throw error;

            notifs = data || [];
            unreadCount = notifs.filter(n => !n.lu).length;
            updateBadge();

            if (isOpen) renderList();
        } catch (e) {
            console.log('Notifications: erreur chargement', e.message);
        }
    }

    /**
     * Met à jour le badge (nombre de non lues)
     */
    function updateBadge() {
        const badge = document.getElementById('notif-badge');
        if (!badge) return;

        if (unreadCount > 0) {
            badge.style.display = 'flex';
            badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
        } else {
            badge.style.display = 'none';
        }
    }

    /**
     * Affiche la liste des notifications dans le dropdown
     */
    function renderList() {
        const list = document.getElementById('notif-list');
        const empty = document.getElementById('notif-empty');
        const markAll = document.getElementById('notif-mark-all');
        if (!list) return;

        if (notifs.length === 0) {
            list.style.display = 'none';
            empty.style.display = 'block';
            markAll.style.display = 'none';
            return;
        }

        list.style.display = 'block';
        empty.style.display = 'none';
        markAll.style.display = unreadCount > 0 ? 'inline' : 'none';

        list.innerHTML = notifs.map(n => {
            const icon = ICONS[n.type] || '🔔';
            const ago = tempsRelatif(n.created_at);
            const bgColor = n.lu ? 'transparent' : 'rgba(232, 98, 42, 0.04)';
            const dot = n.lu ? '' : '<div style="width:8px;height:8px;border-radius:50%;background:#E8622A;flex-shrink:0;margin-top:5px;"></div>';

            return `
                <div onclick="SternyNotifications.click('${n.id}', ${n.lien ? "'" + n.lien + "'" : 'null'})"
                     style="display:flex;gap:10px;padding:12px 18px;cursor:pointer;transition:background 0.15s;background:${bgColor};border-bottom:1px solid #F8F9FA;"
                     onmouseover="this.style.background='#F8F9FA'" onmouseout="this.style.background='${bgColor}'">
                    <div style="font-size:18px;flex-shrink:0;margin-top:1px;">${icon}</div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:13px;font-weight:600;color:#1E293B;margin-bottom:2px;">${escapeNotifHtml(n.titre)}</div>
                        <div style="font-size:12px;color:#6B7280;line-height:1.4;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${escapeNotifHtml(n.message)}</div>
                        <div style="font-size:11px;color:#9CA3AF;margin-top:3px;">${ago}</div>
                    </div>
                    ${dot}
                </div>
            `;
        }).join('');
    }

    /**
     * Toggle ouverture/fermeture du dropdown
     */
    function toggle() {
        isOpen ? close() : open();
    }

    function open() {
        const dropdown = document.getElementById('notif-dropdown');
        if (dropdown) {
            dropdown.style.display = 'block';
            isOpen = true;
            renderList();
        }
    }

    function close() {
        const dropdown = document.getElementById('notif-dropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
            isOpen = false;
        }
    }

    /**
     * Clic sur une notification : marquer comme lue + rediriger
     */
    async function click(notifId, lien) {
        try {
            await supabaseClient
                .from('notifications_in_app')
                .update({ lu: true })
                .eq('id', notifId);
        } catch (e) { /* silently fail */ }

        // Mettre à jour localement
        const notif = notifs.find(n => n.id === notifId);
        if (notif && !notif.lu) {
            notif.lu = true;
            unreadCount = Math.max(0, unreadCount - 1);
            updateBadge();
            renderList();
        }

        if (lien) {
            window.location.href = lien;
        }
    }

    /**
     * Marquer toutes les notifications comme lues
     */
    async function markAllRead() {
        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) return;

            await supabaseClient
                .from('notifications_in_app')
                .update({ lu: true })
                .eq('user_id', user.id)
                .eq('lu', false);

            notifs.forEach(n => n.lu = true);
            unreadCount = 0;
            updateBadge();
            renderList();
        } catch (e) {
            console.log('Erreur markAllRead:', e.message);
        }
    }

    /**
     * Temps relatif (il y a X minutes/heures/jours)
     */
    function tempsRelatif(dateStr) {
        const now = new Date();
        const date = new Date(dateStr);
        const diffMs = now - date;
        const diffMin = Math.floor(diffMs / 60000);
        const diffH = Math.floor(diffMs / 3600000);
        const diffJ = Math.floor(diffMs / 86400000);

        if (diffMin < 1) return "À l'instant";
        if (diffMin < 60) return `Il y a ${diffMin} min`;
        if (diffH < 24) return `Il y a ${diffH}h`;
        if (diffJ < 7) return `Il y a ${diffJ}j`;
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }

    /**
     * Échapper le HTML pour éviter XSS
     */
    function escapeNotifHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Arrêter le polling (quand l'utilisateur se déconnecte)
     */
    function destroy() {
        if (pollInterval) clearInterval(pollInterval);
        pollInterval = null;
    }

    return { init, toggle, click, markAllRead, charger, destroy };
})();

// Auto-init au chargement si le conteneur existe
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('notif-bell-container')) {
        SternyNotifications.init();
    }
});
