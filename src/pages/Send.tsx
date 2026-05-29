import { SenderView } from '../components/iphone/SenderView';
import { ErrorBoundary } from '../components/shared/ErrorBoundary';

export default function Send() {
  return (
    <ErrorBoundary>
      <SenderView />
    </ErrorBoundary>
  );
}
