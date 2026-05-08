/*
 * Read-only message renderer for a stage request's pre-acceptance and
 * post-acceptance chat. Self-vs-other alignment is decided in the parent
 * by setting `mine` per message (compare senderUserId to viewer id).
 *
 * No realtime — this is a server-rendered list. Composing a message
 * triggers a redirect/refresh on the parent which re-fetches.
 */

export type ThreadMessage = {
  id: string;
  body: string;
  sentAt: Date;
  mine: boolean;
  senderName: string;
};

export function MessageThread({ messages }: { messages: ThreadMessage[] }) {
  if (messages.length === 0) {
    return (
      <div className="border border-sepia/30 px-6 py-8">
        <p className="font-serif text-sm italic text-sepia">
          No messages yet. Either side can write — a quick line about logistics, ingredients you
          want to focus on, or station preferences usually moves things forward.
        </p>
      </div>
    );
  }

  return (
    <ol className="space-y-5">
      {messages.map((m) => (
        <li
          key={m.id}
          className={m.mine ? "ml-12 border border-cordon-bleu/30 bg-cordon-bleu-wash px-5 py-4" : "mr-12 border border-sepia/30 bg-vellum px-5 py-4"}
        >
          <div className="flex items-baseline justify-between gap-4">
            <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-sepia">
              {m.mine ? "You" : m.senderName}
            </p>
            <p className="font-mono text-[10px] text-sepia-faint">{fmtTime(m.sentAt)}</p>
          </div>
          <p className="mt-2 whitespace-pre-wrap font-serif text-base leading-relaxed text-oak-gall">
            {m.body}
          </p>
        </li>
      ))}
    </ol>
  );
}

function fmtTime(d: Date): string {
  const fmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return fmt.format(d);
}
