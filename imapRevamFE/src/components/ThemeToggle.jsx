import { ActionIcon, Tooltip } from "@mantine/core";
import { useMantineColorScheme } from "@mantine/core";
import { Moon, Sun } from "lucide-react";

/**
 * Toggles Mantine color scheme (persisted via localStorageColorSchemeManager).
 * Sun icon = switch to light; Moon icon = switch to dark.
 */
export default function ThemeToggle({ className = "" }) {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Tooltip
      label={isDark ? "Light mode" : "Dark mode"}
      position="bottom"
      withArrow
    >
      <ActionIcon
        type="button"
        variant="default"
        size="lg"
        radius="md"
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        className={`imap-theme-toggle border-[var(--imap-border-strong)] bg-[var(--imap-surface-chip)] text-[var(--imap-text-muted)] transition-colors hover:bg-[var(--imap-surface-glass-hover)] hover:text-[var(--imap-text-bright)] ${className}`}
        onClick={() => toggleColorScheme()}
      >
        {isDark ? (
          <Sun size={18} strokeWidth={2.25} />
        ) : (
          <Moon size={18} strokeWidth={2.25} />
        )}
      </ActionIcon>
    </Tooltip>
  );
}
