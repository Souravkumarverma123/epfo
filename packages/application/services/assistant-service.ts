import type OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
import { formatINR, statusCopy, type ClaimStatus } from "@repo/domain";
import { MemberService } from "./member-service";
import { ClaimsService, ClaimNotFoundError } from "./claims-service";
import { searchHelp } from "./assistant-knowledge";

const MODEL = "gpt-4o-mini";
const MAX_TOOL_ROUNDS = 4;

export interface AssistantChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * The AI Assistant's brain. Kept to the same principle as the rest of this
 * app's reliability story: "the model explains state, it never decides
 * it" — every tool it can call is read-only (search_help, and, only for a
 * signed-in member, their OWN account summary / claim status / claim
 * list). There is no tool that submits a claim, edits KYC, or changes
 * anything — the system prompt says so explicitly, and there's nothing to
 * misuse even if it tried, because no mutating tool exists to call.
 *
 * memberId is threaded through from the tRPC context, never taken from
 * the model — a tool call can't be tricked into fetching a different
 * member's data because there's no memberId parameter the model could
 * supply; every personal tool implicitly means "the signed-in member".
 */
export class AssistantService {
  constructor(
    private readonly openai: OpenAI,
    private readonly memberService: MemberService,
    private readonly claimsService: ClaimsService,
  ) {}

  async chat(params: {
    memberId: string | null;
    lang: "en" | "hi";
    history: AssistantChatMessage[];
    message: string;
  }): Promise<string> {
    const { memberId, lang, history, message } = params;

    const tools: ChatCompletionTool[] = [
      {
        type: "function",
        function: {
          name: "search_help",
          description:
            "Search this site's real help/informational content (how EPF/EPS/EDLI work, RTI process, employer login, KYC/nominees, privacy) to answer general questions. Always use this before answering a factual question about EPFO or this site, instead of relying on general knowledge — if it returns no match, say you don't have that information rather than guessing.",
          parameters: {
            type: "object",
            properties: { query: { type: "string", description: "What the user wants to know" } },
            required: ["query"],
          },
        },
      },
    ];

    if (memberId) {
      tools.push(
        {
          type: "function",
          function: {
            name: "get_my_account_summary",
            description:
              "Get the signed-in member's real account summary: total PF balance, last contribution, pension service duration, and pending tasks (like a missing PAN). Use for 'my balance', 'my account', 'what do I need to do'.",
            parameters: { type: "object", properties: {}, required: [] },
          },
        },
        {
          type: "function",
          function: {
            name: "get_claim_status",
            description:
              "Look up the real, current status of one of the signed-in member's own claims by claim number. Use for 'where is my claim', 'status of claim X'.",
            parameters: {
              type: "object",
              properties: { claimNumber: { type: "string" } },
              required: ["claimNumber"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "list_my_claims",
            description:
              "List all of the signed-in member's claims with their current status. Use when they don't give a specific claim number, or ask 'do I have any claims'.",
            parameters: { type: "object", properties: {}, required: [] },
          },
        },
      );
    }

    const systemPrompt = [
      "You are the AI Assistant on EPFO One — a hackathon prototype rebuild of the EPFO member portal, not the real government site. Say so if asked whether you're official.",
      "Answer only using tool results, or general well-known facts about how EPF/EPS/EDLI work that this site's own pages also state. Never invent specific policy numbers, dates, interest rates, or figures beyond what a tool returns.",
      "Never invent a URL or external website. search_help results include a `page` field, which is a path on THIS site (like /about) — when pointing someone to more detail, name the page in plain text (e.g. 'see the About page') without turning it into a link or adding a domain you don't know.",
      "You cannot perform actions — you cannot submit a claim, edit KYC, approve anything, or change any data. You can only look things up and explain. If asked to do something like that, say plainly that you can't and point to the right page instead.",
      memberId
        ? "The user is signed in as a member — you may use the personal account/claim tools, which are automatically scoped to them; you never need to ask for or accept a UAN or member ID."
        : "The user is NOT signed in — you have no personal tools. If they ask about their own balance or claims, tell them to sign in first.",
      lang === "hi" ? "Reply in Hindi." : "Reply in English.",
      "Keep answers short — a few sentences, not an essay.",
    ].join(" ");

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...history.map((h): ChatCompletionMessageParam => ({ role: h.role, content: h.content })),
      { role: "user", content: message },
    ];

    let round = 0;
    for (;;) {
      const response = await this.openai.chat.completions.create({
        model: MODEL,
        messages,
        tools,
        tool_choice: "auto",
      });
      const choice = response.choices[0];
      if (!choice) return "Sorry, I couldn't process that.";

      const toolCalls = choice.message.tool_calls;
      if (!toolCalls || toolCalls.length === 0 || round >= MAX_TOOL_ROUNDS) {
        return choice.message.content ?? "Sorry, I couldn't find an answer to that.";
      }

      messages.push(choice.message);
      for (const toolCall of toolCalls) {
        if (toolCall.type !== "function") continue;
        const result = await this.executeTool(toolCall.function.name, toolCall.function.arguments, memberId, lang);
        messages.push({ role: "tool", tool_call_id: toolCall.id, content: result });
      }
      round++;
    }
  }

  private async executeTool(
    name: string,
    rawArgs: string,
    memberId: string | null,
    lang: "en" | "hi",
  ): Promise<string> {
    try {
      const args = rawArgs ? JSON.parse(rawArgs) : {};

      if (name === "search_help") {
        return searchHelp(String(args.query ?? ""), lang);
      }

      if (!memberId) {
        return JSON.stringify({ error: "Not signed in — this tool needs a signed-in member." });
      }

      switch (name) {
        case "get_my_account_summary": {
          const summary = await this.memberService.getDashboardSummary(memberId);
          return JSON.stringify({
            totalBalance: formatINR(summary.totalBalancePaise),
            lastContribution: summary.lastContribution
              ? {
                  amount: formatINR(summary.lastContribution.amountPaise),
                  month: summary.lastContribution.month,
                  onTime: summary.lastContribution.onTime,
                }
              : null,
            pensionService: `${summary.pensionService.years} years, ${summary.pensionService.months} months`,
            pendingTasks: summary.tasks.map((t) => t.title[lang]),
          });
        }
        case "get_claim_status": {
          try {
            const result = await this.claimsService.getStatus(memberId, String(args.claimNumber ?? ""));
            const copy = statusCopy(result.claim.status as ClaimStatus, lang);
            return JSON.stringify({ claimNumber: args.claimNumber, status: copy.label, message: copy.message });
          } catch (err) {
            if (err instanceof ClaimNotFoundError) {
              return JSON.stringify({ error: "No claim with that number belongs to this member." });
            }
            throw err;
          }
        }
        case "list_my_claims": {
          const claims = await this.claimsService.listClaims(memberId);
          if (claims.length === 0) return JSON.stringify({ claims: [], note: "No claims on record." });
          return JSON.stringify({
            claims: claims.map((c) => ({
              claimNumber: c.claimNumber,
              status: statusCopy(c.status as ClaimStatus, lang).label,
            })),
          });
        }
        default:
          return JSON.stringify({ error: `Unknown tool: ${name}` });
      }
    } catch (err) {
      return JSON.stringify({ error: err instanceof Error ? err.message : "Tool call failed" });
    }
  }
}
