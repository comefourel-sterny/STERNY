import { useEffect, useRef, useState } from 'react';
import { UploadCloud, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabaseClient } from '../../config/supabase';
import './RhythmFileUpload.css';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

const ACCEPT_ATTR = ALLOWED_MIME_TYPES.join(',');
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const UPLOADING_TO_PARSING_DELAY_MS = 3000;

const ERROR_MESSAGES = {
  INVALID_MIME: 'Format non supporté. Utilise PDF, JPG, PNG ou WebP.',
  FILE_TOO_LARGE: 'Fichier trop volumineux (max 20 Mo).',
  UPLOAD_FAILED: 'Impossible d’envoyer le fichier. Vérifie ta connexion et réessaie.',
  PARSE_FAILED: 'L’analyse a échoué. Vérifie que le document est bien lisible et réessaie.',
  NETWORK_ERROR: 'Erreur réseau. Réessaie dans un instant.',
  UNAUTHORIZED: 'Tu dois être connecté pour importer un planning.',
};

function classifyInvokeError(invokeError) {
  const status = invokeError?.context?.status ?? invokeError?.status;
  if (status === 401 || status === 403) return 'UNAUTHORIZED';
  if (status === 422) return 'PARSE_FAILED';
  if (status === 413) return 'FILE_TOO_LARGE';
  if (status === 400) return 'UPLOAD_FAILED';
  if (typeof status === 'number' && status >= 500) return 'UPLOAD_FAILED';
  return 'NETWORK_ERROR';
}

