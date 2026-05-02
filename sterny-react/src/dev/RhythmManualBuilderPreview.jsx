// Preview /dev/rhythm-manual-builder-preview — pas de layout, hors nav.
// Permet de tester visuellement les 2 cas villeRecherchee du composant
// RhythmManualBuilder. Cohérent avec RhythmCalendarPreview / RhythmFileUploadPreview.

import RhythmManualBuilder from '../components/rhythm/RhythmManualBuilder';

const containerStyle = {
  maxWidth: 1200,
  margin: '0 auto',
  padding: '40px 24px',
  fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif",
  background: '#F4F5F7',
  minHeight: '100vh',
};

const h1Style = {
  fontSize: 32,
  fontWeight: 800,
  color: '#1E293B',
  margin: 0,
  letterSpacing: '-1px',
};

const introStyle = {
  fontSize: 14,
  color: '#94A3B8',
  margin: '8px 0 60px 0',
  lineHeight: 1.6,
  maxWidth: 720,
};

const sectionStyle = {
  marginBottom: 60,
};

const h2Style = {
  fontSize: 24,
  fontWeight: 700,
  color: '#1E293B',
  margin: 0,
};

const subtitleStyle = {
  fontSize: 14,
  color: '#94A3B8',
  margin: '4px 0 24px 0',
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
};

export default function RhythmManualBuilderPreview() {
  return (
    <div style={containerStyle}>
      <h1 style={h1Style}>Preview RhythmManualBuilder</h1>
      <p style={introStyle}>
        Page de preview en cours de développement. Chemin 3 de la stratégie
        discriminante par format source (VISION §5). Cf. ETAT-COURANT bloc
        2026-04-30 soir bis.
      </p>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Recherche dans la ville d'école</h2>
        <p style={subtitleStyle}>villeRecherchee = 'ecole'</p>
        <RhythmManualBuilder
          villeRecherchee="ecole"
          onConfirm={(cal) => console.log('Confirmed (ecole):', cal)}
        />
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Recherche dans la ville d'entreprise</h2>
        <p style={subtitleStyle}>villeRecherchee = 'entreprise'</p>
        <RhythmManualBuilder
          villeRecherchee="entreprise"
          onConfirm={(cal) => console.log('Confirmed (entreprise):', cal)}
        />
      </section>
    </div>
  );
}
