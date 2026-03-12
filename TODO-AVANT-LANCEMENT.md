# TODO AVANT LANCEMENT EN PRODUCTION

## Sécurité (CRITIQUE)
- [ ] Remettre les policies RLS restrictives sur Supabase (candidatures, users, annonces, storage documents)
  - Actuellement : policies ouvertes pour le développement
  - À faire : restreindre les SELECT/UPDATE/INSERT aux seuls utilisateurs concernés
- [ ] Supprimer les comptes de test (Lucas Martin, Emma Dupont, Thomas Bernard, fausses candidatures)
- [ ] Supprimer les console.log de debug (completer-profil.html, etc.)

## Fonctionnalités à finaliser
- [x] Stripe Identity : vérification d'identité (modifier-profil.html étape Documents + webhook) ✅ FAIT
- [x] contrat-location.html : persistence de la signature (table contrats) ✅ FAIT
- [ ] paiement-initial.html : intégration Stripe Payments
- [ ] etat-des-lieux-entree.html : persistence en base (table etats_des_lieux)
- [ ] match-actif.html : calcul des jours restants
