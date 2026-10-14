import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Clock, ExternalLink, Eye, FileText, MessageSquare, RefreshCw, Tags, ThumbsUp } from "lucide-react";
import { api, n, runTool } from "../api";
import { Badge, Btn, Card, CostButton, ErrorBox, Loading, Stat, Thumb, useToolToast, Warnings } from "../ui";

export function VideoDetail({ id }: { id: string }) {
  const qc = useQueryClient();
  const toast = useToolToast();
  const { data: d, error } = useQuery({ queryKey: ["video", id], queryFn: () => api<any>(`/api/videos/${id}`) });
  const stats = useMutation({ mutationFn: () => runTool("video_stats", { video: id, refresh: true }), onSuccess: (env) => { toast("Stats refreshed", env); qc.invalidateQueries({ queryKey: ["video", id] }); } });
  const tags = useMutation({ mutationFn: () => runTool("video_tags", { video: id }), onSuccess: (env) => toast("Tags loaded", env) });
  const comments = useMutation({ mutationFn: () => runTool("video_comments", { video: id, limit: 20 }), onSuccess: (env) => toast("Comments loaded", env) });
  const transcript = useMutation({ mutationFn: (offset: number) => runTool("video_transcript", { video: id, max_chars: 6000, offset }) });
  const back = <Btn variant="ghost" size="sm" icon={ArrowLeft} onClick={() => history.back()}>Back</Btn>;
  if (error) return <>{back}<div className="mt-3"><ErrorBox error={error} /></div><p className="mt-3 text-ink2">This video is not in the database yet. Research a keyword or scan outliers first.</p></>;
  if (!d) return <Loading rows={4} />;
  const v = d.video;
  const t = transcript.data?.data;
  return (
    <>
      {back}
      <header className="animate-in mt-4 mb-7 flex flex-col gap-5 md:flex-row md:items-start">
        <div className="w-full shrink-0 md:w-80 [&_img]:w-full [&>div]:w-full"><Thumb src={v.thumbnail?.replace("mqdefault", "hqdefault")} alt="" /></div>
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap gap-2">{v.source === "demo" ? <Badge tone="bad" dot>demo data</Badge> : <Badge tone="teal" dot>live</Badge>}<Badge>{v.published_at.slice(0, 10)}</Badge></div>
          <h1 className="text-2xl font-bold leading-snug tracking-tight text-ink sm:text-3xl">{v.title}</h1>
          <p className="mt-2 text-ink2">{d.channel?.title ?? v.channel_id}{d.channel && <span className="text-muted"> · {n(d.channel.subscribers)} subs</span>}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={v.url} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-white/[0.05] px-3 text-sm font-medium text-ink no-underline ring-1 ring-inset ring-white/10 hover:bg-white/[0.09]"><ExternalLink className="size-4" aria-hidden />Open on YouTube</a>
            <CostButton cost={4} icon={RefreshCw} variant="secondary" loading={stats.isPending} onRun={() => stats.mutate()} disabled={stats.isPending}>Stats vs channel</CostButton>
            <CostButton cost={1} icon={Tags} variant="secondary" loading={tags.isPending} onRun={() => tags.mutate()} disabled={tags.isPending}>Tags</CostButton>
            <CostButton cost={1} icon={MessageSquare} variant="secondary" loading={comments.isPending} onRun={() => comments.mutate()} disabled={comments.isPending}>Comments</CostButton>
            <Btn size="sm" icon={FileText} loading={transcript.isPending} onClick={() => transcript.mutate(0)} disabled={transcript.isPending}>Transcript (free)</Btn>
          </div>
        </div>
      </header>
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Views" icon={Eye} value={n(v.views)} sub={`${n(v.views_per_day)} / day (est.)`} />
        <Stat label="Likes" icon={ThumbsUp} tone="teal" value={n(v.likes)} sub={v.views ? `${((v.likes / v.views) * 100).toFixed(1)}% of views` : undefined} />
        <Stat label="Comments" icon={MessageSquare} tone="muted" value={n(v.comments)} />
        <Stat label="Length" icon={Clock} tone="muted" value={`${Math.round(v.duration_sec / 60)} min`} />
      </div>
      {[stats, tags, comments, transcript].map((m, i) => (m.error ? <div key={i} className="mb-3"><ErrorBox error={m.error} /></div> : null))}

      {stats.data && <Card className="mb-5" title="Stats vs channel" icon={RefreshCw}><Warnings list={stats.data.warnings} /><p className="mt-2 text-ink2">{stats.data.summary}</p>{stats.data.data.outlier_multiplier && <p className="mt-2 text-ink">Outlier multiplier: <b className="text-gold">{stats.data.data.outlier_multiplier}×</b> the channel's median (estimate).</p>}</Card>}
      {tags.data && (
        <Card className="mb-5" title="Tags" subtitle={`${tags.data.data.tag_count} tags · ${tags.data.data.tag_characters} characters`} icon={Tags}>
          <div className="flex flex-wrap gap-2">{tags.data.data.tags.map((x: string) => <Badge key={x}>{x}</Badge>)}</div>
          {tags.data.data.hashtags.length > 0 && <p className="mt-3 text-ink2">Hashtags: {tags.data.data.hashtags.join(" ")}</p>}
        </Card>
      )}
      {comments.data && (
        <Card className="mb-5" title="Comments" subtitle={`${comments.data.data.comments.length} loaded`} icon={MessageSquare}>
          <ul className="divide-y divide-white/[0.06]">{comments.data.data.comments.map((c: any, i: number) => (
            <li key={i} className="py-3">
              <div className="flex flex-wrap items-center gap-2 text-sm"><b className="text-ink">{c.author}</b><span className="text-muted">{c.likes} likes{c.replies ? ` · ${c.replies} replies` : ""}</span></div>
              <p className="mt-1 text-ink2">{c.text}</p>
            </li>
          ))}</ul>
        </Card>
      )}
      {t && (
        <Card className="mb-5" title="Transcript" subtitle={`${n(t.total_chars)} characters · saved to ${t.saved_to}`} icon={FileText} right={t.next_offset !== null && <Btn size="sm" onClick={() => transcript.mutate(t.next_offset)}>Next part</Btn>}>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap font-sans leading-relaxed text-ink2">{t.text}</pre>
        </Card>
      )}
      <Card title="Description" icon={FileText}>
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap font-sans leading-relaxed text-ink2">{v.description || "(empty)"}</pre>
        {v.tags?.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{v.tags.map((x: string) => <Badge key={x}>{x}</Badge>)}</div>}
      </Card>
    </>
  );
}
