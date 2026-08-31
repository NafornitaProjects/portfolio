export default function CardDetailLoading() {
  return (
    <main className="rb-app rb-detail-page" aria-busy="true">
      <div className="rb-detail-loading-header" />
      <div className="rb-detail-loading">
        <div className="rb-detail-loading-image" />
        <div className="rb-detail-loading-copy">
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
      <span className="sr-only">Loading card details</span>
    </main>
  );
}
