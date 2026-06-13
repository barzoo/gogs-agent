import { homedir } from "os";
import { join } from "path";
import { mkdirSync, copyFileSync } from "fs";

const source = join(import.meta.dirname, "..", "skill.md");

function copyTo(dir: string, label: string): void {
  mkdirSync(dir, { recursive: true });
  const target = join(dir, "SKILL.md");
  copyFileSync(source, target);
  console.log(`[skill] ${label}: ${target}`);
}

// Project-level (for Claude Code auto-discovery in this repo)
copyTo(join(import.meta.dirname, "..", "skills", "gogs-agent"), "project");

// Global user-level (available in all projects)
copyTo(join(homedir(), ".claude", "skills", "gogs-agent"), "global");
