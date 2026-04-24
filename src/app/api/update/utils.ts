import { KOM_REGAINED_THRESHOLD } from "@/lib/constants"
import { sendDiscord, DISCORD_GREEN, DISCORD_RED, DISCORD_YELLOW } from "@/lib/discord"
import pb from "@/lib/pocketbase"
import { Collections, KomTimeseriesRecord } from "@/lib/types/pocketbase-types"
import { NextResponse } from "next/server"

type LogLevel = "info" | "warn" | "error" | "debug"

interface LogEntry {
  level: LogLevel
  phase: string
  message: string
  data?: Record<string, unknown>
}

export function createRequestLog() {
  const entries: LogEntry[] = []
  const startTime = Date.now()

  const log = (phase: string, message: string, data?: Record<string, unknown>) => {
    entries.push({ level: "info", phase, message, data })
    console.log(`[${phase}] ${message}${data ? " " + JSON.stringify(data) : ""}`)
  }

  const warn = (phase: string, message: string, data?: Record<string, unknown>) => {
    entries.push({ level: "warn", phase, message, data })
    console.warn(`[${phase}] ⚠ ${message}${data ? " " + JSON.stringify(data) : ""}`)
  }

  const error = (phase: string, message: string, data?: Record<string, unknown>) => {
    entries.push({ level: "error", phase, message, data })
    console.error(`[${phase}] ✗ ${message}${data ? " " + JSON.stringify(data) : ""}`)
  }

  const debug = (phase: string, message: string, data?: Record<string, unknown>) => {
    entries.push({ level: "debug", phase, message, data })
  }

  const duration = () => Date.now() - startTime

  const serialize = () => {
    const lines = entries.map((e) => {
      const prefix = e.level === "warn" ? "⚠" : e.level === "error" ? "✗" : e.level === "debug" ? "·" : "→"
      const dataStr = e.data ? ` ${JSON.stringify(e.data)}` : ""
      return `${prefix} [${e.phase}] ${e.message}${dataStr}`
    })
    lines.push(`\n⏱ ${duration()}ms`)
    return lines.join("\n")
  }

  const hasErrors = () => entries.some((e) => e.level === "error")
  const hasWarnings = () => entries.some((e) => e.level === "warn")

  const getSummary = () => {
    const gained = entries.find((e) => e.phase === "DIFF")?.data
    const source = entries.find((e) => e.phase === "SCRAPER" || e.phase === "API")?.phase
    return { gained, source, duration: duration() }
  }

  return { log, warn, error, debug, serialize, hasErrors, hasWarnings, getSummary, duration }
}

export type RequestLog = ReturnType<typeof createRequestLog>

export async function checkIfRestored(segmentId: number) {
  try {
    const previousEntry: KomTimeseriesRecord = await pb
      .collection(Collections.KomTimeseries)
      .getFirstListItem(`kom_effort=${segmentId}`)
    if (previousEntry) {
      return new Date().getTime() - new Date(previousEntry.created!).getTime() < KOM_REGAINED_THRESHOLD
    }
    return false
  } catch {
    return false
  }
}

export async function errorResponse(message: string, status: number, logger: RequestLog, err?: unknown, ...params: unknown[]) {
  logger.error("EXIT", message, {
    status,
    ...(err && { error: err instanceof Error ? err.message : String(err) }),
    ...(params.length > 0 && { params }),
  })

  const serialized = logger.serialize()

  // Discord: error to both #update-log and #alerts
  const discordMsg = `**Error ${status}**: ${message}\n\`\`\`\n${serialized.slice(0, 3800)}\n\`\`\``
  await Promise.allSettled([
    sendDiscord("update", discordMsg, DISCORD_RED),
    sendDiscord("alerts", discordMsg, DISCORD_RED),
  ])

  return NextResponse.json(
    { status, message, error: err instanceof Error ? { message: err.message, stack: err.stack } : err || null, log: serialized },
    { status }
  )
}

export async function successResponse(logger: RequestLog) {
  logger.log("EXIT", "200 OK")

  const serialized = logger.serialize()
  const color = logger.hasWarnings() ? DISCORD_YELLOW : DISCORD_GREEN

  await sendDiscord("update", `\`\`\`\n${serialized.slice(0, 3900)}\n\`\`\``, color)

  return new NextResponse(serialized, { status: 200 })
}
