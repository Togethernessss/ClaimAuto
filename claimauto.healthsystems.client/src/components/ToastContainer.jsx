// src/components/ToastContainer.jsx
import { useState, useEffect } from 'react';
import { subscribeToasts, dismissToast } from '../services/toastService';

const TYPE_CONFIG = {
  success: {
    bg:        '#f0fdf4',
    border:    '#86efac',
    accent:    '#16a34a',
    icon:      'bi-check-circle-fill',
    iconColor: '#16a34a',
  },
  error: {
    bg:        '#fef2f2',
    border:    '#fca5a5',
    accent:    '#dc2626',
    icon:      'bi-x-circle-fill',
    iconColor: '#dc2626',
  },
  warning: {
    bg:        '#fffbeb',
    border:    '#fde68a',
    accent:    '#d97706',
    icon:      'bi-exclamation-triangle-fill',
    iconColor: '#d97706',
  },
  info: {
    bg:        '#eff6ff',
    border:    '#bfdbfe',
    accent:    '#2563eb',
    icon:      'bi-info-circle-fill',
    iconColor: '#2563eb',
  },
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => subscribeToasts(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position:      'fixed',
        top:           72,
        right:         20,
        zIndex:        9999,
        display:       'flex',
        flexDirection: 'column',
        gap:           10,
        pointerEvents: 'none',
        maxWidth:      400,
        width:         'calc(100vw - 40px)',
      }}
    >
      {/* Slide-in animation */}
      <style>{`
        @keyframes _toastIn {
          from { opacity: 0; transform: translateX(30px) scale(0.96); }
          to   { opacity: 1; transform: translateX(0)    scale(1);    }
        }
      `}</style>

      {toasts.map((t) => {
        const cfg = TYPE_CONFIG[t.type] ?? TYPE_CONFIG.info;
        return (
          <div
            key={t.id}
            style={{
              background:    cfg.bg,
              border:        `1.5px solid ${cfg.border}`,
              borderLeft:    `4px solid ${cfg.accent}`,
              borderRadius:  12,
              padding:       '12px 14px',
              boxShadow:     '0 4px 24px rgba(0,0,0,0.13)',
              pointerEvents: 'all',
              display:       'flex',
              alignItems:    'flex-start',
              gap:           10,
              animation:     '_toastIn 0.25s ease forwards',
            }}
          >
            {/* Icon */}
            <i
              className={`bi ${cfg.icon}`}
              style={{
                color:      cfg.iconColor,
                fontSize:   '1.05rem',
                flexShrink: 0,
                marginTop:  1,
              }}
            />

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {t.title && (
                <div style={{
                  fontWeight:   700,
                  fontSize:     '0.84rem',
                  color:        '#111827',
                  marginBottom: 2,
                  lineHeight:   1.2,
                }}>
                  {t.title}
                </div>
              )}
              <div style={{
                fontSize:   '0.8rem',
                color:      '#374151',
                lineHeight: 1.45,
              }}>
                {t.message}
              </div>
            </div>

            {/* Dismiss */}
            <button
              onClick={() => dismissToast(t.id)}
              title="Dismiss"
              style={{
                background:  'none',
                border:      'none',
                cursor:      'pointer',
                color:       '#9ca3af',
                fontSize:    11,
                padding:     0,
                flexShrink:  0,
                lineHeight:  1,
                marginTop:   2,
              }}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
        );
      })}
    </div>
  );
}
