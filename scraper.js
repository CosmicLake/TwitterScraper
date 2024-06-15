require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const { features } = require('./config');

const headers = {
    'Authorization': process.env.AUTHORIZATION,
    'x-csrf-token': process.env.CSRF_TOKEN,
    'Cookie': process.env.COOKIE,
};

const userId = '1496397897742491653';  // Your user ID
const tweetCount = 1;  // Number of tweets to fetch
const delayTime = 20000; // 20 seconds in milliseconds

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchTweets(cursor = null, collectedTweets = []) {
    const variables = {
        userId: userId,
        count: Math.min(tweetCount - collectedTweets.length, 20),
        includePromotedContent: true,
        withQuickPromoteEligibilityTweetFields: true,
        withVoice: true,
        withV2Timeline: true,
        cursor: cursor,
    };

    try {
        const response = await axios.get(`https://x.com/i/api/graphql/V7H0Ap3_Hh2FyS75OCDO3Q/UserTweets`, {
            headers: headers,
            params: {
                variables: JSON.stringify(variables),
                features: JSON.stringify(features),
                fieldToggles: JSON.stringify({ withArticlePlainText: false }),
            },
        });

        const entries = response.data.data.user.result.timeline_v2.timeline.instructions.find(
            (instruction) => instruction.type === 'TimelineAddEntries'
        ).entries;

        for (const entry of entries) {
          if (entry.content.entryType === 'TimelineTimelineItem') {
              const tweet = entry.content.itemContent.tweet_results.result;
              const tweetData = {
                  tweetId: tweet.rest_id,
                  text: tweet.legacy.full_text,
                  timestamp: tweet.legacy.created_at,
              };
              collectedTweets.push(tweetData);
          } else if (entry.content.entryType === 'TimelineTimelineModule') {
              const moduleItems = entry.content.items;
              for (const moduleItem of moduleItems) {
                  const tweet = moduleItem.item.itemContent.tweet_results.result;
                  const tweetData = {
                      tweetId: tweet.rest_id,
                      text: tweet.legacy.full_text,
                      timestamp: tweet.legacy.created_at,
                  };
                  collectedTweets.push(tweetData);
              }
          }
      }

      if (collectedTweets.length < tweetCount) {
          const cursorEntry = entries.find(
              (entry) => entry.content.entryType === 'TimelineTimelineCursor'
          );
          if (cursorEntry) {
              await delay(delayTime);
              return await fetchTweets(cursorEntry.content.value, collectedTweets);
          }
      }

      return collectedTweets;

  } catch (error) {
      console.error('Error fetching tweets:', error);
      await delay(delayTime);
      return await fetchTweets(cursor, collectedTweets);
  }
}

function writeTweetsToFile(tweets) {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const filename = `scraped_${timestamp}.txt`;

  if (tweets.length === 0) {
      console.log('No tweets fetched.');
      return;
  }

  const firstTweetDate = tweets[0].timestamp;
  const lastTweetDate = tweets[tweets.length - 1].timestamp;

  let fileContent = `Scraped ${tweets.length} tweets from ${firstTweetDate} to ${lastTweetDate}\n\n`;
  fileContent += `Scraped on: ${now.toISOString()}\n\n`;

  for (const tweet of tweets) {
      fileContent += `Tweet ID: ${tweet.tweetId}\nDate: ${tweet.timestamp}\nContent: ${tweet.text}\n\n`;
  }

  fs.writeFile(filename, fileContent, (err) => {
      if (err) {
          console.error('Error writing to file:', err);
      } else {
          console.log(`Tweets saved to ${filename}`);
      }
  });
}

(async () => {
  const tweets = await fetchTweets();
  writeTweetsToFile(tweets);
})();