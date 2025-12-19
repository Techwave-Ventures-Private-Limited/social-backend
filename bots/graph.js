const { StateGraph } = require("@langchain/langgraph");
const { ChatGroq } = require("@langchain/groq");
const { postPrompt, commentPrompt } = require("./prompts");
const Post = require("../modules/post");

const model = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: "llama-3.1-8b-instant"
});

function buildBotGraph() {
    const graph = new StateGraph({
        channels: {
            bot: "object",
            action: "string",
            content: "string",
            post: "string"
        }
    });

    graph.addNode("decide", async (state) => {
        if (!state.bot) {
            throw new Error("Bot missing in graph state");
        }

        if (state.bot.bt === "POST") {
            //console.log("posting")
            return { bot: state.bot, action: "POST" };
        } else if (state.bot.bt === "COMMENT") {
            //console.log("Commenting");
            return { bot: state.bot, action: "COMMENT" };
        }

        return { action: "SKIP" };
    });

    graph.addNode("generate", async (state) => {
        if (state.action === "POST") {
            const res = await model.invoke(postPrompt({
                category: state.bot.category,
                headline: state.bot.headline
            }));
            return { content: res.content };
        }
    });

    graph.addNode("execute", async (state) => {
        if (state.action === "POST") {
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
        } else if (state.action === "COMMENT") {
            const posts = await Post.aggregate([
                {
                    $match: {
                        category: state.bot.category,
                        createdBy: { $ne: state.bot._id }
                    }
                },
                { $sample: { size: 5 } }
            ]);

            for (const post of posts) {
                const commentRes = await model.invoke(
                    commentPrompt({
                        post: post.discription,
                        headline: state.bot.headline
                    })
                );

                const commentText = commentRes.content
                    ?.trim()
                    ?.replace(/^["']|["']$/g, "");

                const res = await fetch(`${process.env.BASE_URL}/post/comment`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bot ${state.bot.bk}`
                    },
                    body: JSON.stringify({
                        postId: post._id,
                        text: commentText
                    })
                });

                if (!res.ok) {
                    const errorBody = await res.text();
                    console.log("Comment error:", errorBody);
                }
            }
        }
    });

    graph.addEdge("decide", "generate");
    graph.addEdge("generate", "execute");
    graph.setEntryPoint("decide");

    return graph.compile();
}

module.exports = { buildBotGraph };
