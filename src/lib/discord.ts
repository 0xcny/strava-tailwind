const WEBHOOKS = {
  update: process.env.DISCORD_WEBHOOK_UPDATE,
  scraper: process.env.DISCORD_WEBHOOK_SCRAPER,
  alerts: process.env.DISCORD_WEBHOOK_ALERTS,
} as const

type Channel = keyof typeof WEBHOOKS

export async function sendDiscord(channel: Channel, message: string, color?: number) {
  const url = WEBHOOKS[channel]
  if (!url) return

  const embed = {
    description: message.slice(0, 4096),
    color: color ?? 0x2f3136,
    timestamp: new Date().toISOString(),
  }

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    })
  } catch {
    console.error(`[DISCORD] Failed to send to #${channel}`)
  }
}

// Preset colors
export const DISCORD_GREEN = 0x57f287
export const DISCORD_YELLOW = 0xfee75c
export const DISCORD_RED = 0xed4245
export const DISCORD_BLUE = 0x5865f2
