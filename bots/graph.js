const { StateGraph } = require("@langchain/langgraph");
const { ChatGroq } = require("@langchain/groq");
const { postPrompt } = require("./prompts");

const model = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: "llama-3.1-8b-instant"
});

function buildBotGraph() {
    const graph = new StateGraph({
        channels: {
            bot: "object",
            action: "string",
            content: "string"
        }
    });

    graph.addNode("decide", async (state) => {
        if (!state.bot) {
            throw new Error("Bot missing in graph state");
        }

        if (state.bot.bt === "POST") {
            //console.log("posting")
            return { bot: state.bot, action: "POST" };
        }

        return { action: "SKIP" };
    });

    graph.addNode("generate", async (state) => {
        if (state.action !== "POST") return {};
        const res = await model.invoke(postPrompt({
            category: state.bot.category,
            headline: state.bot.headline
        }));
    return { content: res.content };
});

graph.addNode("execute", async (state) => {
    if (state.action !== "POST") return;
    //console.log("Actual posting", state.content)
    const res = await fetch(`${process.env.BASE_URL}/post/createPost`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bot ${state.bot.bk}`
        },
        body: JSON.stringify({
            discription: state.content.replace(/^["']|["']$/g, ""),
            postType: "public"
        })
    });

    if (!res.ok) {
        let errorBody;
        errorBody = await res.json();
        console.log(errorBody)
    }
});

graph.addEdge("decide", "generate");
graph.addEdge("generate", "execute");
graph.setEntryPoint("decide");

return graph.compile();
}

module.exports = { buildBotGraph };
