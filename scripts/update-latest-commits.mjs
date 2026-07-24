import { readFile, writeFile } from "node:fs/promises";

const username = process.env.GITHUB_REPOSITORY_OWNER ?? "andriawan24";
const token = process.env.GITHUB_TOKEN;
const readmePath = new URL("../README.md", import.meta.url);
const startMarker = "<!-- LATEST-COMMITS:START -->";
const endMarker = "<!-- LATEST-COMMITS:END -->";

if (!token) {
  throw new Error("GITHUB_TOKEN is required");
}

const params = new URLSearchParams({
  q: `author:${username}`,
  sort: "committer-date",
  order: "desc",
  per_page: "5",
});

const response = await fetch(`https://api.github.com/search/commits?${params}`, {
  headers: {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": `${username}-profile-readme`,
  },
});

if (!response.ok) {
  throw new Error(`GitHub API returned ${response.status}: ${await response.text()}`);
}

const { items = [] } = await response.json();

if (items.length === 0) {
  throw new Error(`No public commits found for ${username}`);
}

const escapeMarkdown = (value) =>
  value
    .replaceAll("\\", "\\\\")
    .replaceAll("[", "\\[")
    .replaceAll("]", "\\]")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const lines = items.map((item) => {
  const shortSha = item.sha.slice(0, 7);
  const repo = item.repository.full_name;
  const message = item.commit.message.split("\n", 1)[0].trim();
  const date = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(new Date(item.commit.committer.date));

  return `- [\`${shortSha}\`](${item.html_url}) ${escapeMarkdown(message)} — [\`${repo}\`](${item.repository.html_url}) <sub>${date}</sub>`;
});

const readme = await readFile(readmePath, "utf8");
const start = readme.indexOf(startMarker);
const end = readme.indexOf(endMarker);

if (start === -1 || end === -1 || end < start) {
  throw new Error("Latest-commit markers are missing or out of order in README.md");
}

const replacement = `${startMarker}\n${lines.join("\n")}\n${endMarker}`;
const updatedReadme =
  readme.slice(0, start) + replacement + readme.slice(end + endMarker.length);

await writeFile(readmePath, updatedReadme);
