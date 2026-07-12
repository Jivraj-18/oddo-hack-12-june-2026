import "./module-page.css";

interface ModulePageProps {
  title: string;
  tabs: string[];
}

export function ModulePage({ title, tabs }: ModulePageProps) {
  return (
    <div className="module-page">
      <h1>{title}</h1>
      <div className="module-page__tabs" role="tablist" aria-label={`${title} tabs`}>
        {tabs.map((tab) => (
          <span key={tab} className="module-page__tab">
            {tab}
          </span>
        ))}
      </div>
      <p className="module-page__placeholder">This module's screens are not built yet.</p>
    </div>
  );
}
