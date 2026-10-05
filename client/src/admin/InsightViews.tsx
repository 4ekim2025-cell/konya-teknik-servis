import { useEffect, useMemo, useState } from "react";
import { computeOverview } from "@shared/blog-overview";
import { api, ApiError, type BuildRow, type PostsResponse } from "./api";
import { ImageUsageCard } from "./ImageUsageCard";

function Rows({ title, rows }: { title: string; rows: { name: string; count: number }[] }) {
  return (
    <div className="admin-card">
      <h3>{title}</h3>
      <ul className="admin-bars">
        {rows.map(row => <li key={row.name} className={row.count === 0 ? "is-empty" : ""}><span>{row.name}</span><b>{row.count}</b></li>)}
      </ul>
    </div>
  );
}

/** Hangi ilçe, marka, cihaz ve kategoride kaç yayın var; hiç yazısı olmayan konular vurgulanır. */
export function OverviewView({ data }: { data: PostsResponse }) {
  const overview = useMemo(() => computeOverview(data.items.map(item => item.post)), [data.items]);
  const gaps = [...overview.empty.districts, ...overview.empty.categories, ...overview.empty.devices];
  return (
    <section>
      <p className="admin-muted">{overview.published} yayında · {overview.drafts} taslak · toplam {overview.total}</p>
      <div className="admin-grid">
        <Rows title="Kategori" rows={overview.byCategory} />
        <Rows title="İlçe (servis kaydı olan yazılar)" rows={overview.byDistrict} />
        <Rows title="Cihaz" rows={overview.byDevice} />
        <Rows title="Marka (servis kaydı olan yazılar)" rows={overview.byBrand} />
      </div>
      <div className="admin-card">
        <h3>Henüz yazısı olmayan konular</h3>
        {gaps.length === 0 && overview.empty.brands.length === 0 ? <p className="admin-muted">Boş konu yok.</p> : (
          <>
            {gaps.length > 0 && <p><strong>İlçe / kategori / cihaz:</strong> {gaps.join(", ")}</p>}
            {overview.empty.brands.length > 0 && <p><strong>Markalar:</strong> {overview.empty.brands.join(", ")}</p>}
          </>
        )}
      </div>
      <ImageUsageCard />
    </section>
  );
}

const STATE_LABEL: Record<BuildRow["state"], string> = { success: "Yayında", pending: "Derleniyor", failure: "Hata", unknown: "Bilinmiyor" };

/** Son commit'ler ve Vercel derleme durumu; hata varsa açıklaması gösterilir. */
export function BuildsView() {
  const [rows, setRows] = useState<BuildRow[] | null>(null);
  const [error, setError] = useState("");
  const load = () => {
    setError("");
    api.builds().then(result => setRows(result.rows)).catch(failure => setError(failure instanceof ApiError ? failure.message : "Durum alınamadı."));
  };
  useEffect(load, []);
  return (
    <section>
      <div className="admin-toolbar"><button className="admin-btn" onClick={load}>Yenile</button></div>
      {error && <p className="admin-error" role="alert">{error}</p>}
      {!rows && !error && <p className="admin-muted">Yükleniyor…</p>}
      {rows && (
        <ul className="admin-builds">
          {rows.map(row => (
            <li key={row.sha} className={`is-${row.state}`}>
              <span className="admin-badge">{row.skipped ? "Taslak (derleme yok)" : STATE_LABEL[row.state]}</span>
              <div>
                <strong>{row.message}</strong>
                <small>{new Date(row.date).toLocaleString("tr-TR")} · {row.sha.slice(0, 7)}</small>
                {row.state === "failure" && <p className="admin-error">{row.description || "Derleme hata verdi."} {row.url && <a href={row.url} target="_blank" rel="noreferrer">Ayrıntı</a>}</p>}
                {row.state === "failure" && <p className="admin-muted">Önceki sürüme dönmek için yazıyı açıp “Önceki sürümler”den eski halini yükleyip yeniden yayınlayın.</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
