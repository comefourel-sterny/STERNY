import RhythmCalendar from '../components/rhythm/RhythmCalendar';
import martinFixture from './fixtures/martin.json';
import mathisFixture from './fixtures/mathis.json';
import '../pages/dashboard/DashboardProprietairePage.css';
import './RhythmCalendarPreview.css';

const FIXTURES = [
  {
    name: 'Martin',
    importId: '69a564e5-1444-4a6b-940c-0d9222fcee7d',
    label: 'IUT Saint-Malo, BUT 3 GEA 2026/2027',
    fixture: martinFixture,
    fixtureFilename: 'martin.json',
  },
  {
    name: 'Mathis',
    importId: '0ff13d90-c148-492c-a718-c4e57505c258',
    label: 'Hyperplanning PDF, R_CA_A3',
    fixture: mathisFixture,
    fixtureFilename: 'mathis.json',
  },
];

const SUBSECTION_TITLE_STYLE = {
  fontSize: 13,
  fontWeight: 600,
  color: 'rgba(30, 41, 59, 0.6)',
  textTransform: 'uppercase',
  letterSpacing: 1,
  margin: '0 0 12px',
};

function FixtureBlock({ name, importId, label, fixture, fixtureFilename }) {
  const groups = fixture.groups || [];
  const meta = fixture.document_meta;
  const group = groups[0];

  return (
    <section style={{ marginBottom: 48 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>
        Fixture : {name}
      </h2>
      <p style={{ color: 'rgba(30, 41, 59, 0.6)', fontSize: 13, margin: '0 0 24px' }}>
        {label} · <code>rhythm_imports.id = {importId}</code>
        {group ? <> · groupe affiché : <code>{group.group_label}</code></> : null}
      </p>

      {!group ? (
        <div className="rcp-empty">
          Aucun groupe dans la fixture. Remplir <code>{fixtureFilename}</code> avec
          le résultat de la requête SQL (voir <code>fixtures/README.md</code>).
        </div>
      ) : (
        <>
          {/* Section 1 — Contexte dashboard cible */}
          <div style={{ marginBottom: 32 }}>
            <h3 style={SUBSECTION_TITLE_STYLE}>
              1. Contexte dashboard (cible)
            </h3>
            <div className="dp-card">
              <h3 className="dp-card-title">
                <span aria-hidden="true">📅</span>
                MON RYTHME D'ALTERNANCE
              </h3>
              <RhythmCalendar
                weeks={group.weeks}
                groupLabel={group.group_label}
                documentMeta={meta}
              />
            </div>
          </div>

          {/* Section 2 — Contexte onboarding (nu) */}
          <div style={{ marginBottom: 32 }}>
            <h3 style={SUBSECTION_TITLE_STYLE}>
              2. Contexte onboarding (nu)
            </h3>
            <RhythmCalendar
              weeks={group.weeks}
              groupLabel={group.group_label}
              documentMeta={meta}
            />
          </div>
        </>
      )}
    </section>
  );
}

export default function RhythmCalendarPreview() {
  return (
    <div className="dashboard-proprio-container">
      <header className="rcp-header">
        <h1>RhythmCalendar — preview de validation Étape 1</h1>
        <p>
          Outil de développement uniquement. Pour chaque fixture, le composant est
          affiché dans 2 contextes : (1) wrap dashboard cible via{' '}
          <code>.dp-card</code> + <code>.dp-card-title</code>, (2) onboarding nu sans
          contenant. Route hors layout, rendue avec le wrap container{' '}
          <code>.dashboard-proprio-container</code> pour simuler le contexte dashboard.
        </p>
      </header>

      {FIXTURES.map((f) => (
        <FixtureBlock key={f.name} {...f} />
      ))}
    </div>
  );
}
