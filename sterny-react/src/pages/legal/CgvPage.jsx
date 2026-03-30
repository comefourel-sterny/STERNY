import { Link } from 'react-router-dom';
import './CgvPage.css';

function CgvPage() {
    return (
        <section className="cgv-page">
            <div className="cgv-card">
                <Link to="/" className="btn-back-top">
                    <svg viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                    Retour
                </Link>
                <h1>Conditions G&eacute;n&eacute;rales de Vente</h1>
                <p className="cgv-date">Derni&egrave;re mise &agrave; jour : 1er mars 2026</p>

                <h2>Article 1 &ndash; Objet</h2>
                <p>Les pr&eacute;sentes Conditions G&eacute;n&eacute;rales de Vente (CGV) r&eacute;gissent les relations contractuelles entre STERNY, auto-entreprise immatricul&eacute;e sous le n&deg; SIRET [&Agrave; COMPL&Eacute;TER], ci-apr&egrave;s &laquo;&nbsp;la Plateforme&nbsp;&raquo;, et toute personne utilisant les services payants de la Plateforme, ci-apr&egrave;s &laquo;&nbsp;l&rsquo;Utilisateur&nbsp;&raquo;.</p>
                <p>STERNY est une plateforme d&rsquo;interm&eacute;diation qui met en relation des propri&eacute;taires de logements meubl&eacute;s avec des &eacute;tudiants en alternance recherchant un h&eacute;bergement. STERNY n&rsquo;est ni bailleur, ni locataire, ni garant.</p>

                <h2>Article 2 &ndash; Services propos&eacute;s</h2>
                <p>STERNY propose les services suivants :</p>
                <ul>
                    <li>Mise en relation entre propri&eacute;taires et &eacute;tudiants via un syst&egrave;me de matching</li>
                    <li>Gestion administrative du dossier locataire (pi&egrave;ces justificatives, garant)</li>
                    <li>G&eacute;n&eacute;ration et signature &eacute;lectronique du contrat de location meubl&eacute;e</li>
                    <li>Encaissement et reversement des loyers via prestataire de paiement s&eacute;curis&eacute; (Stripe)</li>
                    <li>R&eacute;alisation de l&rsquo;&eacute;tat des lieux d&rsquo;entr&eacute;e et de sortie d&eacute;mat&eacute;rialis&eacute;</li>
                </ul>

                <h2>Article 3 &ndash; Commission et tarification</h2>
                <p>3.1. Les services de STERNY sont gratuits pour les locataires (&eacute;tudiants).</p>
                <p>3.2. Le propri&eacute;taire s&rsquo;acquitte d&rsquo;une commission de service calcul&eacute;e en pourcentage du loyer hebdomadaire, int&eacute;gr&eacute;e au prix affich&eacute; sur la plateforme. Le taux de commission est indiqu&eacute; au propri&eacute;taire lors de la cr&eacute;ation de l&rsquo;annonce.</p>
                <p>3.3. La commission est pr&eacute;lev&eacute;e automatiquement sur chaque paiement de loyer avant reversement au propri&eacute;taire.</p>
                <p>3.4. Aucun frais suppl&eacute;mentaire n&rsquo;est factur&eacute; au locataire au titre de l&rsquo;interm&eacute;diation, conform&eacute;ment &agrave; l&rsquo;article 5 II de la loi n&deg; 89-462 du 6 juillet 1989.</p>

                <h2>Article 4 &ndash; Inscription et obligations des Utilisateurs</h2>
                <p>4.1. L&rsquo;inscription sur la Plateforme implique l&rsquo;acceptation pleine et enti&egrave;re des pr&eacute;sentes CGV.</p>
                <p>4.2. L&rsquo;Utilisateur s&rsquo;engage &agrave; fournir des informations exactes, compl&egrave;tes et &agrave; jour.</p>
                <p>4.3. Le propri&eacute;taire garantit qu&rsquo;il dispose de tous les droits n&eacute;cessaires pour mettre le logement en location et que celui-ci est conforme aux normes de d&eacute;cence (d&eacute;cret n&deg; 2002-120 du 30 janvier 2002).</p>
                <p>4.4. Le locataire garantit sa qualit&eacute; d&rsquo;&eacute;tudiant en alternance et s&rsquo;engage &agrave; fournir les justificatifs requis (certificat de scolarit&eacute;, attestation d&rsquo;assurance, RIB).</p>

                <h2>Article 5 &ndash; Contrat de location</h2>
                <p>5.1. Le contrat de location est conclu directement entre le propri&eacute;taire et le locataire. STERNY n&rsquo;est pas partie au contrat de bail.</p>
                <p>5.2. Le contrat de bail propos&eacute; par la Plateforme est conforme au contrat type d&eacute;fini par le d&eacute;cret n&deg; 2015-587 du 29 mai 2015 (annexe 2 &ndash; logement meubl&eacute;).</p>
                <p>5.3. La signature &eacute;lectronique appos&eacute;e via la Plateforme a la m&ecirc;me valeur juridique qu&rsquo;une signature manuscrite, conform&eacute;ment &agrave; l&rsquo;article 1367 du Code civil.</p>

                <h2>Article 6 &ndash; Paiements</h2>
                <p>6.1. Les paiements sont trait&eacute;s par le prestataire Stripe, dans le respect des normes PCI-DSS.</p>
                <p>6.2. Le loyer est payable d&rsquo;avance, au premier jour de chaque semaine.</p>
                <p>6.3. Le d&eacute;p&ocirc;t de garantie est encaiss&eacute; lors de la signature du contrat et conserv&eacute; sur un compte s&eacute;questre jusqu&rsquo;&agrave; la fin du bail.</p>
                <p>6.4. En cas d&rsquo;impay&eacute;, STERNY se r&eacute;serve le droit de suspendre l&rsquo;acc&egrave;s aux services de la Plateforme.</p>

                <h2>Article 7 &ndash; Droit de r&eacute;tractation</h2>
                <p>7.1. Conform&eacute;ment &agrave; l&rsquo;article L.221-28 du Code de la consommation, le droit de r&eacute;tractation ne s&rsquo;applique pas aux prestations de services d&rsquo;h&eacute;bergement fournies &agrave; une date d&eacute;termin&eacute;e.</p>
                <p>7.2. Toutefois, le locataire peut r&eacute;silier le bail &agrave; tout moment moyennant le respect du pr&eacute;avis d&rsquo;un mois pr&eacute;vu au contrat de location.</p>

                <h2>Article 8 &ndash; Responsabilit&eacute;</h2>
                <p>8.1. STERNY agit en qualit&eacute; d&rsquo;interm&eacute;diaire et ne saurait &ecirc;tre tenue responsable des obligations respectives du bailleur et du locataire au titre du contrat de location.</p>
                <p>8.2. STERNY ne garantit pas la conformit&eacute; du logement, sa salubrit&eacute; ou son ad&eacute;quation aux besoins du locataire. Ces v&eacute;rifications incombent aux parties.</p>
                <p>8.3. STERNY met tout en &oelig;uvre pour assurer la disponibilit&eacute; et la s&eacute;curit&eacute; de la Plateforme, sans obligation de r&eacute;sultat.</p>

                <h2>Article 9 &ndash; Donn&eacute;es personnelles</h2>
                <p>Les donn&eacute;es personnelles des Utilisateurs sont trait&eacute;es conform&eacute;ment &agrave; notre Politique de Confidentialit&eacute;, accessible &agrave; l&rsquo;adresse <Link to="/politique-confidentialite" style={{ color: '#E8622A', textDecoration: 'none' }}>politique-confidentialite</Link>, et dans le respect du R&egrave;glement G&eacute;n&eacute;ral sur la Protection des Donn&eacute;es (RGPD &ndash; R&egrave;glement UE 2016/679).</p>

                <h2>Article 10 &ndash; Propri&eacute;t&eacute; intellectuelle</h2>
                <p>L&rsquo;ensemble des &eacute;l&eacute;ments composant la Plateforme (textes, images, logos, code source) sont la propri&eacute;t&eacute; exclusive de STERNY. Toute reproduction, m&ecirc;me partielle, est interdite sans autorisation pr&eacute;alable &eacute;crite.</p>

                <h2>Article 11 &ndash; M&eacute;diation et litiges</h2>
                <p>11.1. En cas de litige, les parties s&rsquo;engagent &agrave; rechercher une solution amiable.</p>
                <p>11.2. &Agrave; d&eacute;faut d&rsquo;accord, le consommateur peut recourir gratuitement au service de m&eacute;diation [&Agrave; COMPL&Eacute;TER &ndash; m&eacute;diateur de la consommation] conform&eacute;ment aux articles L.612-1 et suivants du Code de la consommation.</p>
                <p>11.3. Le tribunal comp&eacute;tent est celui du lieu de r&eacute;sidence du d&eacute;fendeur ou, au choix du demandeur consommateur, celui du lieu de livraison effective du service.</p>

                <h2>Article 12 &ndash; Modification des CGV</h2>
                <p>STERNY se r&eacute;serve le droit de modifier les pr&eacute;sentes CGV &agrave; tout moment. Les Utilisateurs seront inform&eacute;s de toute modification par notification sur la Plateforme. Les CGV applicables sont celles en vigueur &agrave; la date de la transaction.</p>

                <h2>Article 13 &ndash; Droit applicable</h2>
                <p>Les pr&eacute;sentes CGV sont soumises au droit fran&ccedil;ais. En cas de litige, et &agrave; d&eacute;faut de r&eacute;solution amiable, les tribunaux fran&ccedil;ais seront seuls comp&eacute;tents.</p>
            </div>

            <div className="cgv-footer">
                <Link to="/mentions-legales">Mentions l&eacute;gales</Link>
                <span className="separator">|</span>
                <Link to="/cgu">CGU</Link>
                <span className="separator">|</span>
                <Link to="/politique-confidentialite">Politique de confidentialit&eacute;</Link>
            </div>
        </section>
    );
}

export default CgvPage;
