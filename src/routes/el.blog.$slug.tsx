import { createFileRoute, notFound } from "@tanstack/react-router";
import { loadPost, PostPageView } from "./blog.$slug";
import { absoluteUrl } from "@/lib/site-url";

export const Route = createFileRoute("/el/blog/$slug")({
  loader: async ({ params }) => {
    const post = await loadPost(params.slug, "el");
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData, params }) => {
    const post = loaderData?.post;
    const title = post ? `${post.title} — Anastasia Patience` : "Άρθρο — Anastasia Patience";
    const description =
      post?.excerpt?.trim() ||
      "Επιστολές για πίστη, σκοπό και μια ζωή που αγαπάς — από την Anastasia Patience.";
    const image = post?.cover_url?.trim() || absoluteUrl("/og.jpg");
    const url = `/el/blog/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        { property: "og:locale", content: "el_GR" },
        { property: "og:locale:alternate", content: "en_US" },
        { property: "og:image", content: image },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: image },
      ],
      links: [
        { rel: "canonical", href: url },
        { rel: "alternate", hrefLang: "en", href: `/blog/${params.slug}` },
        { rel: "alternate", hrefLang: "el", href: url },
        { rel: "alternate", hrefLang: "x-default", href: `/blog/${params.slug}` },
      ],
    };
  },
  component: function ElPostPage() {
    const { post } = Route.useLoaderData();
    return <PostPageView post={post} />;
  },
});
