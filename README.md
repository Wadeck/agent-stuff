# Claude Code - Custom Skills & Hooks

This repository contains examples for Claude Code that enhance its functionality with additional safety controls and automation capabilities.
Warning: I tried to extract the most useful parts without having to depend on lot of other systems I am using, to keep it clean and simple.

## Configuration

### settings.json
The `.claude/settings.json` file configures Claude's hooks.

### settings.local.json
The `.claude/settings.local.json` file configures Claude's allowed tools.
There are just examples of commands we can usually allow Claude to run safely in non-YOLO mode.
By default Bash required permission.
There is also an example about how to allow the execution of a particular script (from a skill in this case).

## Skills

### **get-timestamp**
Provides a way to get the current time as a timestamp.

This is an example demonstrating how to manage permissions for Claude in non-YOLO mode while still allowing script execution.
Note that Claude typically (though not guaranteed 100%) does not modify scripts in `.claude` without being explicitly requested to do so.

## Hooks

Hooks in this example repository are written in Nodejs, but it's really just the idea/pattern that is interesting, you can write in any language.

### PreToolUse Hooks

These hooks run before Claude executes specific tools, allowing you to validate, block, or modify operations.

#### **PreBashLinuxCommands.js**
**Trigger**: Before `Bash` tool usage
**Purpose**: Prevent incompatible Linux commands on Windows

Blocks Linux-specific commands that don't work natively on Windows and suggests appropriate Windows/PowerShell alternatives.
Detects and prevents:
- Linux utilities: `grep`, `sed`, `awk`, `touch`, `which`, `chmod`, `man`, etc.
- Linux-specific command options (e.g., `ls` with Linux flags)
- Unix-style paths (`/home/user/...` instead of `C:\Users\...`)
- Linux command pipelines that won't work on Windows

**Example**: When Claude tries to use `grep pattern file.txt`, it will be blocked with a suggestion to use `findstr` (CMD) or `Select-String` (PowerShell) instead.

**Benefits**:
- Prevents command execution failures on Windows
- Educates about Windows equivalents
- Smoother cross-platform experience
- Usually it's not necessary but that's a way to reduce a bit the back and forth for Claude when working on Windows

#### **PreBashCdOutsideWorkspace.js**
**Trigger**: Before `Bash` tool usage with `cd` command
**Purpose**: Prevent navigation outside the project workspace

Detects `cd` commands that would navigate outside the current project directory and requests user confirmation before allowing them. Protects against:
- Navigation to parent directories outside the workspace
- Absolute path navigation to other locations
- Home directory navigation (`cd ~`)

**Benefits**:
- Prevents accidental operations on files outside your project
- Maintains security boundaries
- Gives you control over workspace scope

#### **PreBashKillPort.js**
**Trigger**: Before `Bash` tool usage
**Purpose**: Prevent the agent from killing processes

Attempts to prevent Claude from inadvertently terminating running processes or services, which could disrupt your development environment or running applications.

### Stop Hooks

#### **Stop.js**
**Trigger**: When a Claude session completes
**Purpose**: Post-session automation

Executes custom automation after a Claude session ends. This hook receives the `sessionId` which can be used to resume the session later if needed.

**Use cases**:
- Run linters or formatters after code changes
- Execute test suites automatically
- Send notifications (Slack, email, etc.) about session completion
- Generate session reports or summaries
- Clean up temporary files

**Note**: Sometimes Claude stops mid-plan to ask if you want to continue or test the current state. In these cases, simply sending "continue" will let the agent run until actual completion.

## Configuration

All hooks are configured in `.claude/settings.json`. The current configuration:
- **PreToolUse hooks** for Bash operations trigger all three Bash-related hooks in sequence
- **Stop hooks** trigger `Stop.js` when sessions complete

## Notes

- Hooks provide safety guardrails but don't guarantee 100% protection
- Always review Claude's proposed actions, especially in non-YOLO mode
- Hook scripts can be extended to integrate with your existing tooling and workflows