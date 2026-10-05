import { useMemo, useState } from "react";
import { blogCategories } from "@shared/blog-meta";
import { formatBlogDate } from "@shared/blog-meta";
import { api, ApiError, type PostItem, type PostsResponse } from "./api";
import { filterItems, isPublished, newestFirst, type ListFilter } from "./editorModel";
import DeleteDialog from "./DeleteDialog";

export default function PostsView({ data, onEdit, onPackage, onNew, onChanged, notify }: { data: PostsResponse; onEdit: (item: PostItem) => void; onPackage: (item: PostItem) => void; onNew: () => void; onChanged: () => Promise<void>; notify: (message: string) => void }) {
  const [filter, setFilter] = useState<ListFilter>({ query: "", category: "", status: "" });
  const [deleting, setDeleting] = useState<PostItem | null>(null);
  const [busySlug, setBusySlug] = useState("");
  const items = useMemo(() => filterItems(newestFirst(data.items), filter), [data.items, filter]);

  const remove = async (item: PostItem) => {
    if (isPublished(item.post)) return setDeleting(item);
    setBusySlug(item.post.slug);
    try {
      await api.remove({ slug: item.post.slug, confirm: false });
      notify("Taslak silindi.");
      await onChanged();
    } catch (failure) {
      notify(failure instanceof ApiError ? failure.message : "Silinemedi.");
    } finally {
      setBusySlug("");
    }
  };

  return (
    <section>
      <div className="admin-toolbar">
        <input type="search" placeholder="Başlık, adres, cihaz ya da marka ara" value={filter.query} onChange={event => setFilter({ ...filter, query: event.target.value })} aria-label="Yazı ara" />
        <select value={filter.category} onChange={event => setFilter({ ...filter, category: event.target.value })} aria-label="Kategori">
          <option value="">Tüm kategoriler</option>
          {blogCategories.map(category => <option key={category}>{category}</option>)}
        </select>
        <select value={filter.status} onChange={event => setFilter({ ...filter, status: event.target.value as ListFilter["status"] })} aria-label="Durum">
          <option value="">Tüm durumlar</option>
          <option value="published">Yayında</option>
          <option value="draft">Taslak</option>
        </select>
        <button className="admin-btn admin-btn-primary" onClick={onNew}>+ Yeni yazı</button>
      </div>
      {data.problems.length > 0 && (
        <div className="admin-error" role="alert">
          <strong>Depoda geçersiz içerik var; kaydetme ve silme kapalı:</strong>
          <ul>{data.problems.map(problem => <li key={problem.file}>{problem.file}: {problem.errors.join("; ")}</li>)}</ul>
        </div>
      )}
      <p className="admin-muted">{items.length} / {data.items.length} yazı · dal: {data.branch}</p>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Başlık</th><th>Kategori</th><th>Tarih</th><th>Durum</th><th /></tr></thead>
          <tbody>
            {items.map(item => (
              <tr key={item.post.slug}>
                <td><button className="admin-link" onClick={() => onEdit(item)}>{item.post.title}</button><br /><code>{item.post.slug}</code></td>
                <td>{item.post.category}</td>
                <td>{formatBlogDate(item.post.updated)}</td>
                <td><span className={`admin-badge ${isPublished(item.post) ? "is-live" : "is-draft"}`}>{isPublished(item.post) ? "Yayında" : "Taslak"}</span></td>
                <td className="admin-row-actions">
                  <button className="admin-btn" onClick={() => onEdit(item)}>Düzenle</button>
                  <button className="admin-btn" onClick={() => onPackage(item)} title="Google İşletme ve Instagram paylaşım paketi">Paylaşım</button>
                  <button className="admin-btn admin-btn-danger" disabled={busySlug === item.post.slug} onClick={() => remove(item)}>Sil</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={5} className="admin-muted">Eşleşen yazı yok.</td></tr>}
          </tbody>
        </table>
      </div>
      {deleting && <DeleteDialog item={deleting} onClose={() => setDeleting(null)} onDeleted={async message => { setDeleting(null); notify(message); await onChanged(); }} />}
    </section>
  );
}
