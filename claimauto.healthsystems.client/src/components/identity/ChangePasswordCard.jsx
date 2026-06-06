import { useState } from 'react';
import { Card, Button } from 'react-bootstrap';
import ChangePasswordModal from './ChangePasswordModal';

export default function ChangePasswordCard() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
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
            <i className="bi bi-key-fill me-2" style={{ color:'#7c3aed' }}></i>
            Password &amp; Security
          </h6>
          <small style={{ color:'#7c3aed', opacity:0.7 }}>
            Update your account password
          </small>
        </Card.Header>

        <Card.Body className="px-4 py-3">
          <div className="d-flex align-items-center gap-3">

            {/* Icon box */}
            <div
              style={{
                width:44, height:44, borderRadius:12,
                background:'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:'0 4px 12px rgba(102,126,234,0.3)',
                flexShrink:0,
              }}
            >
              <i className="bi bi-lock-fill text-white" style={{ fontSize:18 }}></i>
            </div>

            {/* Text */}
            <div className="flex-grow-1">
              <div className="fw-semibold" style={{ color:'#1e1b4b', fontSize:14 }}>
                Account Password
              </div>
              <div style={{ fontSize:12, color:'#6b7280' }}>
                Use a strong, unique password for maximum security.
              </div>
            </div>

            {/* Button — same onClick as original */}
            <Button
              size="sm"
              onClick={() => setShowModal(true)}
              className="rounded-3"
              style={{
                background:'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border:'none', fontSize:13, whiteSpace:'nowrap',
              }}
            >
              <i className="bi bi-pencil-square me-1"></i> Change
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Modal — exactly same as original */}
      <ChangePasswordModal show={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}