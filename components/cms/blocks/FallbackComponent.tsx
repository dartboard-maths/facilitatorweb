type FallbackComponentProps = {
  componentType?: string;
};

export default function FallbackComponent({ componentType }: FallbackComponentProps) {
  return (
    <section className="container py-4">
      <div className="alert alert-warning mb-0" role="status">
        Unsupported CMS component type: <strong>{componentType || "unknown"}</strong>
      </div>
    </section>
  );
}
