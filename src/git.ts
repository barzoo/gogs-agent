import { execSync } from "child_process";

/**
 * Try to infer owner/repo from the local git remote.
 * Returns undefined when not in a git repo, no origin remote,
 * or the remote doesn't match the configured Gogs base URL.
 */
export function detectRepoFromGit(
  baseUrl: string
): string | undefined {
  try {
    const url = execSync("git remote get-url origin", {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    if (!url) return undefined;

    // Parse `owner/repo` from common remote URL formats:
    //   https://git.example.com/owner/repo.git
    //   https://git.example.com/owner/repo
    //   git@git.example.com:owner/repo.git
    //   ssh://git@git.example.com/owner/repo.git

    let path: string;
    if (url.startsWith("git@")) {
      // git@host:owner/repo.git
      const colon = url.lastIndexOf(":");
      if (colon === -1) return undefined;
      path = url.slice(colon + 1);
    } else {
      // https://host/owner/repo.git or ssh://git@host/owner/repo.git
      const proto = url.indexOf("://");
      if (proto === -1) return undefined;
      const afterProto = url.slice(proto + 3);
      const slash = afterProto.indexOf("/");
      if (slash === -1) return undefined;
      path = afterProto.slice(slash + 1);
    }

    // Strip trailing .git
    path = path.replace(/\.git$/, "");

    // Strip leading slash if present
    path = path.replace(/^\/+/, "");

    // Validate it looks like owner/repo
    const parts = path.split("/");
    if (parts.length !== 2) return undefined;
    if (!parts[0] || !parts[1]) return undefined;

    // Cross-check: the remote host should match the configured base URL.
    // If they differ (e.g., git remote is GitHub but GOGS_BASE_URL is Gogs),
    // don't trust the auto-detection.
    const remoteHost = extractHost(url);
    const configHost = extractHost(baseUrl);
    if (remoteHost && configHost && remoteHost !== configHost) {
      return undefined;
    }

    return path;
  } catch {
    // Not in a git repo, no origin remote, or git not installed
    return undefined;
  }
}

function extractHost(url: string): string | undefined {
  try {
    if (url.startsWith("git@")) {
      // git@git.example.com:owner/repo.git
      // git@git.example.com:22:owner/repo.git (unlikely but possible for non-standard ssh)
      const at = url.indexOf("@");
      const colon = url.lastIndexOf(":");
      if (at === -1 || colon === -1) return undefined;
      const hostPort = url.slice(at + 1, colon);
      // Strip port if present (another colon in host:port)
      const portSep = hostPort.lastIndexOf(":");
      if (portSep !== -1) return hostPort.slice(0, portSep);
      return hostPort;
    }
    // https://git.example.com/api/v1/repos/...
    const proto = url.indexOf("://");
    if (proto === -1) return undefined;
    const afterProto = url.slice(proto + 3);
    const slash = afterProto.indexOf("/");
    if (slash === -1) return afterProto; // no path, just host
    let host = afterProto.slice(0, slash);
    // Strip port
    const portSep = host.lastIndexOf(":");
    if (portSep !== -1) host = host.slice(0, portSep);
    return host;
  } catch {
    return undefined;
  }
}
