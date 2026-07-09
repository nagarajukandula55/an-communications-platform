import { ComingSoon } from '@/components/ComingSoon';

export default function QueuePage() {
  return (
    <ComingSoon
      title="Queue Monitoring"
      reason="apps/api has no queue-stats endpoint yet (M06 built the queue itself, not a stats API for it). This page is a placeholder until that endpoint exists."
    />
  );
}
