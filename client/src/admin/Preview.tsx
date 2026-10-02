import { Component, type ReactNode } from "react";
import { BlogArticleLayout } from "../pages/ContentPage";
import { blogPosts } from "@shared/blog-posts";
import type { BlogPost } from "@shared/blog-meta";
import type { BlogPostInput } from "@shared/blog-schema";
import { toPayload } from "./editorModel";

class PreviewBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidUpdate(previous: { children: ReactNode }) { if (this.state.failed && previous.children !== this.props.children) this.setState({ failed: false }); }
  render() { return this.state.failed ? <p className="admin-muted">Önizleme bu içerikle çizilemedi; alanları tamamlayın.</p> : this.props.children; }
}

/** Sitenin kendi yazı bileşeniyle (BlogArticleLayout) canlı önizleme. Bağlantılar panelden çıkarmaz. */
export default function Preview({ post }: { post: BlogPostInput }) {
  const { order: _order, status: _status, ...site } = toPayload(post);
  const preview = site as unknown as BlogPost;
  return (
    <div className="admin-preview" onClickCapture={event => { if ((event.target as HTMLElement).closest("a")) event.preventDefault(); }}>
      <PreviewBoundary>
        <BlogArticleLayout post={preview} related={blogPosts.slice(0, 3)} />
      </PreviewBoundary>
    </div>
  );
}
