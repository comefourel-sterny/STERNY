-- COPIE-COLLE TOUT ET CLIQUE RUN

DO $$
DECLARE
    thomas_id uuid := '613ed0a0-b7ce-4c86-9736-78e71ad65d80';
    candidat1_id uuid;
    candidat2_id uuid;
    annonce_brest_id uuid;
    annonce_rennes_1 uuid;
    annonce_rennes_2 uuid;
    annonce_rennes_3 uuid;
    annonce_rennes_4 uuid;
BEGIN

    -- Trouver 2 autres users pour les candidatures
    SELECT id INTO candidat1_id FROM users WHERE id != thomas_id AND type_user != 'proprietaire' LIMIT 1;
    SELECT id INTO candidat2_id FROM users WHERE id != thomas_id AND type_user != 'proprietaire' AND (candidat1_id IS NULL OR id != candidat1_id) LIMIT 1;

    -- 1. Profil de Thomas (hôte + recherche, profil complet)
    UPDATE users SET
        statut_ville_ecole = 'hote',
        statut_ville_entreprise = 'recherche',
        ville_ecole = 'Brest',
        ville_entreprise = 'Rennes',
        ecole = 'ISEN Brest',
        filiere = 'Ingénieur informatique',
        annee_etudes = '4ème année',
        date_naissance = '2002-06-15',
        sexe = 'homme',
        telephone = '06 55 44 33 22',
        rythme_alternance = '3/1',
        a_logement = true,
        profil_complet = true
    WHERE id = thomas_id;

    -- 2. Mise en relation validée avec Marie Leroy
    -- Supprimer les anciennes mises en relation de Thomas puis insérer la bonne
    DELETE FROM mises_en_relation WHERE user_id = thomas_id;
    INSERT INTO mises_en_relation (user_id, email_proprietaire, prenom_user, nom_user, ville, statut)
    VALUES (thomas_id, 'marie.leroy@test-sterny.fr', 'Thomas', 'Bernard', 'Brest', 'validee');

    -- 3. Annonce de Thomas à Brest
    INSERT INTO annonces (user_id, titre, description, type_logement, ville, surface, pieces, etage, prix, equipements, regles, photos, disponible, adresse)
    VALUES (
        thomas_id,
        'Studio lumineux proche ISEN Brest',
        'Joli studio meublé de 22m² à 5 min à pied de l''ISEN. Cuisine équipée, coin bureau. Calme et lumineux, 3ème étage avec ascenseur.',
        'Studio', 'Brest', 22, 1, '3ème', 95,
        '["WiFi", "Machine à laver", "Cuisine équipée", "Bureau", "Chauffage inclus"]',
        '["Non-fumeur", "Pas d''animaux"]',
        '["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600", "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600", "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600"]',
        true, '12 rue de Siam, 29200 Brest'
    ) RETURNING id INTO annonce_brest_id;

    -- 4. 2 candidatures reçues sur l'annonce de Thomas
    IF candidat1_id IS NOT NULL THEN
        INSERT INTO candidatures (annonce_id, locataire_id, message, statut)
        VALUES (annonce_brest_id, candidat1_id, 'Salut Thomas ! Je suis en alternance chez Thales à Brest et je cherche un logement. Ton studio a l''air parfait !', 'en_attente');
    END IF;
    IF candidat2_id IS NOT NULL THEN
        INSERT INTO candidatures (annonce_id, locataire_id, message, statut)
        VALUES (annonce_brest_id, candidat2_id, 'Bonjour ! Je suis étudiante à l''UBO en alternance, je cherche un studio à Brest. Ton annonce correspond parfaitement !', 'en_attente');
    END IF;

    -- 5. 4 annonces à Rennes (pour favoris)
    INSERT INTO annonces (user_id, titre, type_logement, ville, surface, prix, photos, disponible, description)
    VALUES (thomas_id, 'Chambre en coloc centre Rennes', 'Chambre', 'Rennes', 14, 75, '["https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600"]', true, 'Chambre meublée en colocation, quartier Sainte-Anne.')
    RETURNING id INTO annonce_rennes_1;

    INSERT INTO annonces (user_id, titre, type_logement, ville, surface, prix, photos, disponible, description)
    VALUES (thomas_id, 'Studio Rennes gare', 'Studio', 'Rennes', 20, 110, '["https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600"]', true, 'Studio fonctionnel à 2 min de la gare.')
    RETURNING id INTO annonce_rennes_2;

    INSERT INTO annonces (user_id, titre, type_logement, ville, surface, prix, photos, disponible, description)
    VALUES (thomas_id, 'T2 lumineux Villejean', 'T2', 'Rennes', 35, 130, '["https://images.unsplash.com/photo-1484154218962-a197022b5858?w=600"]', true, 'T2 proche campus Villejean, meublé et équipé.')
    RETURNING id INTO annonce_rennes_3;

    INSERT INTO annonces (user_id, titre, type_logement, ville, surface, prix, photos, disponible, description)
    VALUES (thomas_id, 'Chambre chez l''habitant Beaulieu', 'Chambre', 'Rennes', 12, 65, '["https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=600"]', true, 'Chambre calme quartier Beaulieu, proche bus C4.')
    RETURNING id INTO annonce_rennes_4;

    -- 6. 4 favoris
    INSERT INTO favoris (user_id, annonce_id) VALUES
    (thomas_id, annonce_rennes_1),
    (thomas_id, annonce_rennes_2),
    (thomas_id, annonce_rennes_3),
    (thomas_id, annonce_rennes_4);

    -- 7. 2 candidatures envoyées par Thomas (mode recherche)
    INSERT INTO candidatures (annonce_id, locataire_id, message, statut) VALUES
    (annonce_rennes_1, thomas_id, 'Bonjour, je suis alternant à Rennes 3 semaines par mois. Votre chambre m''intéresse beaucoup !', 'en_attente'),
    (annonce_rennes_2, thomas_id, 'Salut ! Le studio me correspond parfaitement pour mon alternance. Dispo pour visiter.', 'acceptee');

    RAISE NOTICE '🎉 TOUT EST OK !';

END $$;
