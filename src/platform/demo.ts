import { BLOCK_ORDER_STEP, createBlock, pageLine } from "../core/block-tree";
import { MENTION_CHAR } from "../core/inline-content";
import type {
  Block,
  DatabaseConfig,
  DatabaseProperty,
  InlineContent,
  InlineRun,
  NotePage,
  WorkspaceState,
} from "../core/types";
import { DEFAULT_PREFERENCES, emptyWorkspace } from "../core/workspace-state";
import { hasLocalNotes, restoreBackup } from "./backup";
import { blockRecordId } from "./record-ids";
import { PERSONAL, recordValue } from "./records";
import type { StoredRecord } from "./storage";

/* The landing page's mockup is the notebook itself, not a picture of it: the
   app opens here with a page of its own and every control live. It runs in
   this browser, in a database of its own (`useDatabase` in main.tsx), so a
   visitor can type, tick, search and navigate without touching the notebook
   they keep at /app/ — and so this seed never appears in it.

   The pages are one person's notebook, already in use: a project with its
   notes and checklist, a journal, a shelf of books, recipes, a trip. Every
   page has something written on it, and the pages mention each other, so
   backlinks, search and the graph have something to show. */

/** Whether this window is the demo. Read once, from the address the landing
 *  page's frame points at: /app/?demo=1. */
export function isDemoMode(): boolean {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).has("demo");
}

const AUTHOR = "Nayz";
const CREATED = "2026-10-12T09:00:00.000Z";

/* One page of content: the helper names the block, and its order follows the
   order it is written in. */
let order = 0;
const nextOrder = () => (order += BLOCK_ORDER_STEP);

function runs(...parts: Array<string | InlineRun>): InlineContent {
  return parts.map((part) => (typeof part === "string" ? { text: part } : part));
}

const bold = (text: string): InlineRun => ({ text, marks: { bold: true } });
const em = (text: string): InlineRun => ({ text, marks: { italic: true } });
const link = (text: string, href: string): InlineRun => ({ text, marks: { link: href } });
const pageMention = (pageId: string): InlineRun => ({ text: MENTION_CHAR, mention: { kind: "page", page_id: pageId } });
const day = (date: string): InlineRun => ({ text: MENTION_CHAR, mention: { kind: "date", date } });

function block(
  id: string,
  kind: Block["kind"],
  content: InlineContent = [],
  extra: Partial<Omit<Block, "id" | "kind" | "content" | "order">> = {},
): Block {
  return createBlock(id, kind, { ...extra, order: nextOrder(), content });
}

const pageId = (name: string) => `demo-page-${name}`;
const blockId = (page: string, name: string) => `demo-${page}-${name}`;

const PAGES = {
  project: pageId("lighthouse"),
  meeting: pageId("meeting-notes"),
  checklist: pageId("launch-checklist"),
  journal: pageId("daily-journal"),
  ideas: pageId("ideas-inbox"),
  recipes: pageId("recipes"),
  miso: pageId("miso-noodles"),
  travel: pageId("japan"),
  kyoto: pageId("kyoto"),
  reading: pageId("reading-list"),
} as const;

/** The page the landing frame opens on: the journal, whose cover is the
 *  artwork the mockup is set against. */
export const DEMO_OPEN_PAGE = PAGES.journal;

const STATUS_OPTIONS: NonNullable<DatabaseProperty["status_options"]> = [
  { id: "not-started", name: "Not started", color: "default", group: "todo" },
  { id: "in-progress", name: "In progress", color: "blue", group: "progress" },
  { id: "done", name: "Done", color: "green", group: "complete" },
];

function readingList(): DatabaseConfig {
  return {
    title_name: "Book",
    properties: [
      { id: "demo-prop-status", name: "Status", type: "status", status_options: STATUS_OPTIONS, default_status: "not-started" },
      { id: "demo-prop-author", name: "Author", type: "text" },
      { id: "demo-prop-topic", name: "Topic", type: "select", options: ["Design", "Systems", "Fiction", "Essays"] },
      { id: "demo-prop-finished", name: "Finished", type: "date" },
      { id: "demo-prop-who", name: "Who", type: "person" },
    ],
    views: [
      {
        id: "demo-view-table",
        name: "All books",
        kind: "table",
        widths: {
          name: 164,
          "demo-prop-status": 116,
          "demo-prop-author": 128,
          "demo-prop-topic": 92,
          "demo-prop-finished": 124,
          "demo-prop-who": 76,
        },
      },
      { id: "demo-view-board", name: "By status", kind: "board", group_by: "demo-prop-status" },
      {
        id: "demo-view-gallery",
        name: "Shelf",
        kind: "gallery",
        card_preview: "content",
        card_properties: ["demo-prop-status", "demo-prop-author"],
      },
      { id: "demo-view-calendar", name: "Finished", kind: "calendar", date_by: "demo-prop-finished" },
    ],
  };
}

