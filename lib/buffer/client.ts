// Buffer GraphQL API client (api.buffer.com/graphql).
// Auth: Bearer token (OIDC token from Buffer's "Apps" page).
//
// What this token gives us:
//   ✓ List of sent posts (text, sent date, channel, URL)
//   ✓ Channel list
//   ✗ Engagement metrics (Buffer Analyze plan required, not exposed here)

const ENDPOINT = "https://api.buffer.com/graphql";

export const BUFFER_TOKEN = process.env.BUFFER_TOKEN;
export const isBufferConfigured = () => !!BUFFER_TOKEN;

type GqlResponse<T> = { data?: T; errors?: { message: string }[] };

async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  if (!BUFFER_TOKEN) throw new Error("BUFFER_TOKEN not set");
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${BUFFER_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = (await res.json()) as GqlResponse<T>;
  if (json.errors) throw new Error(`Buffer: ${json.errors.map((e) => e.message).join("; ")}`);
  if (!json.data) throw new Error("Buffer: empty response");
  return json.data;
}

export async function getCurrentOrgId(): Promise<string> {
  const data = await gql<{ account: { currentOrganization: { id: string } } }>(
    `{ account { currentOrganization { id } } }`
  );
  return data.account.currentOrganization.id;
}

export type BufferChannel = {
  id: string;
  name: string;
  service: string;
  serviceId: string;
};

export async function listChannels(): Promise<BufferChannel[]> {
  const data = await gql<{ account: { channels: BufferChannel[] } }>(
    `{ account { channels { id name service serviceId } } }`
  );
  return data.account.channels;
}

export type BufferPost = {
  id: string;
  text: string;
  channelService: string;
  channelId: string;
  sentAt: string | null;
  dueAt: string | null;
  externalLink: string | null;
  status: string;
};

// Create a draft post in Buffer's queue. Uses customScheduled mode + the given dueAt
// so the post sits in Buffer until that time. User can edit/cancel/approve in Buffer's UI.
// Returns the created post id so we can track which content_items have been pushed.
export async function createDraftPost(opts: {
  channelId: string;
  text: string;
  dueAt: Date;
}): Promise<string> {
  const data = await gql<{ createPost: { id: string } }>(
    `mutation CreatePost($input: CreatePostInput!) {
       createPost(input: $input) { id }
     }`,
    {
      input: {
        channelId: opts.channelId,
        text: opts.text,
        dueAt: opts.dueAt.toISOString(),
        mode: "customScheduled",
        schedulingType: "automatic",
        assets: [],
      },
    }
  );
  return data.createPost.id;
}

// Pull "sent" posts with pagination. Buffer paginates with cursor-based first/after.
export async function* listSentPosts(
  organizationId: string,
  opts: { pageSize?: number; maxPages?: number } = {}
): AsyncGenerator<BufferPost> {
  const pageSize = opts.pageSize ?? 50;
  const maxPages = opts.maxPages ?? 20;
  let after: string | null = null;
  let pages = 0;

  while (pages < maxPages) {
    const data: any = await gql(
      `query SentPosts($input: PostsInput!, $first: Int!, $after: String) {
        posts(input: $input, first: $first, after: $after) {
          edges {
            cursor
            node {
              id text channelService channelId sentAt dueAt externalLink status
            }
          }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      {
        input: { organizationId, filter: { status: ["sent"] } },
        first: pageSize,
        after,
      }
    );
    const edges = data.posts.edges as { cursor: string; node: BufferPost }[];
    for (const e of edges) yield e.node;

    if (!data.posts.pageInfo.hasNextPage) break;
    after = data.posts.pageInfo.endCursor;
    pages++;
  }
}
