import './EmailMatchConfirmationPage.css'

export default function EmailMatchConfirmationPage() {
  return (
    <div className="email-match-page">
      <div className="email-preheader">
        Ton match logement est trouve ! Decouvre ton futur coloc et ton appartement sur STERNY.
      </div>

      <table role="presentation" cellSpacing="0" cellPadding="0" border="0" width="100%" style={{ backgroundColor: '#F4F5F7' }}>
        <tbody><tr><td align="center" style={{ padding: 0 }}>

          {/* LOGO BAR */}
          <table role="presentation" cellSpacing="0" cellPadding="0" border="0" width="100%" style={{ backgroundColor: '#FFFFFF' }}>
            <tbody><tr><td align="center" style={{ padding: '18px 0 16px' }}>
              <img src="https://i.imgur.com/8xJzsjt.png" alt="STERNY" width="130" style={{ display: 'block', width: '130px', height: 'auto' }} />
            </td></tr></tbody>
          </table>

          {/* HERO */}
          <table role="presentation" cellSpacing="0" cellPadding="0" border="0" width="100%" style={{ backgroundColor: '#1E293B' }}>
            <tbody><tr><td align="center" style={{ padding: '40px 24px 44px', textAlign: 'center' }}>
              <table role="presentation" cellSpacing="0" cellPadding="0" border="0" align="center" style={{ margin: '0 auto 18px' }}>
                <tbody><tr><td style={{ borderRadius: '100px', padding: '6px 16px 6px 8px', backgroundColor: '#1a3a2a' }}>
                  <table role="presentation" cellSpacing="0" cellPadding="0" border="0"><tbody><tr>
                    <td valign="middle" style={{ paddingRight: '9px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#22C55E', textAlign: 'center', lineHeight: '28px' }}>
                        <img src="https://i.imgur.com/0aw7u9j.png" alt="" width="14" height="14" style={{ verticalAlign: 'middle' }} />
                      </div>
                    </td>
                    <td valign="middle" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '13px', fontWeight: 'bold', color: '#86EFAC' }}>
                      Match confirme
                    </td>
                  </tr></tbody></table>
                </td></tr></tbody>
              </table>

              <h1 style={{ margin: '0 0 8px', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '26px', fontWeight: 'bold', color: '#FFFFFF', lineHeight: '34px' }}>
                Votre logement est trouve !
              </h1>
              <p style={{ margin: 0, fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '14px', color: '#8896AB', lineHeight: '21px' }}>
                Vous pouvez maintenant lancer les demarches de location.
              </p>
            </td></tr></tbody>
          </table>

          {/* CARDS */}
          <table role="presentation" cellSpacing="0" cellPadding="0" border="0" width="680" align="center" style={{ maxWidth: '680px', width: '100%' }}>
            <tbody><tr><td style={{ padding: '16px 24px 0' }}>

              {/* CARD 1: Annonce + Details */}
              <table role="presentation" cellSpacing="0" cellPadding="0" border="0" width="100%" style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', marginBottom: '12px' }}>
                <tbody>
                  <tr><td style={{ padding: '24px 28px 20px' }}>
                    <table role="presentation" cellSpacing="0" cellPadding="0" border="0" width="100%"><tbody><tr>
                      <td valign="top" width="72" style={{ paddingRight: '16px' }}>
                        <div style={{ width: '72px', height: '72px', borderRadius: '10px', backgroundColor: '#3D4F63', textAlign: 'center', lineHeight: '72px' }}>
                          <img src="https://i.imgur.com/Ho7BSWz.png" alt="" width="28" height="28" style={{ verticalAlign: 'middle' }} />
                        </div>
                      </td>
                      <td valign="top" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
                        <p style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 'bold', color: '#1E293B', lineHeight: '20px' }}>Chambre lumineuse centre Lyon</p>
                        <span style={{ backgroundColor: '#F1F5F9', borderRadius: '5px', padding: '3px 9px', fontSize: '11px', color: '#64748B', marginRight: '4px' }}>Lyon</span>
                        <span style={{ backgroundColor: '#F1F5F9', borderRadius: '5px', padding: '3px 9px', fontSize: '11px', color: '#64748B', marginRight: '4px' }}>Chambre</span>
                        <span style={{ backgroundColor: '#F1F5F9', borderRadius: '5px', padding: '3px 9px', fontSize: '11px', color: '#64748B' }}>14m²</span>
                      </td>
                    </tr></tbody></table>
                  </td></tr>
                  <tr><td style={{ padding: 0, borderTop: '1px solid #F1F5F9' }}>
                    <table role="presentation" cellSpacing="0" cellPadding="0" border="0" width="100%"><tbody><tr>
                      {[
                        { label: 'Ville', value: 'Lyon', color: '#1E293B' },
                        { label: 'Loyer / sem', value: '95 \u20ac/sem', color: '#E85D2A' },
                        { label: 'Debut', value: '01/09/2026', color: '#1E293B' },
                        { label: 'Fin', value: '30/06/2027', color: '#1E293B' },
                      ].map((col, i) => (
                        <td key={i} width="25%" style={{ padding: '16px 8px', textAlign: 'center', borderRight: i < 3 ? '1px solid #F1F5F9' : 'none', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                          <p style={{ margin: '0 0 4px', fontSize: '10px', fontWeight: 'bold', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{col.label}</p>
                          <p style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: col.color }}>{col.value}</p>
                        </td>
                      ))}
                    </tr></tbody></table>
                  </td></tr>
                </tbody>
              </table>

              {/* CARD 2: Participants */}
              <table role="presentation" cellSpacing="0" cellPadding="0" border="0" width="100%" style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', marginBottom: '12px' }}>
                <tbody><tr><td style={{ padding: '24px 28px' }}>
                  <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '3px', height: '12px', backgroundColor: '#E8622A', borderRadius: '2px' }}></div>
                    <span style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Participants</span>
                  </div>

                  {[
                    { name: 'Lucas Martin', role: 'Etudiant', email: 'lucas@exemple.com', tel: '07 98 76 54 32', bg: '#E8622A' },
                    { name: 'Emma Lefevre', role: 'Etudiant', email: 'emma@exemple.com', tel: '06 45 67 89 01', bg: '#64748B' },
                  ].map((p, i) => (
                    <div key={i}>
                      {i > 0 && <div style={{ borderTop: '1px solid #F1F5F9', height: '1px' }}></div>}
                      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 0' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: p.bg, textAlign: 'center', lineHeight: '38px', marginRight: '14px', flexShrink: 0 }}>
                          <img src="https://i.imgur.com/V2Fu4U5.png" alt="" width="16" height="16" style={{ verticalAlign: 'middle' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#1E293B' }}>{p.name}</p>
                          <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94A3B8' }}>{p.role}</p>
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>
                          {p.email} &middot; {p.tel}
                        </div>
                      </div>
                    </div>
                  ))}

                  <div style={{ backgroundColor: '#F0FDF4', borderRadius: '8px', padding: '10px 14px', marginTop: '10px', fontSize: '12px', color: '#166534' }}>
                    Logement appartenant a <strong>Marie Dupont</strong>
                  </div>
                </td></tr></tbody>
              </table>

              {/* INFO LINE */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '12px 16px', marginBottom: '12px', fontSize: '13px', color: '#64748B', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                Confirmation envoyee par email &mdash; conservez-le precieusement.
              </div>

              {/* BUTTONS */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <a href="https://sterny.co/match?token=abc123" target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: 'block', padding: '13px 10px', borderRadius: '10px', border: '2px solid #E2E8F0', backgroundColor: '#FFFFFF', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '13px', fontWeight: 'bold', color: '#1E293B', textDecoration: 'none', textAlign: 'center' }}>
                  Envoyer un message
                </a>
                <a href="https://sterny.co/match?token=abc123" target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: 'block', padding: '13px 10px', borderRadius: '10px', backgroundColor: '#1E293B', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '13px', fontWeight: 'bold', color: '#FFFFFF', textDecoration: 'none', textAlign: 'center' }}>
                  Continuer les demarches &rarr;
                </a>
              </div>

            </td></tr></tbody>
          </table>

          {/* FOOTER */}
          <table role="presentation" cellSpacing="0" cellPadding="0" border="0" width="680" align="center" style={{ maxWidth: '680px', width: '100%' }}>
            <tbody><tr><td align="center" style={{ padding: '32px 36px 24px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
              <img src="https://i.imgur.com/pAYCChh.png" alt="STERNY" width="28" style={{ display: 'block', width: '28px', height: 'auto', margin: '0 auto 12px', opacity: 0.4 }} />
              <p style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: 'bold', color: '#94A3B8' }}>STERNY</p>
              <p style={{ margin: '0 0 14px', fontSize: '11px', color: '#CBD5E1' }}>La colocation en alternance, simplifiee.</p>
              <p style={{ margin: 0, fontSize: '11px', color: '#CBD5E1' }}>
                <a href="#" style={{ color: '#94A3B8', textDecoration: 'underline' }}>Se desinscrire</a>
                <span style={{ padding: '0 6px', color: '#D1D5DB' }}>&middot;</span>
                <a href="#" style={{ color: '#94A3B8', textDecoration: 'underline' }}>Mentions legales</a>
              </p>
            </td></tr></tbody>
          </table>

        </td></tr></tbody>
      </table>
    </div>
  )
}
