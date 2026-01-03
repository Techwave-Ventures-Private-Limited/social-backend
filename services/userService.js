import { pipeline } from "@xenova/transformers";

let embedder;

export function buildSearchText(user, education, experience) {
    //console.log(education, experience)
    return `
    ${user.name || ""}
    ${user?.bio || ""}
    ${user?.headline || ""}
    ${user?.address || ""}
    ${education?.degree || ""}
    ${education?.school || ""}
    ${experience?.role || ""}
    ${experience?.company || ""}
    ${user.category || ""}
    `.trim();
}

export async function generateEmbedding(text) {
    if (!embedder) {
        embedder = await pipeline(
            "feature-extraction",
            "Xenova/all-MiniLM-L6-v2"
        );
    }

    const output = await embedder(text, {
        pooling: "mean",
        normalize: true
    });

    return Array.from(output.data);
}

export async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2" // 384 dims, fast & accurate
    );
  }
  return embedder;
}

export async function generatePostEmbedding(category, discription) {
  const text = `${category}. ${discription || ""}`;

  const model = await getEmbedder();
  const output = await model(text, {
    pooling: "mean",
    normalize: true
  });

  return Array.from(output.data);
}