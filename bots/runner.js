import { buildBotGraph } from "./graph.js";
import { randomDelay } from "./config.js";

const graph = buildBotGraph();

export async function runBot(bot) {
    try {
        await graph.invoke({ bot });

    } catch (e) {
        console.error("Bot error:", e.message);
    }

    setTimeout(() => runBot(bot), randomDelay());
}
