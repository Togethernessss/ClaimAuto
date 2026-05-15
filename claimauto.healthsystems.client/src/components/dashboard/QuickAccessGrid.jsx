import { Row, Col, Card } from 'react-bootstrap';

/**
 * The grid of clickable menu shortcuts at the bottom of every dashboard.
 *
 * Props:
 *   items       — array of menu items: [{ key, label, icon, path, roles }, ...]
 *                 (typically the filtered menu from getMenuForRole)
 *   onItemClick — (item) => void, called when a card is clicked
 *
 * Example:
 *   <QuickAccessGrid items={myMenu} onItemClick={(i) => navigate(i.path)} />
 */
export default function QuickAccessGrid({ items, onItemClick }) {
  if (!items || items.length === 0) return null;

  return (
    <Row className="g-3 pb-2">
      {items.map((item) => (
        <Col md={4} lg={3} key={item.key}>
          <Card
            className="border-0 shadow-sm h-100"
            role="button"
            onClick={() => onItemClick && onItemClick(item)}
            style={{ cursor: 'pointer', transition: 'transform 0.15s' }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-3px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <Card.Body className="text-center">
              <div
                className="rounded-circle mx-auto mb-2 d-flex align-items-center justify-content-center"
                style={{ width: 50, height: 50, backgroundColor: '#e3f2fd' }}
              >
                <i className={`${item.icon} text-primary fs-4`}></i>
              </div>
              <div className="fw-semibold">{item.label}</div>
            </Card.Body>
          </Card>
        </Col>
      ))}
    </Row>
  );
}