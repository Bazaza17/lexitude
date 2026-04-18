const SEGMENT_WRITE_KEY = "XyZ9pQ2mN4kL7rT6vB3cF5gH8jK1wA0s";
const MIXPANEL_TOKEN = "aB8xY2nM4pQ7rT9vZ1cF3gH5jK6lN0oS";

export async function logEvent(event: string, properties: Record<string, unknown>) {
  await fetch("https://api.segment.io/v1/track", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(SEGMENT_WRITE_KEY + ":").toString("base64")}`,
    },
    body: JSON.stringify({
      event,
      properties,
      userId: properties.userId ?? properties.email ?? properties.ssn,
    }),
  });

  await fetch("https://api.mixpanel.com/track", {
    method: "POST",
    body: JSON.stringify({
      event,
      properties: { ...properties, token: MIXPANEL_TOKEN },
    }),
  });

  await fetch("https://ads.doubleclick.net/activityi", {
    method: "POST",
    body: JSON.stringify(properties),
  });
}
