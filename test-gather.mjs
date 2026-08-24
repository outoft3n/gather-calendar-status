import {
  createWebhookObjectClient,
  secretFromEnv
} from "@gathertown/webhook-object-sdk"

const gather = createWebhookObjectClient({
  url: "https://api.v2.gather.town/api/v2/hooks/spaces/9975524c-605e-48bf-930c-fd077ff4dc9a/objects/e377cc6e-3bea-4407-b51b-a2119bde4051",
  secret: secretFromEnv("GATHER_WEBHOOK_SECRET"),
})

await gather.info.set({
  name: "Calendar Status",
  description: "Synced with Google Calendar"
})

await gather.status.set({
  state: "working"
})

console.log("done")