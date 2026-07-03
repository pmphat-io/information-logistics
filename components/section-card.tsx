export function SectionCard({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <article className="section-card">
      <div className="section-head">
        <p className="section-kicker">Module</p>
        <h2>{title}</h2>
        <p className="section-description">{description}</p>
      </div>
      {children}
    </article>
  );
}
