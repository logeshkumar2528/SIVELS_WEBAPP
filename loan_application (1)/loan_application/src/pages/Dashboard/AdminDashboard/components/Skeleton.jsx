export function CardSkeleton({ height = 180 }) {
  return (
    <div className="ldash-card">
      <div className="ldash-skel-line w40" />
      <div className="ldash-skel-block" style={{ height }} />
    </div>
  );
}

export function KpiSkeleton() {
  return (
    <div className="ldash-kpi">
      <div className="ldash-skel-line w60" />
      <div className="ldash-skel-line w40 tall" />
    </div>
  );
}