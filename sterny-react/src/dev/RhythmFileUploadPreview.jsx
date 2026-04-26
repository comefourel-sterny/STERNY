import { useEffect, useRef, useState } from 'react';
import RhythmFileUpload from '../components/rhythm/RhythmFileUpload';
import RhythmCalendar from '../components/rhythm/RhythmCalendar';
import { supabaseClient } from '../config/supabase';
import '../pages/dashboard/DashboardProprietairePage.css';
import './RhythmFileUploadPreview.css';

const SUBSECTION_TITLE_STYLE = {
  fontSize: 13,
  fontWeight: 600,
  color: 'rgba(30, 41, 59, 0.6)',
  textTransform: 'uppercase',
  letterSpacing: 1,
  margin: '0 0 12px',
};

const LOG_LIST_STYLE = {
  margin: 0,
  padding: 0,
  listStyle: 'none',
  fontFamily: "'SF Mono', Menlo, monospace",
  fontSize: 12,
  color: 'rgba(30, 41, 59, 0.75)',
  background: '#FFFFFF',
  border: '1px solid #E8EAF0',
  borderRadius: 12,
  padding: '12px 14px',
  maxHeight: 200,
  overflowY: 'auto',
};

const LOG_EMPTY_STYLE = {
  ...LOG_LIST_STYLE,
  color: 'rgba(30, 41, 59, 0.45)',
  fontStyle: 'italic',
};

