import "dotenv/config"
import ical from "node-ical"
import {
  createWebhookObjectClient,
  secretFromEnv
} from "@gathertown/webhook-object-sdk"

const gather = createWebhookObjectClient({
  url: "https://api.v2.gather.town/api/v2/hooks/spaces/9975524c-605e-48bf-930c-fd077ff4dc9a/objects/e377cc6e-3bea-4407-b51b-a2119bde4051",
  secret: secretFromEnv("GATHER_WEBHOOK_SECRET"),
})

export default async function handler(req, res) {
  try {
    const calendarUrl = process.env.GOOGLE_CALENDAR_ICS_URL

    if (!calendarUrl) {
      throw new Error("Missing GOOGLE_CALENDAR_ICS_URL")
    }

    const now = new Date()
    const events = await ical.async.fromURL(calendarUrl)

    let activeEvent = null

    for (const event of Object.values(events)) {
      if (event.type !== "VEVENT") continue

      if (isActiveEvent(event, now)) {
        activeEvent = event
        break
      }
    }

    if (activeEvent) {
      const endTime = getCurrentEnd(activeEvent, now)

      await gather.status.set({
        state: "working"
      })

      await gather.activity.add({
        id: "calendar-current",
        text: `Busy until ${formatTime(endTime)}`
      })

      return res.status(200).json({
        ok: true,
        status: "working",
        until: formatTime(endTime)
      })
    }

    await gather.status.set({
      state: "on"
    })

    await gather.activity.remove({
      id: "calendar-current"
    })

    return res.status(200).json({
      ok: true,
      status: "on"
    })

  } catch (error) {
    console.error(error)

    try {
      await gather.status.set({
        state: "question"
      })
    } catch {}

    return res.status(500).json({
      ok: false,
      error: error.message
    })
  }
}

function isActiveEvent(event, now) {
  if (event.rrule) {
    const duration =
      new Date(event.end).getTime() -
      new Date(event.start).getTime()

    const searchStart = new Date(now.getTime() - duration)

    const occurrences = event.rrule.between(
      searchStart,
      now,
      true
    )

    return occurrences.some(start => {
      const end = new Date(start.getTime() + duration)

      return start <= now && now < end
    })
  }

  const start = new Date(event.start)
  const end = new Date(event.end)

  return start <= now && now < end
}

function getCurrentEnd(event, now) {
  if (!event.rrule) {
    return new Date(event.end)
  }

  const duration =
    new Date(event.end).getTime() -
    new Date(event.start).getTime()

  const searchStart = new Date(now.getTime() - duration)

  const occurrences = event.rrule.between(
    searchStart,
    now,
    true
  )

  for (const start of occurrences) {
    const end = new Date(start.getTime() + duration)

    if (start <= now && now < end) {
      return end
    }
  }

  return new Date(event.end)
}

function formatTime(date) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok"
  }).format(date)
}