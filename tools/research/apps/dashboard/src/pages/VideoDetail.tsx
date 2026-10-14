import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, n, runTool } from "../api";
import { Badge, Btn, Card, CostButton, ErrorBox, Loading, PageTitle, Stat, Thumb, Warnings } from "../ui";

export function VideoDetail({ id }: { id: string }) {
  const qc = useQueryClient();
  const { data: d, error } = useQuery({ queryKey: ["video", id], queryFn: () => api<any>(`/api/videos/${id}`) });
  const stats = useMutation({ mutationFn: () => runTool("video_stats", { video: id, refresh: true }), onSuccess: () => qc.invalidateQueries({ queryKey: ["video", id] }) });
  const tags = useMutation({ mutationFn: () => runTool("video_tags", { video: id }) });
  const comments = useMutation({ mutationFn: () => runTool("video_comments", { video: id, limit: 20 }) });
  const transcript = useMutation({ mutationFn: (offset: number) => runTool("video_transcript", { video: id, max_chars: 6000, offset }) });
  if (error) return <><a href="#/outliers">← back</a><div className="mt-3"><ErrorBox error={error} /></div><p className="mt-3 text-ink2">This video is not in the database yet. Research a keyword or scan outliers first.</p></>;
  if (!d) return <Loading />;
  const v = d.video;
  const t = transcript.data?.data;
  return (
    <>
      <a href="javascript:history.back()">← back</a>
      <div className="mt-3"><PageTitle title={v.title} sub={`${d.channel?.title ?? v.channel_id} · ${d.channel ? n(d.channel.subscribers) + " subs" : ""} · published ${v.published_at.slice(0, 10)}`} /></div>
      {v.source === "demo" && <div className="mb-4"><Badge tone="bad">demo data</Badge></div>}
      <div className="mb-5 grid gap-5 lg:grid-cols-[auto_1fr]">
        <Thumb src={v.thumbnail} alt="" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Views" value={n(v.views)} sub={`${n(v.views_per_day)} / day (est.)`} />
          <Stat label="Likes" value={n(v.likes)} />
          <Stat label="Comments" value={n(v.comments)} />
          <Stat label="Length" value={`${Math.round(v.duration_sec / 60)} min`} />
        </div>
      </div>
      <div className="mb-5 flex flex-wrap gap-3">
        <a href={v.url} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center rounded-xl border border-line px-4 text-ink no-underline hover:bg-panel2">Open on YouTube ↗</a>
        <CostButton cost={4} variant="ghost" onRun={() => stats.mutate()} disabled={stats.isPending}>Refresh stats + vs channel</CostButton>
        <CostButton cost={1} variant="ghost" onRun={() => tags.mutate()} disabled={tags.isPending}>Load tags</CostButton>
        <CostButton cost={1} variant="ghost" onRun={() => comments.mutate()} disabled={comments.isPending}>Load comments</CostButton>
        <Btn variant="ghost" onClick={() => transcript.mutate(0)} disabled={transcript.isPending}>{transcript.isPending ? "Fetching…" : "Load transcript (free)"}</Btn>
      </div>
      {[stats, tags, comments, transcript].map((m, i) => m.error ? <div key={i} className="mb-3"><ErrorBox error={m.error} /></div> : null)}

      {stats.data && <Card title="Stats vs channel" className="mb-5"><Warnings list={stats.data.warnings} /><p className="text-ink2">{stats.data.summary}</p>{stats.data.data.outlier_multiplier && <p className="mt-2 text-ink">Outlier multiplier: <b>{stats.data.data.outlier_multiplier}×</b> the channel's median (estimate).</p>}</Card>}
      {tags.data && (
        <Card title={`Tags (${tags.data.data.tag_count}, ${tags.data.data.tag_characters} characters)`} className="mb-5">
          <div className="flex flex-wrap gap-2">{tags.data.data.tags.map((x: string) => <Badge key={x}>{x}</Badge>)}</div>
          {tags.data.data.hashtags.length > 0 && <p className="mt-3 text-ink2">Hashtags: {tags.data.data.hashtags.join(" ")}</p>}
          <pre className="mt-3 whitespace-pre-wrap text-sm text-ink2">{tags.data.data.description_first_lines}</pre>
        </Card>
      )}
      {comments.data && (
        <Card title={`Comments (${comments.data.data.comments.length})`} className="mb-5">
          <ul className="space-y-3">{comments.data.data.comments.map((c: any, i: number) => <li key={i} className="border-b border-line pb-2 text-ink2"><b className="text-ink">{c.author}</b> · {c.likes} likes{c.replies ? ` · ${c.replies} replies` : ""}<div>{c.text}</div></li>)}</ul>
        </Card>
      )}
      {t && (
        <Card title={`Transcript (${n(t.total_chars)} characters)`} className="mb-5" right={t.next_offset !== null && <Btn variant="ghost" onClick={() => transcript.mutate(t.next_offset)}>Next part</Btn>}>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-ink2">{t.text}</pre>
          <p className="mt-2 text-sm text-muted">Full text saved to {t.saved_to}</p>
        </Card>
      )}
      <Card title="Description">
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap text-ink2">{v.description || "(empty)"}</pre>
        {v.tags?.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{v.tags.map((x: string) => <Badge key={x}>{x}</Badge>)}</div>}
      </Card>
    </>
  );
}
