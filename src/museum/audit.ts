import { ROOMS } from "./types";

type AuditIssue = { roomId: string; exhibitId: string; field: string; problem: string };

const FORBIDDEN_PATTERNS = [
  /PLACEHOLDER/i,
  /\bTODO\b/i,
  /\bTBD\b/i,
  /\bFIXME\b/i,
  /lorem ipsum/i,
  /placeholder\.png/i,
];

function checkText(value: string | undefined, field: string, ctx: { roomId: string; exhibitId: string }, issues: AuditIssue[]) {
  if (!value || !value.trim()) {
    issues.push({ ...ctx, field, problem: "vacío" });
    return;
  }
  for (const re of FORBIDDEN_PATTERNS) {
    if (re.test(value)) {
      issues.push({ ...ctx, field, problem: `contiene patrón prohibido (${re})` });
      return;
    }
  }
}

export async function runMuseumAudit(): Promise<{ ok: boolean; issues: AuditIssue[] }> {
  const issues: AuditIssue[] = [];
  const seenIds = new Set<string>();

  for (const room of ROOMS) {
    const roomCtx = { roomId: room.id, exhibitId: "(room)" };
    checkText(room.name, "room.name", roomCtx, issues);
    checkText(room.curator, "room.curator", roomCtx, issues);
    if (room.exhibits.length === 0) {
      issues.push({ ...roomCtx, field: "exhibits", problem: "sin obras" });
    }

    for (const ex of room.exhibits) {
      const ctx = { roomId: room.id, exhibitId: ex.id };
      if (seenIds.has(ex.id)) {
        issues.push({ ...ctx, field: "id", problem: "id duplicado" });
      }
      seenIds.add(ex.id);
      checkText(ex.author, "author", ctx, issues);
      checkText(ex.work, "work", ctx, issues);
      checkText(ex.description, "description", ctx, issues);
      checkText(ex.why, "why", ctx, issues);
    }
  }

  // Verify each cover file is served from /covers/<id>.jpg
  const checks = await Promise.all(
    ROOMS.flatMap((room) =>
      room.exhibits.map(async (ex) => {
        const url = `/covers/${ex.id}.jpg`;
        try {
          const res = await fetch(url, { method: "HEAD", cache: "no-store" });
          if (!res.ok) {
            return { roomId: room.id, exhibitId: ex.id, field: "cover", problem: `HTTP ${res.status} en ${url}` } as AuditIssue;
          }
        } catch (err) {
          return { roomId: room.id, exhibitId: ex.id, field: "cover", problem: `red: ${(err as Error).message}` } as AuditIssue;
        }
        return null;
      }),
    ),
  );
  for (const c of checks) if (c) issues.push(c);

  const ok = issues.length === 0;
  if (ok) {
    console.info(
      `%c✓ Auditoría del museo OK %c· ${ROOMS.length} salas · ${ROOMS.reduce((a, r) => a + r.exhibits.length, 0)} obras · portadas verificadas`,
      "color:#3a7d44;font-weight:600",
      "color:#666",
    );
  } else {
    console.group(
      `%c✗ Auditoría del museo: ${issues.length} problema(s)`,
      "color:#b03a2e;font-weight:600",
    );
    for (const i of issues) {
      console.warn(`[${i.roomId} / ${i.exhibitId}] ${i.field}: ${i.problem}`);
    }
    console.groupEnd();
  }
  return { ok, issues };
}
