import fs from "fs/promises";
import { XMLParser } from "fast-xml-parser";

type Channel = {
  name: string;
  channelId: string;
  defaultLevel: string;
  topics: string[];
};

type Resource = {
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  channelName: string;
  publishedAt: string;
  contentType: "youtube";
  level: string;
  topics: string[];
};

const parser = new XMLParser({
  ignoreAttributes: false,
});

async function loadChannels(): Promise<Channel[]> {
  const raw = await fs.readFile("./channels.json", "utf-8");
  return JSON.parse(raw);
}

async function fetchChannelVideos(channel: Channel): Promise<Resource[]> {
  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.channelId}`;

  const response = await fetch(rssUrl);
  const xml = await response.text();

  const parsed = parser.parse(xml);

  const entries = parsed.feed.entry || [];

  return entries.map((entry: any) => {
    const videoId = entry["yt:videoId"];

    return {
      id: videoId,
      title: entry.title,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,

      channelName: entry.author?.name ?? channel.name,
      publishedAt: entry.published,

      contentType: "youtube",
      level: channel.defaultLevel,
      topics: channel.topics,
    };
  });
}

async function main() {
  const channels = await loadChannels();

  const allResources: Resource[] = [];

  for (const channel of channels) {
    console.log(`Fetching ${channel.name}...`);

    try {
      const resources = await fetchChannelVideos(channel);
      allResources.push(...resources);
    } catch (error) {
      console.error(`Failed for ${channel.name}`, error);
    }
  }

  const output = {
    type: "youtube",
    version: new Date().toISOString().split("T")[0],
    resources: allResources,
  };

  await fs.mkdir("./output", { recursive: true });

  await fs.writeFile("./output/youtube.json", JSON.stringify(output, null, 2));

  console.log("youtube.json generated");
}

main();
