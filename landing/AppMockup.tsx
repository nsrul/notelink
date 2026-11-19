import {
  ArrowUpNarrowWide,
  ArrowUpRight,
  ChevronRight,
  ChevronsDownUp,
  FileText,
  GripVertical,
  Link as LinkIcon,
  MoreHorizontal,
  PanelLeft,
  Plus,
  Search,
  Settings,
  SquarePen,
  Star,
  Table2,
  Trash2,
  Users,
  Waypoints,
  Check,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

/* This file draws no new components: every class name below is lifted
   straight from Sidebar.tsx, TopBar.tsx, DocumentEditor.tsx, BlockRow.tsx
   and properties.tsx, with mock data standing in for Jazz state. Paired
   with the real stylesheet (imported once, in main.tsx), it renders
   pixel-for-pixel as the actual window would — not a page "inspired by"
   Notes, but Notes's own CSS asked to draw a page that doesn't exist. */

function cssVars(vars: Record<string, string | number>): CSSProperties {
  return vars as CSSProperties;
}

function TreeRow({
  icon,
  label,
  depth,
  branch,
  open,
  selected,
  linked,
}: {
  icon: ReactNode;
  label: string;
  depth: number;
  branch?: boolean;
  open?: boolean;
  selected?: boolean;
  linked?: boolean;
}) {
  return (
    <div className={`tree-row ${selected ? "is-selected" : ""}`} style={cssVars({ "--depth": depth })}>
      <button
        type="button"
        className={`tree-row__mark ${branch ? "is-branch" : ""} ${open ? "is-open" : ""}`}
        aria-label={branch ? (open ? `Collapse ${label}` : `Expand ${label}`) : `Open ${label}`}
        aria-expanded={branch ? open : undefined}
      >
        <span className="tree-row__glyph" aria-hidden="true">{icon}</span>
        {branch ? <ChevronRight className="tree-row__arrow" size={12} aria-hidden="true" /> : null}
      </button>
      <button type="button" className="tree-row__main" aria-current={selected ? "page" : undefined}>
        <span className="tree-row__label">{label}</span>
        {linked ? <LinkIcon className="tree-row__linked" size={11} aria-label="Has backlinks" /> : null}
      </button>
      <span className="tree-row__actions">
        <button type="button" className="icon-btn" aria-label={`Actions for ${label}`}>
          <MoreHorizontal size={14} />
        </button>
        <button type="button" className="icon-btn" aria-label={`New page inside ${label}`}>
          <Plus size={14} />
        </button>
      </span>
    </div>
  );
}

function SidebarMockup() {
  return (
    <aside className="sidebar" aria-label="Pages">
      <div className="sidebar__head">
        <div className="sidebar__views" role="tablist" aria-label="Page list">
          <button type="button" role="tab" aria-selected="true" aria-label="Files" className="sidebar__view is-active">
            <FileText size={16} />
          </button>
          <button type="button" role="tab" aria-selected="false" aria-label="Favorites" className="sidebar__view">
            <Star size={16} />
          </button>
          <button type="button" role="tab" aria-selected="false" aria-label="Shared" className="sidebar__view">
            <Users size={16} />
          </button>
          <button type="button" role="tab" aria-selected="false" aria-label="Graph" className="sidebar__view">
            <Waypoints size={16} />
          </button>
        </div>
        <span className="sidebar__head-gap" />
        <button type="button" className="icon-btn" aria-label="Search">
          <Search size={16} />
        </button>
        <button type="button" className="icon-btn sidebar__collapse" aria-label="Collapse to rail">
          <PanelLeft size={16} />
        </button>
      </div>

      <div className="sidebar__tools" role="toolbar" aria-label="Files">
        <button type="button" className="icon-btn" aria-label="New page">
          <SquarePen size={16} />
        </button>
        <button type="button" className="icon-btn" aria-label="New database">
          <Table2 size={16} />
        </button>
        <button type="button" className="icon-btn" aria-label="Change sort order">
          <ArrowUpNarrowWide size={16} />
        </button>
        <button type="button" className="icon-btn" aria-label="Collapse all">
          <ChevronsDownUp size={16} />
        </button>
      </div>

      <div className="sidebar__scroll scroller" role="tree" aria-label="Files">
        <div className="tree-branch">
          <TreeRow icon="📓" label="Daily Journal" depth={0} />
        </div>
        <div className="tree-branch">
          <TreeRow icon="🚦" label="Project: Lighthouse" depth={0} branch open selected />
          <div className="tree-children" style={cssVars({ "--tree-depth": 0 })}>
            <div className="tree-branch">
              <TreeRow icon="🗒️" label="Meeting Notes" depth={1} linked />
            </div>
            <div className="tree-branch">
              <TreeRow icon="✅" label="Launch Checklist" depth={1} />
            </div>
          </div>
        </div>
        <div className="tree-branch">
          <TreeRow icon="💡" label="Ideas Inbox" depth={0} linked />
        </div>
        <div className="tree-branch">
          <TreeRow icon="🍜" label="Recipes" depth={0} />
        </div>
        <div className="tree-branch">
          <TreeRow icon="✈️" label="Travel: Japan 2026" depth={0} />
        </div>
      </div>

      <footer className="sidebar__foot">
        <span className="sidebar__me" role="img" aria-label="Local notebook — stored in this browser">
          <span className="avatar" style={cssVars({ "--avatar-size": "18px", "--avatar-color": "#4c8b7b" })}>N</span>
        </span>
        <button type="button" className="icon-btn" aria-label="Trash">
          <Trash2 size={16} />
        </button>
        <button type="button" className="icon-btn" aria-label="Settings">
          <Settings size={16} />
        </button>
      </footer>
    </aside>
  );
}

function TopBarMockup() {
  return (
    <header className="topbar">
      <nav className="topbar__crumbs" aria-label="Breadcrumb">
        <span className="crumb__slot">
          <button type="button" className="crumb is-current" aria-current="page">
            <span className="crumb__icon" aria-hidden="true">🚦</span>
            <span className="crumb__label">Project: Lighthouse</span>
          </button>
        </span>
      </nav>
      <div className="topbar__actions">
        <span
          className="save-state save-state--saved"
          role="status"
          aria-live="polite"
          aria-label="All changes saved"
        />
        <div className="avatar-stack" aria-label="1 other person here">
          <span className="avatar avatar--framed" style={cssVars({ "--avatar-size": "20px" })} title="Jess">
            <span className="avatar" style={cssVars({ "--avatar-size": "20px", "--avatar-color": "#a567a9" })}>J</span>
            <span className="avatar__presence" aria-label="Online" />
          </span>
        </div>
        <button type="button" className="icon-btn topbar__star is-on" aria-label="Remove from favorites" aria-pressed="true">
          <Star size={16} fill="currentColor" />
        </button>
        <button type="button" className="icon-btn" aria-label="More page actions" aria-haspopup="menu">
          <MoreHorizontal size={17} />
        </button>
      </div>
    </header>
  );
}

function Block({
  kind,
  children,
  done,
}: {
  kind: string;
  children: ReactNode;
  done?: boolean;
}) {
  return (
    <div
      className={`block block--${kind} ${done ? "is-done" : ""}`}
      style={cssVars({ "--block-depth": 0, "--line-marks": 0, "--frames": 0 })}
    >
      <div className="block__content">
        <button type="button" className="block__add" tabIndex={-1} aria-label="Add below">
          <Plus size={16} />
        </button>
        {children}
        {kind !== "divider" ? (
          <button type="button" className="block__handle" tabIndex={-1} aria-label="Line options" aria-haspopup="menu">
            <GripVertical size={14} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function TodoBlock({ checked, children }: { checked?: boolean; children: ReactNode }) {
  return (
    <Block kind="todo" done={checked}>
      <span className="block__marker">
        <button type="button" className={`checkbox ${checked ? "is-checked" : ""}`} aria-label={checked ? "Mark as not done" : "Mark as done"} aria-pressed={Boolean(checked)}>
          {checked ? <Check size={12} strokeWidth={3} /> : null}
        </button>
      </span>
      <div className="block__editable">{children}</div>
    </Block>
  );
}

function BulletBlock({ children }: { children: ReactNode }) {
  return (
    <Block kind="bullet">
      <span className="block__marker block__marker--bullet" aria-hidden="true">•</span>
      <div className="block__editable">{children}</div>
    </Block>
  );
}

function Tag({ label, tone, status }: { label: string; tone: string; status?: boolean }) {
  return (
    <span className={`tag ${status ? "tag--status" : ""}`} data-tone={tone}>
      <span className="tag__label">{label}</span>
    </span>
  );
}

export function AppMockup() {
  return (
    <div
      className="app-shell"
      style={cssVars({ "--sidebar-w": "216px", "--peek-w": "0px" })}
      aria-label="Notes, open to a page called Project: Lighthouse"
    >
      <SidebarMockup />
      <div className="app-main">
        <TopBarMockup />
        <div className="app-workspace">
          <main className="page-surface scroller">
            <article className="doc">
              <div className="doc__inner">
                <div className="doc__head">
                  <button type="button" className="doc__icon" aria-label="Change page icon">🚦</button>
                  <div className="doc__title">Project: Lighthouse</div>

                  <div className="doc__backlinks">
                    <button type="button" className="doc__backlinks-toggle" aria-expanded="true">
                      <ArrowUpRight size={15} />2 backlinks
                    </button>
                    <ul className="doc__backlinks-list">
                      <li>
                        <button type="button" className="doc__backlink">
                          <span className="doc__backlink-icon">🗒️</span>
                          <span className="doc__backlink-title">Meeting Notes</span>
                        </button>
                      </li>
                      <li>
                        <button type="button" className="doc__backlink">
                          <span className="doc__backlink-icon">💡</span>
                          <span className="doc__backlink-title">Ideas Inbox</span>
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="page-props" aria-label="Properties">
                  <label className="page-props__row" data-type="status">
                    <span className="page-props__name">Status</span>
                    <span className="page-props__value"><Tag label="In progress" tone="yellow" status /></span>
                  </label>
                  <label className="page-props__row" data-type="select">
                    <span className="page-props__name">Priority</span>
                    <span className="page-props__value"><Tag label="High" tone="red" /></span>
                  </label>
                  <label className="page-props__row" data-type="person">
                    <span className="page-props__name">Owner</span>
                    <span className="page-props__value">
                      <span className="db-chip">
                        <span className="avatar" style={cssVars({ "--avatar-size": "16px", "--avatar-color": "#5578be" })}>Y</span>
                        You
                      </span>
                    </span>
                  </label>
                </div>

                <div className="blocks">
                  <Block kind="heading2"><h2 className="block__editable">Goals</h2></Block>
                  <BulletBlock>Ship push notifications for shared boards</BulletBlock>
                  <BulletBlock>Polish every empty state in the editor</BulletBlock>
                  <BulletBlock>Write onboarding copy that doesn't sound like onboarding copy</BulletBlock>

                  <Block kind="heading2"><h2 className="block__editable">Tasks</h2></Block>
                  <TodoBlock checked>Design the empty states</TodoBlock>
                  <TodoBlock checked>Wire up the backlinks panel</TodoBlock>
                  <TodoBlock>Add filters to the graph view</TodoBlock>
                  <TodoBlock>Write the launch post</TodoBlock>

                  <Block kind="callout">
                    <button type="button" className="block__callout-icon" aria-label="Change callout icon">💡</button>
                    <div className="block__editable">Beta ships December 1 — see Launch Checklist for everything left before then.</div>
                  </Block>

                  <Block kind="divider"><hr className="block__rule" /></Block>

                  <Block kind="text"><div className="block__editable">Notes from here stay on this machine. Sync is a choice, not a default.</div></Block>
                </div>

                <div className="doc__pad" aria-hidden="true" />
              </div>
            </article>
          </main>
        </div>
      </div>
    </div>
  );
}