function grid(id: string, headers: string[], body: string[][], widths: number[]): Block {
  const columns = headers.map((_, index) => ({ id: `c${index}`, width: widths[index] }));
  const rows = Object.fromEntries([headers, ...body].map((cells, index) => [`r${index}`, {
    order: (index + 1) * 1024,
    cells: Object.fromEntries(cells.map((text, column) => [`c${column}`, runs(text)])),
  }]));
  return block(id, "table", [], { table: { columns, rows, header_row: true } });
}

function page(
  id: string,
  title: string,
  icon: string,
  parentId: string | null,
  blocks: Block[],
  extra: Partial<NotePage> = {},
): NotePage {
  return {
    id,
    title,
    icon,
    kind: "document",
    parent_id: parentId,
    block_tree: { by_id: Object.fromEntries(blocks.map((item) => [item.id, item])) },
    created_at: CREATED,
    updated_at: CREATED,
    created_by: AUTHOR,
    updated_by: AUTHOR,
    ...extra,
  };
}

/** A blank line at the end, so the page can be written on past the last note. */
function tail(name: string): Block {
  return block(blockId(name, "tail"), "text");
}

function makeWorkspace(): WorkspaceState {
  order = 0;

  const push = blockId("lighthouse", "goal-push");
  const states = blockId("lighthouse", "goal-states");
  const freeze = blockId("checklist", "freeze");

  const project = page(PAGES.project, "Project: Lighthouse", "🚦", null, [
    block(blockId("lighthouse", "callout"), "callout", runs(
      "Beta is ",
      day("2026-12-01"),
      ". What's left is on ",
      pageMention(PAGES.checklist),
      ". This page is the why, not the punch list.",
    ), { icon: "💡" }),
    block(blockId("lighthouse", "why"), "text", runs(
      "Lighthouse is the shared board we've been promising since September: a page people can actually work on together, with notifications that don't shout. Jess is on the empty states. I'm on the copy and the graph.",
    )),
    block(blockId("lighthouse", "goals"), "heading2", runs("Goals")),
    block(push, "bullet", runs("Ship push notifications for shared boards")),
    block(blockId("lighthouse", "goal-push-a"), "bullet", runs("iOS first. Android the week after beta, once we know the copy."), { parent_id: push }),
    block(blockId("lighthouse", "goal-push-b"), "bullet", runs("Quiet hours default to 10pm–7am. A mention can still break through."), { parent_id: push }),
    block(states, "bullet", runs("Polish every empty state in the editor")),
    block(blockId("lighthouse", "goal-states-a"), "bullet", runs("A new page, a new database, search with nothing found, the trash."), { parent_id: states }),
    block(blockId("lighthouse", "goal-states-b"), "bullet", runs("No illustration that explains the product. One sentence, then the cursor."), { parent_id: states }),
    block(blockId("lighthouse", "goal-copy"), "bullet", runs("Write onboarding that doesn't sound like onboarding")),
    block(blockId("lighthouse", "tasks"), "heading2", runs("This week")),
    block(blockId("lighthouse", "task-1"), "todo", runs("Design the empty states"), { checked: true }),
    block(blockId("lighthouse", "task-2"), "todo", runs("Wire up the backlinks panel"), { checked: true }),
    block(blockId("lighthouse", "task-3"), "todo", runs("Add filters to the graph view")),
    block(blockId("lighthouse", "task-4"), "todo", runs("Write the launch post — short, one link, one ask")),
    block(blockId("lighthouse", "task-5"), "todo", runs("Read Norman again before rewriting the empty states. Notes in ", pageMention(PAGES.reading), ".")),
    block(blockId("lighthouse", "pages"), "heading2", runs("Notes")),
    pageLine(blockId("lighthouse", "meeting-line"), PAGES.meeting, { order: nextOrder() }),
    pageLine(blockId("lighthouse", "checklist-line"), PAGES.checklist, { order: nextOrder() }),
    block(blockId("lighthouse", "milestones"), "heading2", runs("Milestones")),
    grid(blockId("lighthouse", "milestone-table"), ["When", "What", "Who"], [
      ["Nov 18", "Weekly sync — invite stays closed", "Nayz"],
      ["Nov 25", "Onboarding copy locked", "Nayz"],
      ["Nov 27", "Empty states in review", "Jess"],
      ["Dec 1", "Beta, 9am", "Both"],
    ], [110, 280, 90]),
    block(blockId("lighthouse", "questions"), "heading2", runs("Open questions")),
    block(blockId("lighthouse", "question-1"), "numbered", runs("How loud should a mention be, against a quiet-hours default?")),
    block(blockId("lighthouse", "question-2"), "numbered", runs("Do graph filters ship in beta, or do they wait with Android?")),
    block(blockId("lighthouse", "question-3"), "numbered", runs("Is the launch post a page here, or does it live somewhere else?")),
    block(blockId("lighthouse", "quote"), "quote", runs("If the page can't explain itself, the copy isn't done.")),
    block(blockId("lighthouse", "payload"), "heading3", runs("Notification payload, as of Thursday")),
    block(blockId("lighthouse", "code"), "code", runs(
      "{\n  \"title\": \"Jess mentioned you\",\n  \"body\": \"in Launch Checklist\",\n  \"quiet\": true\n}",
    ), { language: "json" }),
    block(blockId("lighthouse", "rule"), "divider"),
    block(blockId("lighthouse", "local"), "text", runs(
      "Notes from here stay on this machine. ",
      bold("Sync is a choice"),
      ", not a default — say that in the launch post, and don't soften it.",
    )),
    tail("lighthouse"),
  ], { cover: "tide", updated_at: "2026-11-20T18:40:00.000Z" });

  const meeting = page(PAGES.meeting, "Meeting Notes", "🗒️", PAGES.project, [
    block(blockId("meeting", "nov18"), "heading2", runs("Weekly sync — ", day("2026-11-18"))),
    block(blockId("meeting", "nov18-where"), "text", runs("Kitchen table, forty minutes. Jess had the empty-state sketches on paper. ", pageMention(PAGES.project), " is still on track for December 1.")),
    block(blockId("meeting", "nov18-1"), "bullet", runs("Empty states: three we had missed — new database, no search results, and the trash when it's empty.")),
    block(blockId("meeting", "nov18-2"), "bullet", runs("Backlinks now highlight the mention in the paragraph, not just the page name.")),
    block(blockId("meeting", "nov18-3"), "bullet", runs("Graph filters are the thing most likely to slip. Decide by ", day("2026-11-25"), ".")),
    block(blockId("meeting", "decisions"), "heading3", runs("Decided")),
    block(blockId("meeting", "decision-1"), "todo", runs("Keep the beta invite-only"), { checked: true }),
    block(blockId("meeting", "decision-2"), "todo", runs("No launch video. The page is the demo."), { checked: true }),
    block(blockId("meeting", "decision-3"), "todo", runs("Lock the onboarding copy by November 25")),
    block(blockId("meeting", "next"), "heading3", runs("Next")),
    block(blockId("meeting", "next-1"), "bullet", runs("Jess brings the revised empty states Thursday.")),
    block(blockId("meeting", "next-2"), "bullet", runs("I write the launch post and put the remaining boxes on ", pageMention(PAGES.checklist), ".")),
    block(blockId("meeting", "rule"), "divider"),
    block(blockId("meeting", "nov11"), "heading2", runs("Weekly sync — ", day("2026-11-11"))),
    block(blockId("meeting", "nov11-1"), "text", runs("Short one. Agreed the notification sound is a tap, not a chime, and that ", pageMention(PAGES.ideas), " stays a private list — nothing from it ships without being copied onto the project.")),
    block(blockId("meeting", "nov11-2"), "bullet", runs("Jess is reading ", pageMention(pageId("row-everyday")), " for the mapping chapter. I'm halfway through Meadows.")),
    block(blockId("meeting", "nov11-3"), "quote", runs("Don't add a setting for it until two people have asked.")),
    tail("meeting"),
  ], { updated_at: "2026-11-18T16:10:00.000Z" });

  const checklist = page(PAGES.checklist, "Launch Checklist", "✅", PAGES.project, [
    block(blockId("checklist", "intro"), "text", runs(
      "Everything between here and ",
      day("2026-12-01"),
      ". The reasoning lives on ",
      pageMention(PAGES.project),
      ".",
    )),
    block(blockId("checklist", "two-weeks"), "heading2", runs("Before the week of launch")),
    block(freeze, "todo", runs("Freeze the feature list"), { checked: true }),
    block(blockId("checklist", "freeze-a"), "todo", runs("Push notifications stay in"), { checked: true, parent_id: freeze }),
    block(blockId("checklist", "freeze-b"), "todo", runs("Graph filters can slip to the week after"), { checked: true, parent_id: freeze }),
    block(blockId("checklist", "freeze-c"), "todo", runs("No new database views in beta"), { checked: true, parent_id: freeze }),
    block(blockId("checklist", "item-2"), "todo", runs("Ship the empty states"), { checked: true }),
    block(blockId("checklist", "item-3"), "todo", runs("Record the onboarding walkthrough — one take, no music")),
    block(blockId("checklist", "item-4"), "todo", runs("Schedule the launch post for 9:15, after the flag")),
    block(blockId("checklist", "item-5"), "todo", runs("Brief support on what beta does ", em("not"), " include")),
    block(blockId("checklist", "launch-day"), "heading2", runs("Launch day")),
    block(blockId("checklist", "day-1"), "todo", runs("Flip the flag at 9:00")),
    block(blockId("checklist", "day-2"), "todo", runs("Watch errors for the first hour. Phone face-up.")),
    block(blockId("checklist", "day-3"), "todo", runs("Post in #lighthouse, then close the laptop")),
    block(blockId("checklist", "day-4"), "todo", runs("Write down what broke, on this page, before fixing it")),
    block(blockId("checklist", "note"), "callout", runs(
      "The launch post is one idea: your notes stay here until you decide otherwise. Link the project page. Don't attach a changelog.",
    ), { icon: "📣" }),
    tail("checklist"),
  ], { updated_at: "2026-11-19T11:05:00.000Z" });

  const journal = page(PAGES.journal, "Daily Journal", "📓", null, [
    block(blockId("journal", "today"), "heading2", runs("Saturday, ", day("2026-11-21"))),
    block(blockId("journal", "today-1"), "text", runs(
      "A quiet morning. Spent the first hour rereading last week's notes instead of writing new ones. The lighthouse page is clearer for it — I had buried the point under the task list.",
    )),
    block(blockId("journal", "today-2"), "todo", runs("Reread ", pageMention(PAGES.checklist), " and strike anything that isn't a real task"), { checked: true }),
    block(blockId("journal", "today-3"), "todo", runs("Walk before opening the laptop")),
    block(blockId("journal", "today-4"), "todo", runs("Start the launch post, even if it's three bad sentences")),
    block(blockId("journal", "quote"), "quote", runs("Slow is smooth, smooth is fast.")),
    block(blockId("journal", "yesterday"), "heading2", runs("Friday, ", day("2026-11-20"))),
    block(blockId("journal", "yesterday-1"), "bullet", runs("Paired with Jess on the empty states. She found three we'd missed, which is the same three from ", pageMention(PAGES.meeting), ". I hadn't written them down anywhere but the meeting.")),
    block(blockId("journal", "yesterday-2"), "bullet", runs("Deleted the old settings page. Nothing linked to it, and the graph made that obvious.")),
    block(blockId("journal", "yesterday-3"), "text", runs("Tomorrow is for the graph filters, or for admitting they wait. Not both.")),
    block(blockId("journal", "earlier"), "heading2", runs("Monday, ", day("2026-11-16"))),
    block(blockId("journal", "earlier-1"), "text", runs(
      "Started ",
      em("Thinking in Systems"),
      " on the tram. Meadows on leverage points is the argument for fixing the empty states before adding another feature. Notes are on ",
      pageMention(PAGES.reading),
      ".",
    )),
    block(blockId("journal", "earlier-2"), "bullet", runs("Cooked the miso noodles again. The butter goes in off the heat — wrote it properly on ", pageMention(PAGES.miso), " so I stop guessing.")),
    tail("journal"),
  ], { cover: "grove", font: "serif", updated_at: "2026-11-21T07:40:00.000Z" });

  const ideas = page(PAGES.ideas, "Ideas Inbox", "💡", null, [
    block(blockId("ideas", "intro"), "text", runs(
      "Things that might become pages. Nothing here is a promise — ",
      pageMention(PAGES.meeting),
      " says this list stays private until something is copied onto ",
      pageMention(PAGES.project),
      ".",
    )),
    block(blockId("ideas", "idea-1"), "bullet", runs("A reading list that sorts itself by mood, not by status. The shelf view on ", pageMention(PAGES.reading), " is close, but mood isn't a column yet.")),
    block(blockId("ideas", "idea-2"), "bullet", runs("A weekly review template: what moved, what I avoided, one page to delete.")),
    block(blockId("ideas", "idea-3"), "bullet", runs("Graph filters that can pin one project and fade the rest. This is the one that might actually ship.")),
    block(blockId("ideas", "idea-4"), "bullet", runs("Could ", pageMention(PAGES.project), " carry a small graph of just its own pages? Probably a view, not a new feature.")),
    block(blockId("ideas", "idea-5"), "bullet", runs("A kitchen page that isn't only ", pageMention(PAGES.recipes), " — what we have in, what we owe a guest.")),
    block(blockId("ideas", "someday"), "heading2", runs("Someday")),
    block(blockId("ideas", "someday-1"), "todo", runs("Try a paper notebook for a week and type up only what I still care about")),
    block(blockId("ideas", "someday-2"), "todo", runs("Write the post about notes that stay on the machine")),
    block(blockId("ideas", "someday-3"), "todo", runs("Learn enough Japanese to read a menu before ", pageMention(PAGES.travel))),
    block(blockId("ideas", "not"), "heading2", runs("Not this")),
    block(blockId("ideas", "not-1"), "text", runs(
      "A public changelog. A points system. A second sidebar. I wrote them down so I'd stop bringing them up in the sync.",
    )),
    tail("ideas"),
  ], { updated_at: "2026-11-17T21:12:00.000Z" });

  const miso = page(PAGES.miso, "Miso butter noodles", "🍝", PAGES.recipes, [
    block(blockId("miso", "meta"), "text", runs("Fifteen minutes, one pan. Weeknight, not a project. Serves one, very generously.")),
    block(blockId("miso", "ingredients"), "heading2", runs("Ingredients")),
    block(blockId("miso", "ing-1"), "bullet", runs("100g noodles — ramen, or whatever is open")),
    block(blockId("miso", "ing-2"), "bullet", runs("1 tbsp white miso")),
    block(blockId("miso", "ing-3"), "bullet", runs("1 tbsp butter, cold, in cubes")),
    block(blockId("miso", "ing-4"), "bullet", runs("A splash of the noodle water")),
    block(blockId("miso", "ing-5"), "bullet", runs("Scallion, sesame, an egg if the day needs one")),
    block(blockId("miso", "method"), "heading2", runs("Method")),
    block(blockId("miso", "step-1"), "numbered", runs("Boil the noodles in water salted like the sea. Steal a ladle of the water before you drain.")),
    block(blockId("miso", "step-2"), "numbered", runs("Off the heat, stir the miso into the butter until it looks like a paste, not a sauce.")),
    block(blockId("miso", "step-3"), "numbered", runs("Toss the noodles through it with the reserved water, a spoon at a time, until it glosses.")),
    block(blockId("miso", "step-4"), "numbered", runs("Scallion on top. Sesame. Eat it from the pan.")),
    block(blockId("miso", "note"), "callout", runs("The butter goes in off the heat. On the heat the miso goes grainy and the whole thing tastes like a mistake."), { icon: "🧂" }),
    block(blockId("miso", "aside"), "text", runs("Good with the cold cucumbers on ", pageMention(PAGES.recipes), ". Not good as leftovers.")),
    tail("miso"),
  ], { updated_at: "2026-11-12T19:30:00.000Z" });

  const recipes = page(PAGES.recipes, "Recipes", "🍜", null, [
    block(blockId("recipes", "intro"), "text", runs("What I actually cook. If it isn't here, I looked it up and forgot it, which is how the miso noodles got their own page.")),
    block(blockId("recipes", "midweek"), "heading2", runs("Midweek")),
    pageLine(blockId("recipes", "miso-line"), PAGES.miso, { order: nextOrder() }),
    block(blockId("recipes", "mid-2"), "bullet", runs("Cold sesame cucumbers — smash, salt, wait, sesame oil, not much else")),
    block(blockId("recipes", "mid-3"), "bullet", runs("Rice, egg, scallion, whatever is left in the fridge. Soy at the end, not the start.")),
    block(blockId("recipes", "salt"), "callout", runs("Salt the water like you mean it. Pasta water should taste like the sea, not like a suggestion."), { icon: "🧂" }),
    block(blockId("recipes", "weekend"), "heading2", runs("Weekend")),
    block(blockId("recipes", "week-1"), "bullet", runs("Braised short ribs. Start Saturday morning if you want them Saturday night.")),
    block(blockId("recipes", "week-2"), "bullet", runs("Sourdough, attempt four. The last one was edible and ugly. This one can just be edible.")),
    block(blockId("recipes", "japan"), "text", runs(
      "In Osaka, on the last day of ",
      pageMention(PAGES.travel),
      ", buy the knife. Don't buy one before then and carry it for a week.",
    )),
    tail("recipes"),
  ], { cover: "moss", updated_at: "2026-11-12T19:20:00.000Z" });

  const kyoto = page(PAGES.kyoto, "Kyoto", "⛩️", PAGES.travel, [
    block(blockId("kyoto", "intro"), "text", runs("Three nights, after Kanazawa, before Osaka. The point is to walk, not to collect temples.")),
    block(blockId("kyoto", "days"), "heading2", runs("Days")),
    block(blockId("kyoto", "day-1"), "heading3", runs("Arrival")),
    block(blockId("kyoto", "day-1a"), "text", runs("Train in before noon. Drop bags. Philosopher's Path in the afternoon if it isn't raining, Nishiki if it is. Dinner somewhere that takes one person without a fuss.")),
    block(blockId("kyoto", "day-2"), "heading3", runs("Arashiyama, early")),
    block(blockId("kyoto", "day-2a"), "text", runs("Out the door by 7. The bamboo is a corridor, not a destination — walk through it and keep going to the river. Back in the city for coffee and doing nothing.")),
    block(blockId("kyoto", "day-3"), "heading3", runs("Fushimi, then leave")),
    block(blockId("kyoto", "day-3a"), "text", runs("Gates at opening. Then the station. Don't add a fourth sight.")),
    block(blockId("kyoto", "stay"), "heading2", runs("Stay")),
    block(blockId("kyoto", "stay-1"), "bullet", runs("One room, tatami, near the river if the price is kind")),
    block(blockId("kyoto", "stay-2"), "todo", runs("Book it — this is the night that will sell out"), { checked: false }),
    block(blockId("kyoto", "note"), "quote", runs("Leave one morning with nowhere to be.")),
    tail("kyoto"),
  ], { updated_at: "2026-11-08T14:40:00.000Z" });

  const travel = page(PAGES.travel, "Travel: Japan 2026", "✈️", null, [
    block(blockId("japan", "when"), "text", runs(
      "Two weeks in April. Flights are booked. The middle is not. Days on ",
      pageMention(PAGES.kyoto),
      " are the part I keep rewriting.",
    )),
    block(blockId("japan", "route"), "heading2", runs("Route")),
    block(blockId("japan", "stop-1"), "numbered", runs("Tokyo — 4 nights. Walk more than you ride.")),
    block(blockId("japan", "stop-2"), "numbered", runs("Kanazawa — 2 nights. The garden, then the market, then stop.")),
    block(blockId("japan", "stop-3"), "numbered", runs("Kyoto — 3 nights. See ", pageMention(PAGES.kyoto), ".")),
    block(blockId("japan", "stop-4"), "numbered", runs("Osaka — 2 nights. Eat. Buy the knife on the last morning — noted on ", pageMention(PAGES.recipes), ".")),
    block(blockId("japan", "booked"), "heading2", runs("Booked")),
    block(blockId("japan", "booked-1"), "todo", runs("Flights"), { checked: true }),
    block(blockId("japan", "booked-2"), "todo", runs("Tokyo hotel, near the station, nothing charming"), { checked: true }),
    block(blockId("japan", "booked-3"), "todo", runs("Rail pass — decide 7-day or 14-day once the Kanazawa trains are clear")),
    block(blockId("japan", "booked-4"), "todo", runs("Kanazawa ryokan")),
    block(blockId("japan", "booked-5"), "todo", runs("Kyoto room")),
    block(blockId("japan", "budget"), "heading2", runs("Rough budget")),
    grid(blockId("japan", "budget-table"), ["Item", "Yen", "Notes"], [
      ["Flights", "paid", "Done in October"],
      ["Hotels", "180,000", "Tokyo is half of this"],
      ["Rail", "50,000", "Pass, if the maths works"],
      ["Food", "70,000", "One good dinner, the rest is counters"],
    ], [120, 110, 240]),
    block(blockId("japan", "note"), "callout", runs("Pack light. One bag that fits the overhead bin, or the rail days are miserable."), { icon: "🧳" }),
    block(blockId("japan", "link"), "text", runs("Official pages, so I stop trusting blogs: ", link("japan.travel", "https://www.japan.travel/en/"), ".")),
    tail("japan"),
  ], { cover: "clay", updated_at: "2026-11-08T14:00:00.000Z" });

  const reading = page(PAGES.reading, "Reading List", "📚", null, [], {
    kind: "database",
    database: readingList(),
    full_width: true,
    updated_at: "2026-11-15T09:00:00.000Z",
  });

  const rows: Array<[string, string, Record<string, string>, string, Block[]]> = [
    ["systems", "Thinking in Systems", {
      "demo-prop-status": "In progress",
      "demo-prop-author": "Donella Meadows",
      "demo-prop-topic": "Systems",
      "demo-prop-who": "Nayz",
    }, "2026-11-16T08:00:00.000Z", [
      block(blockId("row-systems", "line"), "text", runs(
        "The book I keep coming back to while writing ",
        pageMention(PAGES.project),
        ". Stocks and flows is the easy part. The leverage-points chapter is the whole argument for fixing the empty states before adding another feature.",
      )),
      block(blockId("row-systems", "keep"), "bullet", runs("A system traps you into behaving how you don't want to. The fix is usually the information, not a new part.")),
      block(blockId("row-systems", "keep-2"), "bullet", runs("Delays make people overcorrect. That's the notification sound, if we get it wrong.")),
      block(blockId("row-systems", "where"), "text", runs("Halfway. The tram, mostly. Finish before the launch post, or the post will be slogans.")),
    ]],
    ["timeless", "The Timeless Way of Building", {
      "demo-prop-status": "In progress",
      "demo-prop-author": "Christopher Alexander",
      "demo-prop-topic": "Systems",
      "demo-prop-who": "Nayz",
    }, "2026-11-02T08:00:00.000Z", [
      block(blockId("row-timeless", "line"), "text", runs("Slow. I'm reading it beside ", pageMention(pageId("row-pattern")), ", which is the wrong way — this one is the feeling, that one is the catalogue.")),
      block(blockId("row-timeless", "note"), "text", runs("The quality without a name is what I want the empty states to have, and I don't know how to write that down without sounding soft. So: one sentence, then the cursor.")),
    ]],
    ["buildings", "How Buildings Learn", {
      "demo-prop-status": "In progress",
      "demo-prop-author": "Stewart Brand",
      "demo-prop-topic": "Systems",
      "demo-prop-who": "Jess",
    }, "2026-10-28T08:00:00.000Z", [
      block(blockId("row-buildings", "line"), "text", runs("Jess's copy. She says the shearing layers are how we should talk about the editor: the page stays, the features move.")),
      block(blockId("row-buildings", "note"), "bullet", runs("Site, structure, skin, services, space plan, stuff. Stuff changes fastest. Our stuff is the copy.")),
      block(blockId("row-buildings", "back"), "text", runs("Give it back before April. It does not come to ", pageMention(PAGES.travel), ".")),
    ]],
    ["everyday", "The Design of Everyday Things", {
      "demo-prop-status": "Done",
      "demo-prop-author": "Don Norman",
      "demo-prop-topic": "Design",
      "demo-prop-finished": "2026-09-14",
      "demo-prop-who": "Nayz",
    }, "2026-09-01T08:00:00.000Z", [
      block(blockId("row-everyday", "line"), "text", runs("Finished in September. The mapping chapter is why the sidebar's icons have to mean the thing they do, not just decorate it.")),
      block(blockId("row-everyday", "keep"), "bullet", runs("Affordances, signifiers, mapping, feedback. If a control needs a label and a tooltip, the mapping is wrong.")),
      block(blockId("row-everyday", "use"), "text", runs("Reread the chapter on errors before rewriting the empty states for ", pageMention(PAGES.project), ".")),
    ]],
    ["piranesi", "Piranesi", {
      "demo-prop-status": "Done",
      "demo-prop-author": "Susanna Clarke",
      "demo-prop-topic": "Fiction",
      "demo-prop-finished": "2026-08-03",
      "demo-prop-who": "Jess",
    }, "2026-07-20T08:00:00.000Z", [
      block(blockId("row-piranesi", "line"), "text", runs("Jess lent this. Three nights, and I'm still not sure I could explain the House. That's the point.")),
      block(blockId("row-piranesi", "note"), "text", runs("A world that is only itself, described by someone who loves it. Closer to what a notebook should feel like than any product book on this shelf.")),
      block(blockId("row-piranesi", "back"), "todo", runs("Return it"), { checked: true }),
    ]],
    ["sentences", "Several Short Sentences About Writing", {
      "demo-prop-status": "Done",
      "demo-prop-author": "Verlyn Klinkenborg",
      "demo-prop-topic": "Essays",
      "demo-prop-finished": "2026-11-04",
      "demo-prop-who": "Nayz",
    }, "2026-10-10T08:00:00.000Z", [
      block(blockId("row-sentences", "line"), "text", runs("Read it for the launch post and stayed for the sentences. Short ones. Then a longer one, once, to see if it earns it.")),
      block(blockId("row-sentences", "keep"), "quote", runs("You can say smart, interesting things using short sentences.")),
      block(blockId("row-sentences", "use"), "text", runs("The onboarding copy should survive being read out loud. If I stumble, it's wrong.")),
    ]],
    ["pattern", "A Pattern Language", {
      "demo-prop-status": "Not started",
      "demo-prop-author": "Christopher Alexander",
      "demo-prop-topic": "Design",
      "demo-prop-who": "Nayz",
    }, "2026-11-09T08:00:00.000Z", [
      block(blockId("row-pattern", "line"), "text", runs("On the desk, unopened, under ", pageMention(pageId("row-timeless")), ". Start it after Meadows, not before — otherwise I'll collect patterns and never finish a chapter.")),
      block(blockId("row-pattern", "why"), "text", runs("I want it for the way a pattern names a problem you already have. Useful for empty states. Dangerous as a shopping list.")),
    ]],
    ["mountain", "The Living Mountain", {
      "demo-prop-status": "Not started",
      "demo-prop-author": "Nan Shepherd",
      "demo-prop-topic": "Essays",
      "demo-prop-who": "Nayz",
    }, "2026-11-15T08:00:00.000Z", [
      block(blockId("row-mountain", "line"), "text", runs("Next, after the launch, as a reward for not reading it during the launch. The Cairngorms, looked at rather than conquered.")),
      block(blockId("row-mountain", "note"), "text", runs("Jess says it's the one book on this shelf that isn't trying to teach me a system. Good.")),
    ]],
  ];

  const rowPages = rows.map(([name, title, properties, createdAt, blocks], index) => page(
    pageId(`row-${name}`),
    title,
    "",
    PAGES.reading,
    [...blocks, tail(`row-${name}`)],
    { properties, created_at: createdAt, updated_at: createdAt, row_order: (index + 1) * 1000 },
  ));

  const pages = [project, meeting, checklist, journal, ideas, recipes, miso, travel, kyoto, reading, ...rowPages];

  return {
    ...emptyWorkspace(),
    pages: Object.fromEntries(pages.map((item) => [item.id, item])),
    roots: [PAGES.journal, PAGES.project, PAGES.ideas, PAGES.reading, PAGES.recipes, PAGES.travel],
    preferences: {
      ...DEFAULT_PREFERENCES,
      favorites: [PAGES.project, PAGES.journal, PAGES.reading, PAGES.travel],
      database_views: { [PAGES.reading]: "demo-view-table" },
    },
  };
}

