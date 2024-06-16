require("dotenv").config();
const axios = require("axios");
const fs = require("fs");
const { Pool } = require("pg");
const { features } = require("./config");

const headers = {
  Authorization: process.env.AUTHORIZATION,
  "x-csrf-token": process.env.CSRF_TOKEN,
  Cookie: process.env.COOKIE,
};

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

const userId = "1496397897742491653"; // Your user ID
const tweetCount = 50; // Number of tweets to fetch
const delayTime = 20000; // 20 seconds in milliseconds

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchTweets(cursor = null, collectedTweets = [], tweetIds = {}) {
  const variables = {
    userId: userId,
    count: 20, // this doesn't seem to respond to changes
    includePromotedContent: true,
    withQuickPromoteEligibilityTweetFields: true,
    withVoice: true,
    withV2Timeline: true,
    cursor: cursor,
  };

  try {
    const response = await axios.get(
      `https://x.com/i/api/graphql/V7H0Ap3_Hh2FyS75OCDO3Q/UserTweets`,
      {
        headers: headers,
        params: {
          variables: JSON.stringify(variables),
          features: JSON.stringify(features),
          fieldToggles: JSON.stringify({ withArticlePlainText: false }),
        },
      },
    );

    const entries =
      response.data.data.user.result.timeline_v2.timeline.instructions.find(
        (instruction) => instruction.type === "TimelineAddEntries",
      ).entries;

    for (const entry of entries) {
      if (entry.content.entryType === "TimelineTimelineItem") {
        const itemType = entry.content.itemContent.itemType;
        if (itemType !== "TimelineTweet") {
          console.log("Unsupported item type:", itemType);
          continue;
        }

        const tweet = entry.content.itemContent.tweet_results.result;
        const tweetData = {
          tweetId: tweet.rest_id,
          text: tweet.legacy.full_text,
          timestamp: tweet.legacy.created_at,
        };
        if (tweetIds[tweetData.tweetId]) {
          console.log("Duplicate tweet ID found:", tweetData.tweetId);
          continue;
        }
        tweetIds[tweetData.tweetId] = true;
        collectedTweets.push(tweetData);
      } else if (entry.content.entryType === "TimelineTimelineModule") {
        const moduleItems = entry.content.items;
        const moduleId = entry.entryId; // Use entryId as moduleId
        let priorTweetId = null;
        for (const moduleItem of moduleItems) {
          const itemType = moduleItem.item.itemContent.itemType;
          if (itemType !== "TimelineTweet") {
            console.log("Unsupported module item type:", itemType);
            continue;
          }

          const tweet = moduleItem.item.itemContent.tweet_results.result;
          const tweetData = {
            tweetId: tweet.rest_id,
            text: tweet.legacy.full_text,
            timestamp: tweet.legacy.created_at,
            moduleId: moduleId,
            priorTweetId: priorTweetId,
          };

          // don't skip setting priorTweetId; basically tweets are generally in a single thread
          // but if someone has replied to another individual tweet in that thread,
          // it will branch into a new module I believe
          priorTweetId = tweetData.tweetId;
          if (tweetIds[tweetData.tweetId]) {
            console.log(
              "Duplicate [module] tweet ID found:",
              tweetData.tweetId,
            );
            continue;
          }
          tweetIds[tweetData.tweetId] = true;
          collectedTweets.push(tweetData);
        }
      }
    }

    if (collectedTweets.length < tweetCount) {
      const bottomCursorEntry = entries.find(
        (entry) =>
          entry.content.entryType === "TimelineTimelineCursor" &&
          entry.content.cursorType === "Bottom",
      );
      if (bottomCursorEntry) {
        console.log(
          `Fetching more tweets... after a delay to prevent rate limiting. This will take ${
            delayTime / 1000
          } seconds. Current timestamp: ${new Date().toISOString()}.\nBottom cursor: ${
            bottomCursorEntry.content.value
          }. Current tweet count: ${collectedTweets.length} / ${tweetCount}`,
        );
        await delay(delayTime);
        return await fetchTweets(
          bottomCursorEntry.content.value,
          collectedTweets,
          tweetIds,
        );
      }
    }

    return collectedTweets;
  } catch (error) {
    console.error("Error fetching tweets:", error);
    await delay(delayTime);
    return await fetchTweets(cursor, collectedTweets, tweetIds);
  }
}

async function insertTweetsToDB(tweets) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const tweet of tweets) {
      const queryText = `INSERT INTO tweets(tweet_id, text, timestamp, prior_tweet_id, module_id)
                         VALUES($1, $2, $3, $4, $5)
                         ON CONFLICT (tweet_id) DO NOTHING;`;
      const values = [
        tweet.tweetId,
        tweet.text,
        tweet.timestamp,
        tweet.priorTweetId || null,
        tweet.moduleId || null,
      ];
      await client.query(queryText, values);
    }
    await client.query("COMMIT");
    console.log(`Inserted ${tweets.length} tweets into the database.`);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

(async () => {
  const tweets = await fetchTweets();
  await insertTweetsToDB(tweets);
})();
