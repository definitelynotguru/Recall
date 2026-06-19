type LoadErrorProps = {
  message: string;
  onRetry: () => void;
};

export function LoadError({ message, onRetry }: LoadErrorProps) {
  return (
    <div className="empty-state">
      <p className="error-text" style={{ marginBottom: 16 }}>
        {message}
      </p>
      <button type="button" className="btn btn-secondary" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
