import { Link } from 'react-router-dom';
import './PolitiqueRemboursementPage.css';

function PolitiqueRemboursementPage() {
    return (
        <div className="legal-page">
            <div className="legal-card">
                <Link to="/" className="btn-back-top">
                    <svg viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                    Retour
                </Link>

                <h1>Politique de remboursement</h1>
                <p className="legal-date">Derni&egrave;re mise &agrave; jour : 10 mars 2026</p>

                <h2>1. Principe g&eacute;n&eacute;ral</h2>
                <p>STERNY est une plateforme de mise en relation entre &eacute;tudiants en alternance et propri&eacute;taires/h&ocirc;tes proposant des logements. Les paiements effectu&eacute;s sur la plateforme correspondent aux frais de mise en relation et de service.</p>

                <h2>2. Frais de service STERNY</h2>
                <p>Les frais de service factur&eacute;s par STERNY lors de la validation d&rsquo;un match couvrent :</p>
                <ul>
                    <li>La mise en relation entre le locataire et le propri&eacute;taire/h&ocirc;te</li>
                    <li>La v&eacute;rification des profils et documents</li>
                    <li>L&rsquo;acc&egrave;s aux outils de la plateforme (messagerie, contrat, &eacute;tat des lieux)</li>
                </ul>

                <h2>3. Cas de remboursement</h2>
                <p>Un remboursement total ou partiel des frais de service peut &ecirc;tre accord&eacute; dans les cas suivants :</p>
                <ul>
                    <li><strong>Annulation avant emm&eacute;nagement</strong> : si le match est annul&eacute; avant la date d&rsquo;entr&eacute;e dans le logement, un remboursement int&eacute;gral des frais de service est effectu&eacute;</li>
                    <li><strong>Logement non conforme</strong> : si le logement ne correspond pas &agrave; la description de l&rsquo;annonce (surface, &eacute;quipements, localisation), un remboursement peut &ecirc;tre demand&eacute; sous 48h apr&egrave;s l&rsquo;&eacute;tat des lieux d&rsquo;entr&eacute;e</li>
                    <li><strong>Probl&egrave;me technique</strong> : en cas d&rsquo;erreur technique de la plateforme ayant entra&icirc;n&eacute; un double paiement ou un paiement erron&eacute;</li>
                </ul>

                <div className="highlight-box">
                    <strong>Important :</strong> Les loyers vers&eacute;s au propri&eacute;taire/h&ocirc;te ne sont pas g&eacute;r&eacute;s par STERNY et ne font pas l&rsquo;objet de cette politique. Tout litige concernant le loyer doit &ecirc;tre r&eacute;solu directement entre le locataire et le propri&eacute;taire.
                </div>

                <h2>4. Cas de non-remboursement</h2>
                <p>Aucun remboursement ne sera accord&eacute; dans les situations suivantes :</p>
                <ul>
                    <li>Le locataire quitte le logement de son propre chef avant la fin de la p&eacute;riode convenue</li>
                    <li>Le locataire ne se pr&eacute;sente pas &agrave; la date d&rsquo;emm&eacute;nagement pr&eacute;vue sans pr&eacute;venir</li>
                    <li>La demande de remboursement est effectu&eacute;e plus de 14 jours apr&egrave;s le paiement (sauf cas de logement non conforme)</li>
                    <li>Le locataire a enfreint les conditions g&eacute;n&eacute;rales d&rsquo;utilisation de la plateforme</li>
                </ul>

                <h2>5. Proc&eacute;dure de demande</h2>
                <p>Pour demander un remboursement :</p>
                <ul>
                    <li>Envoie un email &agrave; <strong>contact@sterny.fr</strong> en indiquant ton nom, email de connexion et le motif de la demande</li>
                    <li>Joins toute pi&egrave;ce justificative utile (photos, captures d&rsquo;&eacute;cran, &eacute;changes de messages)</li>
                    <li>La demande sera trait&eacute;e sous <strong>5 jours ouvr&eacute;s</strong></li>
                </ul>

                <h2>6. D&eacute;lai de remboursement</h2>
                <p>Si le remboursement est accept&eacute;, il sera effectu&eacute; dans un d&eacute;lai de <strong>10 jours ouvr&eacute;s</strong> sur le moyen de paiement utilis&eacute; lors de la transaction initiale (carte bancaire via Stripe).</p>

                <h2>7. Droit de r&eacute;tractation</h2>
                <p>Conform&eacute;ment &agrave; l&rsquo;article L221-28 du Code de la consommation, le droit de r&eacute;tractation ne s&rsquo;applique pas aux services pleinement ex&eacute;cut&eacute;s avant la fin du d&eacute;lai de r&eacute;tractation avec l&rsquo;accord pr&eacute;alable du consommateur. En acceptant un match et en acc&eacute;dant aux services associ&eacute;s, le locataire reconna&icirc;t que le service a commenc&eacute; &agrave; &ecirc;tre ex&eacute;cut&eacute;.</p>

                <h2>8. Contact</h2>
                <p>Pour toute question relative &agrave; cette politique, contacte-nous &agrave; <strong>contact@sterny.fr</strong>.</p>
            </div>

            <div className="legal-footer">
                <Link to="/cgu">CGU</Link>
                <span className="separator">|</span>
                <Link to="/cgv">CGV</Link>
                <span className="separator">|</span>
                <Link to="/mentions-legales">Mentions l&eacute;gales</Link>
                <span className="separator">|</span>
                <Link to="/politique-confidentialite">Confidentialit&eacute;</Link>
            </div>
        </div>
    );
}

export default PolitiqueRemboursementPage;
