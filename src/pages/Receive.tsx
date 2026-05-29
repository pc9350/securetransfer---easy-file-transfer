import { ReceiverView } from '../components/windows/ReceiverView';
import { ErrorBoundary } from '../components/shared/ErrorBoundary';

export default function Receive() {
  return (
    <ErrorBoundary>
      <ReceiverView />
    </ErrorBoundary>
  );
}