/** Fills the demo's own notebook the first time this browser opens it. Any
 *  change a visitor makes after that is kept, so the demo is a notebook they
 *  can actually use rather than a page that resets under their hands. */
export async function seedDemoWorkspace(): Promise<void> {
  if (await hasLocalNotes()) return;
  const state = makeWorkspace();
  const records: StoredRecord[] = [];

  for (const item of Object.values(state.pages)) {
    const value = recordValue(state, { collection: "pages", id: item.id });
    if (value) records.push({ scope: PERSONAL, collection: "pages", id: item.id, value });
    for (const blockIdValue of Object.keys(item.block_tree.by_id)) {
      const blockValue = recordValue(state, { collection: "blocks", id: blockRecordId(item.id, blockIdValue) });
      if (blockValue) {
        records.push({ scope: PERSONAL, collection: "blocks", id: blockRecordId(item.id, blockIdValue), value: blockValue });
      }
    }
  }

  const preferences = recordValue(state, { collection: "workspace_settings", id: "preferences" });
  if (preferences) records.push({ scope: PERSONAL, collection: "workspace_settings", id: "preferences", value: preferences });
  const roots = recordValue(state, { collection: "workspace_settings", id: "roots" });
  if (roots) records.push({ scope: PERSONAL, collection: "workspace_settings", id: "roots", value: roots });

  await restoreBackup({ format: "open-notes", version: 1, createdAt: new Date().toISOString(), records, files: [] });
}