function formatTime(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export default function RhythmFileUploadPreview() {
  const [logs, setLogs] = useState([]);
  const [rhythmImportId, setRhythmImportId] = useState(null);
  const [parsedGroups, setParsedGroups] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  function appendLog(type, payload) {
    const ts = formatTime(new Date());
    setLogs((prev) => [{ ts, type, payload }, ...prev].slice(0, 50));
  }

  function handleParsed(importId) {
    appendLog('parsed', `import_id=${importId}`);
    setRhythmImportId(importId);
  }

  function handleError({ code, message }) {
    appendLog('error', `code=${code} — ${message}`);
  }

  function handleResetImport() {
    setRhythmImportId(null);
    setParsedGroups(null);
    setSelectedGroupId(null);
    setFetchError(null);
    appendLog('reset', 'preview state cleared');
  }

  useEffect(() => {
    if (!rhythmImportId) {
      setParsedGroups(null);
      setSelectedGroupId(null);
      setFetchError(null);
      return;
    }
    let cancelled = false;
    setFetchLoading(true);
    setFetchError(null);

    (async () => {
      const { data, error } = await supabaseClient
        .from('rhythm_imports')
        .select('parsed_groups')
        .eq('id', rhythmImportId)
        .single();

      if (cancelled || !isMountedRef.current) return;

      if (error) {
        setFetchError(error.message || 'Erreur fetch parsed_groups');
        setParsedGroups(null);
        setSelectedGroupId(null);
      } else {
        const fetched = data?.parsed_groups ?? null;
        setParsedGroups(fetched);
        const firstId =
          fetched && Array.isArray(fetched.groups) && fetched.groups.length > 0
            ? fetched.groups[0].group_id
            : null;
        setSelectedGroupId(firstId);
      }
      setFetchLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [rhythmImportId]);

  const groups =
    parsedGroups && Array.isArray(parsedGroups.groups) ? parsedGroups.groups : [];
  const selectedGroup =
    groups.find((g) => g.group_id === selectedGroupId) || groups[0] || null;
  const documentMeta = parsedGroups?.document_meta || null;
  const showGroupSelector = groups.length > 1;

  return (
    <div className="dashboard-proprio-container">
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px' }}>
          RhythmFileUpload — preview de validation Étape 2
        </h1>
        <p style={{ color: 'rgba(30, 41, 59, 0.6)', fontSize: 14, margin: 0 }}>
          Outil de développement uniquement. Le composant est exposé dans 2 contextes
          (nu et dans <code>.dp-card</code>), avec une zone de log des callbacks et un
          rendu <code>RhythmCalendar</code> conditionnel après upload réussi pour
          valider la chaîne UX bout-en-bout.
        </p>
      </header>

      {/* Section 1 — Composant nu + zone de log */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 16px' }}>
          Test RhythmFileUpload — composant nu
        </h2>

        <div style={{ marginBottom: 16 }}>
          <RhythmFileUpload onParsed={handleParsed} onError={handleError} />
        </div>

        <h3 style={SUBSECTION_TITLE_STYLE}>Log des callbacks</h3>
        {logs.length === 0 ? (
          <div style={LOG_EMPTY_STYLE}>
            Aucun event reçu pour le moment. Drop un fichier pour démarrer.
          </div>
        ) : (
          <ul style={LOG_LIST_STYLE}>
            {logs.map((entry, i) => (
              <li key={i} style={{ padding: '4px 0' }}>
                <span style={{ color: 'rgba(30, 41, 59, 0.45)' }}>{entry.ts}</span>
                {' — '}
                <strong style={{ color: '#1E293B' }}>{entry.type}</strong>
                {' — '}
                <span>{entry.payload}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Section 2 — Composant dans .dp-card */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 16px' }}>
          Test RhythmFileUpload — dans <code>.dp-card</code> (contexte dashboard futur)
        </h2>

        <div className="dp-card">
          <h3 className="dp-card-title">
            <span aria-hidden="true">📅</span>
            IMPORTER UN PLANNING
          </h3>
          <RhythmFileUpload onParsed={handleParsed} onError={handleError} />
        </div>
      </section>

      {/* Section 3 — Affichage RhythmCalendar après upload réussi */}
      {rhythmImportId && (
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>
            Planning analysé
          </h2>
          <p style={{ color: 'rgba(30, 41, 59, 0.6)', fontSize: 13, margin: '0 0 16px' }}>
            <code>rhythm_imports.id = {rhythmImportId}</code>
          </p>

          {fetchLoading && (
            <div style={{ ...LOG_EMPTY_STYLE, fontStyle: 'normal' }}>
              Chargement de <code>parsed_groups</code> depuis la BDD…
            </div>
          )}

          {fetchError && !fetchLoading && (
            <div
              style={{
                ...LOG_EMPTY_STYLE,
                fontStyle: 'normal',
                color: '#dc2626',
                background: '#FEF2F2',
                borderColor: 'rgba(220, 38, 38, 0.2)',
              }}
            >
              Erreur fetch : {fetchError}
            </div>
          )}

          {!fetchLoading && !fetchError && parsedGroups && !selectedGroup && (
            <div style={LOG_EMPTY_STYLE}>
              Aucun groupe dans <code>parsed_groups</code>.
            </div>
          )}

          {!fetchLoading && !fetchError && selectedGroup && (
            <div className="dp-card">
              <h3 className="dp-card-title">
                <span aria-hidden="true">🎯</span>
                PLANNING DÉTECTÉ
              </h3>

              {showGroupSelector ? (
                <>
                  <div className="rfup-group-selector-label">Choisis ton groupe</div>
                  <div className="rfup-group-selector-tabs" role="tablist">
                    {groups.map((g) => {
                      const isActive = g.group_id === selectedGroup.group_id;
                      return (
                        <button
                          key={g.group_id}
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          className={
                            'rfup-group-tab' +
                            (isActive ? ' rfup-group-tab-active' : '')
                          }
                          onClick={() => setSelectedGroupId(g.group_id)}
                        >
                          {g.group_label}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="rfup-group-selector-hint">Planning unique</div>
              )}

              <RhythmCalendar
                weeks={selectedGroup.weeks}
                groupLabel={selectedGroup.group_label}
                documentMeta={documentMeta}
              />
            </div>
          )}

          <button
            type="button"
            onClick={handleResetImport}
            style={{
              marginTop: 16,
              padding: '8px 18px',
              fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: '#1E293B',
              background: '#FFFFFF',
              border: '1px solid #E8EAF0',
              borderRadius: 10,
              cursor: 'pointer',
            }}
          >
            Tester avec un autre planning
          </button>
        </section>
      )}
    </div>
  );
}
