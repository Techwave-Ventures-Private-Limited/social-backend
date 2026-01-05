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
        } else if (state.bot.bt === "LIKE") {
            //console.log("likig post");
            return { bot: state.bot, action: "LIKE" };
        } else if (state.bot.bt === "CATEGORY") {
            return { bot: state.bot, action: "ALL" };
        }

        return { action: "SKIP" };
    });

    graph.addNode("generate", async (state) => {
        if (state.action === "POST" || state.action === "ALL") {
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
            await createPost(state);
        } else if (state.action === "COMMENT") {
            await commentOnPost(state);
        } else if (state.action === "LIKE") {
            await likePost(state);
        } else if (state.action === "ALL") {
            // creating one post per bot user
            await createPost(state);
            await commentOnPost(state);
            await likePost(state);
        }
    });

    graph.addEdge("decide", "generate");
    graph.addEdge("generate", "execute");
    graph.setEntryPoint("decide");

    return graph.compile();
}

const createPost = async (state) => {
    //console.log("State Content : ", state.content);
    const res = await fetch(`${process.env.BASE_URL}/post/createPost`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bot ${state.bot.bk}`
        },
        body: JSON.stringify({
            discription: state?.content.replace(/^["']|["']$/g, ""),
            postType: "public"
        })
    });

    if (!res.ok) {
        let errorBody;
        errorBody = await res.json();
        console.log(errorBody)
    }
}

const commentOnPost = async (state) => {
    const posts = await Post.aggregate([
        {
            $match: {
                category: state.bot.category,
                createdBy: { $ne: state.bot._id }
            }
        },
        { $sample: { size: 1 } }
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

const likePost = async (state) => {
    const posts = await Post.aggregate([
        {
            $match: {
                category: state.bot.category,
                createdBy: { $ne: state.bot._id }
            }
        },
        { $sample: { size: 1 } }
    ]);

    for (const post of posts) {
        const res = await fetch(`${process.env.BASE_URL}/post/like`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bot ${state.bot.bk}`
            },
            body: JSON.stringify({
                postId: post._id,
                userId: state.bot._id
            })
        });

        if (!res.ok) {
            const errorBody = await res.text();
            //console.log("Like error:", errorBody);
        }
    }
}

module.exports = { buildBotGraph };