export default function RhythmFileUpload({ onParsed, onError, disabled = false }) {
  const [state, setState] = useState('idle');
  const [errorCode, setErrorCode] = useState(null);

  const inputRef = useRef(null);
  const isMountedRef = useRef(true);
  const parsingTimerRef = useRef(null);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (parsingTimerRef.current) {
        clearTimeout(parsingTimerRef.current);
        parsingTimerRef.current = null;
      }
    };
  }, []);

  function clearParsingTimer() {
    if (parsingTimerRef.current) {
      clearTimeout(parsingTimerRef.current);
      parsingTimerRef.current = null;
    }
  }

  function safeSetState(next) {
    if (!isMountedRef.current) return;
    setState(next);
  }

  function safeSetError(code) {
    if (!isMountedRef.current) return;
    setErrorCode(code);
    setState('error');
    if (typeof onError === 'function') {
      onError({ code, message: ERROR_MESSAGES[code] || 'Erreur inconnue.' });
    }
  }

  async function handleFile(file) {
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      safeSetError('INVALID_MIME');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      safeSetError('FILE_TOO_LARGE');
      return;
    }

    safeSetState('uploading');
    clearParsingTimer();
    parsingTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      setState((current) => (current === 'uploading' ? 'parsing' : current));
    }, UPLOADING_TO_PARSING_DELAY_MS);

    let importId = null;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data, error: invokeError } = await supabaseClient.functions.invoke(
        'parse-school-calendar',
        { body: formData }
      );

      clearParsingTimer();

      if (!isMountedRef.current) return;

      if (invokeError) {
        const code = classifyInvokeError(invokeError);
        safeSetError(code);
        return;
      }

      importId = data?.rhythm_import_id;
      if (!importId) {
        safeSetError('PARSE_FAILED');
        return;
      }
    } catch {
      clearParsingTimer();
      if (!isMountedRef.current) return;
      safeSetError('NETWORK_ERROR');
      return;
    }

    try {
      const { data: row, error: dbError } = await supabaseClient
        .from('rhythm_imports')
        .select('status')
        .eq('id', importId)
        .single();

      if (!isMountedRef.current) return;

      if (dbError) {
        console.warn('[RhythmFileUpload] Lecture status post-invoke échouée:', dbError);
        safeSetError('NETWORK_ERROR');
        return;
      }

      if (row?.status !== 'parsed') {
        safeSetError('PARSE_FAILED');
        return;
      }

      safeSetState('success');
      if (typeof onParsed === 'function') {
        onParsed(importId);
      }
    } catch {
      if (!isMountedRef.current) return;
      safeSetError('NETWORK_ERROR');
    }
  }

  function isInteractive() {
    return !disabled && (state === 'idle' || state === 'dragging');
  }

  function handleClickZone() {
    if (!isInteractive()) return;
    inputRef.current?.click();
  }

  function handleKeyDownZone(e) {
    if (!isInteractive()) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  }

  function handleInputChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!isInteractive()) return;
    handleFile(file);
  }

  function handleDragEnter(e) {
    if (!isInteractive()) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (dragCounterRef.current > 0) safeSetState('dragging');
  }

  function handleDragOver(e) {
    if (!isInteractive()) return;
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDragLeave(e) {
    if (!isInteractive()) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) safeSetState('idle');
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    if (!isInteractive()) return;
    const file = e.dataTransfer?.files?.[0];
    handleFile(file);
  }

  function handleReset() {
    setErrorCode(null);
    safeSetState('idle');
  }

  const zoneClass = [
    'rfu-zone',
    state === 'dragging' && 'rfu-zone--dragging',
    state !== 'idle' && state !== 'dragging' && 'rfu-zone--busy',
    disabled && 'rfu-zone--disabled',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="rfu-root">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="rfu-input"
        onChange={handleInputChange}
        disabled={disabled || (state !== 'idle' && state !== 'dragging' && state !== 'error')}
        tabIndex={-1}
        aria-hidden="true"
      />

      <div
        className={zoneClass}
        role="button"
        tabIndex={isInteractive() ? 0 : -1}
        aria-disabled={!isInteractive()}
        aria-label="Importer un planning scolaire (PDF, JPG, PNG ou WebP, 20 Mo max)"
        onClick={handleClickZone}
        onKeyDown={handleKeyDownZone}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {(state === 'idle' || state === 'dragging') && (
          <div className="rfu-content rfu-content--idle">
            <UploadCloud size={40} className="rfu-icon" strokeWidth={1.5} aria-hidden="true" />
            <div className="rfu-title">Glisse ton planning ici</div>
            <div className="rfu-subtitle">ou clique pour parcourir tes fichiers</div>
            <div className="rfu-mention">PDF, JPG, PNG, WebP — 20 Mo max</div>
          </div>
        )}

        {state === 'uploading' && (
          <div className="rfu-content rfu-content--loading">
            <Loader2 size={32} className="rfu-icon rfu-spin" strokeWidth={2} aria-hidden="true" />
            <div className="rfu-title rfu-title--loading">Envoi du fichier…</div>
          </div>
        )}

        {state === 'parsing' && (
          <div className="rfu-content rfu-content--loading">
            <Loader2 size={36} className="rfu-icon rfu-spin" strokeWidth={2} aria-hidden="true" />
            <div className="rfu-title rfu-title--loading">Analyse de ton planning en cours…</div>
            <div className="rfu-subtitle">Ça peut prendre une minute, on lit attentivement.</div>
          </div>
        )}

        {state === 'success' && (
          <div className="rfu-content rfu-content--success">
            <CheckCircle2 size={36} className="rfu-icon rfu-icon--success" strokeWidth={2} aria-hidden="true" />
            <div className="rfu-title">Planning analysé.</div>
            <button
              type="button"
              className="rfu-button-secondary"
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
            >
              Importer un autre planning
            </button>
          </div>
        )}

        {state === 'error' && (
          <div className="rfu-content rfu-content--error">
            <AlertCircle size={36} className="rfu-icon rfu-icon--error" strokeWidth={2} aria-hidden="true" />
            <div className="rfu-title rfu-title--error">
              {ERROR_MESSAGES[errorCode] || 'Une erreur est survenue.'}
            </div>
            <button
              type="button"
              className="rfu-button-secondary"
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
            >
              Réessayer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
