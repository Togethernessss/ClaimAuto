import { useAuth } from '../../../../security/AuthContext';
import { canAccess } from '../../../../security/permissions';

export default function RemittanceHeader({ successMsg, errorMsg }) {
  const { user } = useAuth();
  const isHospital = canAccess(user?.role, ['Hospital']);

  return (
    <>
      <div
        className="mb-4 position-relative overflow-hidden"
        style={{
          borderRadius: 18,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '22px 28px',
          boxShadow: '0 8px 32px rgba(102,126,234,0.35)',
        }}
      >
        {/* Decorative orbs */}
        <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', top: -60, right: -30, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', bottom: -40, left: '40%', pointerEvents: 'none' }} />

        <div className="d-flex align-items-center gap-3" style={{ position: 'relative' }}>
          {/* Frosted-glass icon box */}
          <div style={{ width: 50, height: 50, borderRadius: 14, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', backdropFilter: 'blur(8px)' }}>
            <i className="bi bi-receipt-cutoff" style={{ fontSize: '1.4rem', color: 'white' }}></i>
          </div>
          <div>
            <h4 className="fw-bold mb-0" style={{ color: 'white', letterSpacing: '-0.3px' }}>
              {isHospital ? 'My Remittances' : 'Remittances'}
            </h4>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.72)', marginTop: 2 }}>
              {isHospital ? 'Payment advices sent to your account' : 'Track payment advices'} &nbsp;·&nbsp; showing last 30 days
            </div>
          </div>
        </div>
      </div>

      {successMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: '0.85rem', color: '#065f46', fontWeight: 500 }}>
          <i className="bi bi-check-circle-fill" style={{ color: '#10b981' }}></i>{successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: '0.85rem', color: '#991b1b', fontWeight: 500 }}>
          <i className="bi bi-exclamation-triangle-fill" style={{ color: '#ef4444' }}></i>{errorMsg}
        </div>
      )}
    </>
  );
}
