import RhythmCalendar from '../components/rhythm/RhythmCalendar';
import martinFixture from './fixtures/martin.json';
import mathisFixture from './fixtures/mathis.json';
import './RhythmCalendarPreview.css';

function FixtureSection({ title, importId, fixture, fixtureFilename }) {
  const groups = fixture.groups || [];
  const meta = fixture.document_meta;
  return (
    <section className="rcp-fixture">
      <h2 className="rcp-fixture-title">{title}</h2>
      <p className="rcp-fixture-meta">
        rhythm_imports.id = <code>{importId}</code> · {groups.length} groupe(s)
      </p>
      {groups.length === 0 ? (
        <div className="rcp-empty">
          Aucun groupe dans la fixture. Remplir <code>{fixtureFilename}</code> avec le résultat de la requête SQL (voir <code>fixtures/README.md</code>).
        </div>
      ) : (
        <div className="rcp-grid">
          {groups.map(group => (
            <RhythmCalendar
              key={group.group_id}
              weeks={group.weeks}
              groupLabel={group.group_label}
              documentMeta={meta}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default function RhythmCalendarPreview() {
  return (
    <div className="rcp-page">
      <header className="rcp-header">
        <h1>RhythmCalendar — preview dev</h1>
        <p>
          Outil de développement uniquement. 2 plannings réels parsés (Martin + Mathis),
          affichés via le composant <code>RhythmCalendar</code>. Route non liée dans la nav.
        </p>
      </header>

      <FixtureSection
        title="Planning Martin (IUT Saint-Malo, BUT 3 GEA 2026/2027)"
        importId="69a564e5-1444-4a6b-940c-0d9222fcee7d"
        fixture={martinFixture}
        fixtureFilename="martin.json"
      />

      <FixtureSection
        title="Planning Mathis (Hyperplanning PDF, R_CA_A3)"
        importId="0ff13d90-c148-492c-a718-c4e57505c258"
        fixture={mathisFixture}
        fixtureFilename="mathis.json"
      />
    </div>
  );
}
