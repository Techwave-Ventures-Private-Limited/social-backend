import Hashtag from "../modules/hashtags.js"; 

export function extractHashtags(text = "") {
  const matches = text.match(/#[a-zA-Z0-9_]+/g) || [];
  return [...new Set(
    matches.map(tag => tag.substring(1).toLowerCase())
  )];
}

export async function processHashtags(tags) {
  const hashtagIds = [];

  for (const tag of tags) {
    const hashtag = await Hashtag.findOneAndUpdate(
      { tag },
      {
        $inc: { usageCount: 1 },
        $set: { lastUsedAt: new Date() }
      },
      { upsert: true, new: true }
    );

    hashtagIds.push(hashtag._id);
  }
  //console.log("hashtagIds",hashtagIds);
  return hashtagIds;
}