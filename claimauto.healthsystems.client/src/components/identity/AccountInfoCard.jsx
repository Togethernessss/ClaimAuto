import { Card, Badge } from 'react-bootstrap';

export default function AccountInfoCard({ user }) {
  if (!user) return null;

  const joined = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : '—';

  const rows = [
    { icon: 'bi-hash',              label: 'User ID',      value: `#${user.userID}`, isStatus: false },
    { icon: 'bi-calendar3',         label: 'Member Since', value: joined,            isStatus: false },
    { icon: 'bi-check-circle-fill', label: 'Status',       value: user.status,       isStatus: true  },
  ];

  return (
    <Card
      className="border-0"
      style={{ boxShadow:'0 4px 24px rgba(102,126,234,0.08)', borderRadius:16 }}
    >
      <Card.Header
        className="border-0 py-3 px-4"
        style={{
          background:'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
          borderRadius:'16px 16px 0 0',
        }}
      >
        <h6 className="mb-0 fw-bold" style={{ color:'#4c1d95' }}>
          <i className="bi bi-info-circle-fill me-2" style={{ color:'#7c3aed' }}></i>
          Account Information
        </h6>
      </Card.Header>

      <Card.Body className="px-4 py-3">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className="d-flex align-items-center justify-content-between py-2"
            style={{ borderBottom: i < rows.length - 1 ? '1px solid #f3f4f6' : 'none' }}
          >
            {/* Label with icon */}
            <div className="d-flex align-items-center gap-2" style={{ color:'#6b7280', fontSize:13 }}>
              <div
                style={{
                  width:28, height:28, borderRadius:8,
                  background:'#f5f3ff',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}
              >
                <i className={`bi ${row.icon}`} style={{ color:'#7c3aed', fontSize:13 }}></i>
              </div>
              {row.label}
            </div>

            {/* Value */}
            {row.isStatus ? (
              <Badge
                className="rounded-pill"
                style={{
                  background: row.value === 'Active' ? '#10b981' : '#6b7280',
                  fontSize:11, padding:'4px 10px',
                }}
              >
                {row.value}
              </Badge>
            ) : (
              <span className="fw-semibold" style={{ color:'#1e1b4b', fontSize:13 }}>
                {row.value}
              </span>
            )}
          </div>
        ))}
      </Card.Body>
    </Card>
  );
}