import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { SYSTEM_PROMPT } from "./prompt";

export const runtime = "nodejs";
export const maxDuration = 60;

interface RequestBody {
  machines: Array<{
    id: string;
    name: string;
    setupTimeMinutes: number;
    outputUnitsPerHour: number;
    currentProduct: string | null;
  }>;
  orders: Array<{
    id: string;
    productType: string;
    quantity: number;
    arrivedAt: number;
    dueAt: number;
  }>;
  now: number;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      "ANTHROPIC_API_KEY not set on the server. Add it to .env.local to enable Claude planning.",
      { status: 503 },
    );
  }
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }
  if (!Array.isArray(body.machines) || !Array.isArray(body.orders)) {
    return new Response("Body must include machines[] and orders[]", { status: 400 });
  }

  const client = new Anthropic({ apiKey });
  const userPayload = JSON.stringify(
    {
      now: body.now ?? 0,
      machines: body.machines.map((m) => ({
        id: m.id,
        name: m.name,
        setupTimeMinutes: m.setupTimeMinutes,
        outputUnitsPerHour: m.outputUnitsPerHour,
        currentProduct: m.currentProduct,
      })),
      orders: body.orders.map((o) => ({
        id: o.id,
        productType: o.productType,
        quantity: o.quantity,
        arrivedAt: o.arrivedAt,
        dueAt: o.dueAt,
      })),
    },
    null,
    2,
  );

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const sdkStream = await client.messages.stream({
          model: "claude-opus-4-6",
          max_tokens: 4096,
          system: [
            {
              type: "text",
              text: SYSTEM_PROMPT,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Schedule the following factory state. Return reasoning then a JSON plan as specified.\n\n${userPayload}`,
                },
              ],
            },
          ],
        });

        for await (const event of sdkStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        controller.enqueue(
          encoder.encode(`\n[Claude error: ${(err as Error).message}]`),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
