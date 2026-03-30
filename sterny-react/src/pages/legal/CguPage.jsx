import { Link } from 'react-router-dom';
import './CguPage.css';

function CguPage() {
    return (
        <section className="page-cgu">
            <div className="cgu-card">
                <Link to="/" className="btn-back-top">
                    Retour
                </Link>
                <h1>Conditions G&eacute;n&eacute;rales d&rsquo;Utilisation</h1>
                <p className="last-updated">Derni&egrave;re mise &agrave; jour : 1<sup>er</sup> mars 2026</p>

                {/* Article 1 */}
                <h2>Article 1 &ndash; D&eacute;finitions</h2>
                <ul>
                    <li>&laquo;&nbsp;Plateforme&nbsp;&raquo; : le site web STERNY accessible &agrave; l&rsquo;adresse <a href="https://www.sterny.co">www.sterny.co</a></li>
                    <li>&laquo;&nbsp;Utilisateur&nbsp;&raquo; : toute personne acc&eacute;dant &agrave; la Plateforme, qu&rsquo;elle soit inscrite ou non</li>
                    <li>&laquo;&nbsp;Membre&nbsp;&raquo; : tout Utilisateur ayant cr&eacute;&eacute; un compte sur la Plateforme</li>
                    <li>&laquo;&nbsp;Propri&eacute;taire&nbsp;&raquo; : Membre proposant un logement meubl&eacute; &agrave; la location</li>
                    <li>&laquo;&nbsp;Locataire&nbsp;&raquo; ou &laquo;&nbsp;&Eacute;tudiant&nbsp;&raquo; : Membre recherchant un logement dans le cadre de son alternance</li>
                    <li>&laquo;&nbsp;Annonce&nbsp;&raquo; : offre de location publi&eacute;e par un Propri&eacute;taire sur la Plateforme</li>
                    <li>&laquo;&nbsp;Match&nbsp;&raquo; : accord mutuel entre un Propri&eacute;taire et un Locataire pour conclure un bail</li>
                    <li>&laquo;&nbsp;Services&nbsp;&raquo; : ensemble des fonctionnalit&eacute;s propos&eacute;es par la Plateforme</li>
                </ul>

                {/* Article 2 */}
                <h2>Article 2 &ndash; Objet</h2>
                <p>Les pr&eacute;sentes CGU d&eacute;finissent les conditions d&rsquo;acc&egrave;s et d&rsquo;utilisation de la Plateforme STERNY. L&rsquo;acc&egrave;s &agrave; la Plateforme implique l&rsquo;acceptation sans r&eacute;serve des pr&eacute;sentes CGU.</p>

                {/* Article 3 */}
                <h2>Article 3 &ndash; Acc&egrave;s &agrave; la Plateforme</h2>
                <p>3.1. L&rsquo;acc&egrave;s &agrave; la consultation des annonces est libre et gratuit.</p>
                <p>3.2. La candidature &agrave; un logement, la publication d&rsquo;annonces et l&rsquo;acc&egrave;s aux services de gestion n&eacute;cessitent la cr&eacute;ation d&rsquo;un compte Membre.</p>
                <p>3.3. STERNY se r&eacute;serve le droit de suspendre ou supprimer tout compte ne respectant pas les pr&eacute;sentes CGU.</p>

                {/* Article 4 */}
                <h2>Article 4 &ndash; Cr&eacute;ation de compte</h2>
                <p>4.1. L&rsquo;inscription est ouverte aux personnes physiques majeures, ou mineures avec l&rsquo;autorisation de leur repr&eacute;sentant l&eacute;gal.</p>
                <p>4.2. Le Membre s&rsquo;engage &agrave; fournir des informations exactes et &agrave; maintenir son profil &agrave; jour.</p>
                <p>4.3. Le Membre est responsable de la confidentialit&eacute; de ses identifiants de connexion. Toute utilisation de son compte est r&eacute;put&eacute;e faite par lui.</p>
                <p>4.4. Un seul compte par personne est autoris&eacute;.</p>

                {/* Article 5 */}
                <h2>Article 5 &ndash; Publication d&rsquo;annonces</h2>
                <p>5.1. Le Propri&eacute;taire s&rsquo;engage &agrave; publier des annonces v&eacute;ridiques, compl&egrave;tes et conformes au logement propos&eacute;.</p>
                <p>5.2. Le logement doit respecter les crit&egrave;res de d&eacute;cence d&eacute;finis par le d&eacute;cret n&deg;&nbsp;2002-120 du 30&nbsp;janvier&nbsp;2002.</p>
                <p>5.3. Les photos doivent &ecirc;tre r&eacute;centes et repr&eacute;sentatives du logement.</p>
                <p>5.4. STERNY se r&eacute;serve le droit de refuser, modifier ou supprimer toute annonce non conforme aux pr&eacute;sentes CGU ou aux dispositions l&eacute;gales en vigueur.</p>
                <p>5.5. Le prix affich&eacute; inclut la commission STERNY et correspond au loyer hebdomadaire charges comprises d&ucirc; par le locataire.</p>

                {/* Article 6 */}
                <h2>Article 6 &ndash; Candidatures et matching</h2>
                <p>6.1. Le Locataire peut postuler aux annonces correspondant &agrave; son profil.</p>
                <p>6.2. Le Propri&eacute;taire est libre d&rsquo;accepter ou de refuser toute candidature, sous r&eacute;serve du respect des dispositions de la loi n&deg;&nbsp;2008-496 du 27&nbsp;mai&nbsp;2008 relative &agrave; la lutte contre les discriminations.</p>
                <p>6.3. Un match est confirm&eacute; lorsque les deux parties ont donn&eacute; leur accord. Il engage les parties &agrave; poursuivre le processus (dossier, contrat, paiement).</p>

                {/* Article 7 */}
                <h2>Article 7 &ndash; Comportement des Utilisateurs</h2>
                <p>Il est interdit de :</p>
                <ul>
                    <li>Publier du contenu faux, trompeur, diffamatoire ou contraire &agrave; l&rsquo;ordre public</li>
                    <li>Usurper l&rsquo;identit&eacute; d&rsquo;un tiers</li>
                    <li>Utiliser la Plateforme &agrave; des fins autres que la location de logement meubl&eacute; &eacute;tudiant</li>
                    <li>Contourner le syst&egrave;me de paiement de la Plateforme pour traiter directement avec l&rsquo;autre partie</li>
                    <li>Harceler, menacer ou discriminer tout autre Utilisateur</li>
                    <li>Utiliser des robots, scripts ou tout autre moyen automatis&eacute; pour acc&eacute;der &agrave; la Plateforme</li>
                </ul>

                {/* Article 8 */}
                <h2>Article 8 &ndash; Messagerie</h2>
                <p>8.1. La Plateforme met &agrave; disposition un syst&egrave;me de messagerie entre Membres.</p>
                <p>8.2. Les &eacute;changes doivent rester courtois et en lien avec la location.</p>
                <p>8.3. STERNY se r&eacute;serve le droit de mod&eacute;rer les messages en cas de signalement.</p>

                {/* Article 9 */}
                <h2>Article 9 &ndash; Responsabilit&eacute;</h2>
                <p>9.1. STERNY est un interm&eacute;diaire technique. La Plateforme ne visite pas les logements et ne v&eacute;rifie pas leur conformit&eacute;.</p>
                <p>9.2. STERNY ne peut &ecirc;tre tenue responsable des litiges entre Propri&eacute;taires et Locataires.</p>
                <p>9.3. STERNY met en &oelig;uvre les moyens raisonnables pour assurer la disponibilit&eacute; de la Plateforme, sans obligation de r&eacute;sultat.</p>
                <p>9.4. En cas d&rsquo;indisponibilit&eacute; temporaire, STERNY ne sera pas redevable de dommages et int&eacute;r&ecirc;ts.</p>

                {/* Article 10 */}
                <h2>Article 10 &ndash; Propri&eacute;t&eacute; intellectuelle</h2>
                <p>Tous les &eacute;l&eacute;ments de la Plateforme (logo, textes, design, code source, bases de donn&eacute;es) sont prot&eacute;g&eacute;s par le droit de la propri&eacute;t&eacute; intellectuelle. Toute reproduction non autoris&eacute;e est passible de poursuites.</p>

                {/* Article 11 */}
                <h2>Article 11 &ndash; Donn&eacute;es personnelles</h2>
                <p>Le traitement des donn&eacute;es personnelles est d&eacute;taill&eacute; dans notre <Link to="/politique-confidentialite">Politique de Confidentialit&eacute;</Link>. En utilisant la Plateforme, l&rsquo;Utilisateur consent au traitement de ses donn&eacute;es dans les conditions d&eacute;crites.</p>

                {/* Article 12 */}
                <h2>Article 12 &ndash; Modification des CGU</h2>
                <p>STERNY peut modifier les pr&eacute;sentes CGU &agrave; tout moment. Les Utilisateurs seront inform&eacute;s des modifications par affichage sur la Plateforme. La poursuite de l&rsquo;utilisation vaut acceptation des nouvelles CGU.</p>

                {/* Article 13 */}
                <h2>Article 13 &ndash; Droit applicable et litiges</h2>
                <p>Les pr&eacute;sentes CGU sont r&eacute;gies par le droit fran&ccedil;ais. En cas de litige, les parties s&rsquo;engagent &agrave; rechercher une solution amiable avant toute action judiciaire. &Agrave; d&eacute;faut, les tribunaux fran&ccedil;ais seront comp&eacute;tents.</p>
            </div>

            {/* LIENS VERS AUTRES PAGES LEGALES */}
            <div className="footer-legal">
                <Link to="/mentions-legales">Mentions l&eacute;gales</Link>
                <Link to="/politique-confidentialite">Politique de confidentialit&eacute;</Link>
                <Link to="/cgv">CGV</Link>
            </div>
        </section>
    );
}

export default CguPage;
