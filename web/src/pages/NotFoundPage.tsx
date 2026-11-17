import { Link } from 'react-router-dom';
import { Empty } from '../components/ui';

export function NotFoundPage() {
  return (
    <Empty title="That page isn’t here">
      <Link to="/" className="btn-primary mt-4">
        Back to the shop
      </Link>
    </Empty>
  );
}
