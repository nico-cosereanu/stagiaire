import "server-only";

/*
 * Plain HTML email templates. Intentionally no React Email — the volume
 * is small and the visual brief is "newspaper masthead", which renders
 * fine as inline-styled tables. Each template is a pure function so it's
 * easy to snapshot-test later.
 *
 * Palette mirrors the app's editorial tokens (vellum, oak-gall, sepia,
 * cordon-bleu) but inlined as hex because email clients drop CSS vars.
 */

export type Template = { subject: string; html: string; text: string };

const PALETTE = {
  vellum: "#f6f0e7",
  ermine: "#fbf6ee",
  oakGall: "#2a1f15",
  sepia: "#8a6f4a",
  border: "#d4c4ae",
  cordonBleu: "#0a3d62",
};

function wrap(opts: { heading: string; body: string; cta?: { label: string; href: string } }): string {
  const cta = opts.cta
    ? `<div style="margin-top:32px;"><a href="${opts.cta.href}" style="display:inline-block;background:${PALETTE.oakGall};color:${PALETTE.vellum};padding:14px 28px;text-decoration:none;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">${opts.cta.label}</a></div>`
    : "";
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:${PALETTE.vellum};">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${PALETTE.vellum};">
  <tr><td align="center" style="padding:40px 20px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${PALETTE.ermine};border:1px solid ${PALETTE.border};">
      <tr><td style="padding:40px 32px;">
        <p style="margin:0 0 20px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${PALETTE.sepia};">Stagiaire</p>
        <h1 style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-weight:400;font-size:28px;line-height:1.15;color:${PALETTE.oakGall};">${opts.heading}</h1>
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.6;color:${PALETTE.oakGall};">${opts.body}</div>
        ${cta}
      </td></tr>
    </table>
    <p style="margin:24px 0 0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:${PALETTE.sepia};">Stagiaire — chef stages, end-to-end.</p>
  </td></tr>
</table>
</body></html>`;
}

function formatRange(startIso: string, endIso: string): string {
  const fmt = (iso: string) => {
    const d = new Date(`${iso}T00:00:00Z`);
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
  };
  return `${fmt(startIso)} → ${fmt(endIso)}`;
}

/* ─── Templates ──────────────────────────────────────────────────────── */

export function requestSubmitted(args: {
  restaurantName: string;
  stagiaireName: string;
  startDate: string;
  endDate: string;
  url: string;
}): Template {
  const range = formatRange(args.startDate, args.endDate);
  return {
    subject: `New stage request from ${args.stagiaireName}`,
    html: wrap({
      heading: `${args.stagiaireName} wants to stage at ${args.restaurantName}.`,
      body: `<p style="margin:0 0 12px;">For ${range}.</p><p style="margin:0;">They've sent a cover note. Have a look when you've got a moment between services.</p>`,
      cta: { label: "Open the request", href: args.url },
    }),
    text: `${args.stagiaireName} wants to stage at ${args.restaurantName} for ${range}. Open: ${args.url}`,
  };
}

export function requestAccepted(args: {
  restaurantName: string;
  stagiaireName: string;
  startDate: string;
  endDate: string;
  url: string;
}): Template {
  const range = formatRange(args.startDate, args.endDate);
  return {
    subject: `${args.restaurantName} accepted your stage request`,
    html: wrap({
      heading: `${args.restaurantName} said yes.`,
      body: `<p style="margin:0 0 12px;">Hi ${args.stagiaireName} — the kitchen at ${args.restaurantName} accepted your request for ${range}.</p><p style="margin:0;">Open the thread to confirm logistics.</p>`,
      cta: { label: "Open the thread", href: args.url },
    }),
    text: `${args.restaurantName} accepted your stage request for ${range}. Open: ${args.url}`,
  };
}

export function requestDeclined(args: {
  restaurantName: string;
  stagiaireName: string;
  url: string;
}): Template {
  return {
    subject: `${args.restaurantName} couldn't take this stage`,
    html: wrap({
      heading: `${args.restaurantName} passed on this one.`,
      body: `<p style="margin:0 0 12px;">Hi ${args.stagiaireName} — the kitchen at ${args.restaurantName} declined the request. Most declines are about timing or stage volume, not you.</p><p style="margin:0;">There are 657 other Michelin-starred kitchens on Stagiaire. Try another window or another house.</p>`,
      cta: { label: "Browse the directory", href: args.url },
    }),
    text: `${args.restaurantName} declined your stage request. Browse the directory: ${args.url}`,
  };
}

export function stageCompleted(args: {
  restaurantName: string;
  stagiaireName: string;
  url: string;
}): Template {
  return {
    subject: `Your stage at ${args.restaurantName} is wrapped — leave a review`,
    html: wrap({
      heading: `Service is over. Time to write it up.`,
      body: `<p style="margin:0 0 12px;">Hi ${args.stagiaireName} — ${args.restaurantName} marked your stage complete. The review window is open.</p><p style="margin:0;">Reviews stay hidden until both sides submit. Honest is good.</p>`,
      cta: { label: "Leave your review", href: args.url },
    }),
    text: `${args.restaurantName} marked your stage complete. Leave your review: ${args.url}`,
  };
}

export function reviewSubmitted(args: {
  recipientName: string;
  counterpartyName: string;
  url: string;
}): Template {
  return {
    subject: `${args.counterpartyName} reviewed you — submit yours to reveal both`,
    html: wrap({
      heading: `${args.counterpartyName} wrote their review.`,
      body: `<p style="margin:0 0 12px;">Hi ${args.recipientName} — yours is the only thing standing between two reviews and a closed loop. Both reveal at once.</p><p style="margin:0;">Window is 14 days; after that the existing review goes live alone.</p>`,
      cta: { label: "Write your review", href: args.url },
    }),
    text: `${args.counterpartyName} wrote their review. Submit yours to reveal both: ${args.url}`,
  };
}
