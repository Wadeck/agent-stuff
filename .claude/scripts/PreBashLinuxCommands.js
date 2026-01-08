import {dirname} from 'path';
import {fileURLToPath} from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get all arguments
const args = process.argv.slice(2);
const env = process.env;

// Read stdin
let stdinData = '';

process.stdin.setEncoding('utf8');

process.stdin.on('data', chunk => {
    stdinData += chunk;
});

process.stdin.on('end', () => {
    let parsedStdin = null;
    try {
        parsedStdin = JSON.parse(stdinData);
    } catch (e) {
        parsedStdin = stdinData;
    }

    // Extract the command from stdin
    const command = parsedStdin?.tool_input?.command || parsedStdin?.command || '';

    // Only block commands that truly DON'T work on Windows
    // Note: Many Linux commands work in PowerShell (ls, cat, cp, mv, rm, pwd, clear, etc.)
    // or are available natively on Windows 10+ (curl, tar, ssh, etc.)
    const incompatibleCommands = [
        {
            pattern: /^\s*grep\s/i,
            linuxCmd: 'grep',
            windowsCmd: 'findstr',
            powershellCmd: 'Select-String',
            description: 'search text in files',
            worksOnWindows: false
        },
        {
            pattern: /^\s*sed\s/i,
            linuxCmd: 'sed',
            windowsCmd: 'PowerShell -replace operator',
            powershellCmd: '(Get-Content file) -replace "pattern", "replacement" | Set-Content file',
            description: 'stream editor for text manipulation',
            worksOnWindows: false
        },
        {
            pattern: /^\s*awk\s/i,
            linuxCmd: 'awk',
            windowsCmd: 'PowerShell ForEach-Object',
            powershellCmd: 'ForEach-Object or Import-Csv for text processing',
            description: 'text processing and data extraction',
            worksOnWindows: false
        },
        {
            pattern: /^\s*touch\s/i,
            linuxCmd: 'touch',
            windowsCmd: 'type nul > file or echo. > file',
            powershellCmd: 'New-Item -ItemType File',
            description: 'create empty file or update timestamp',
            worksOnWindows: false
        },
        {
            pattern: /^\s*(ps\s+[^1-9]|ps\s*$)/i,
            linuxCmd: 'ps',
            windowsCmd: 'tasklist',
            powershellCmd: 'Get-Process',
            description: 'list running processes',
            worksOnWindows: false
        },
        {
            pattern: /^\s*top\s*$/i,
            linuxCmd: 'top',
            windowsCmd: 'tasklist (or Task Manager)',
            powershellCmd: 'Get-Process | Sort-Object CPU -Descending',
            description: 'display real-time process information',
            worksOnWindows: false
        },
        {
            pattern: /^\s*which\s/i,
            linuxCmd: 'which',
            windowsCmd: 'where',
            powershellCmd: 'Get-Command',
            description: 'locate a command',
            worksOnWindows: false
        },
        {
            pattern: /^\s*chmod\s/i,
            linuxCmd: 'chmod',
            windowsCmd: 'icacls (for permissions)',
            powershellCmd: 'Set-Acl or icacls',
            description: 'change file permissions',
            worksOnWindows: false
        },
        {
            pattern: /^\s*chown\s/i,
            linuxCmd: 'chown',
            windowsCmd: 'icacls (for ownership)',
            powershellCmd: 'Set-Acl',
            description: 'change file owner',
            worksOnWindows: false
        },
        {
            pattern: /^\s*tail\s+-/i,
            linuxCmd: 'tail',
            windowsCmd: 'PowerShell Get-Content -Tail',
            powershellCmd: 'Get-Content -Tail n',
            description: 'display last lines of a file',
            worksOnWindows: false
        },
        {
            pattern: /^\s*head\s+-/i,
            linuxCmd: 'head',
            windowsCmd: 'PowerShell Get-Content -Head',
            powershellCmd: 'Get-Content -Head n',
            description: 'display first lines of a file',
            worksOnWindows: false
        },
        {
            pattern: /^\s*df\s/i,
            linuxCmd: 'df',
            windowsCmd: 'wmic logicaldisk get size,freespace,caption',
            powershellCmd: 'Get-PSDrive',
            description: 'display disk space usage',
            worksOnWindows: false
        },
        {
            pattern: /^\s*du\s/i,
            linuxCmd: 'du',
            windowsCmd: 'dir /s (with calculation)',
            powershellCmd: 'Get-ChildItem -Recurse | Measure-Object -Property Length -Sum',
            description: 'estimate disk usage',
            worksOnWindows: false
        },
        {
            pattern: /^\s*printenv\s/i,
            linuxCmd: 'printenv',
            windowsCmd: 'set (without arguments)',
            powershellCmd: 'Get-ChildItem Env:',
            description: 'display environment variables',
            worksOnWindows: false
        },
        {
            pattern: /^\s*man\s/i,
            linuxCmd: 'man',
            windowsCmd: 'help or command /?',
            powershellCmd: 'Get-Help',
            description: 'display command manual',
            worksOnWindows: false
        },
        {
            pattern: /^\s*wc\s+-/i,
            linuxCmd: 'wc',
            windowsCmd: 'find /c /v "" (for line count)',
            powershellCmd: 'Measure-Object -Line',
            description: 'count lines, words, or characters',
            worksOnWindows: false
        },
        {
            pattern: /^\s*basename\s/i,
            linuxCmd: 'basename',
            windowsCmd: 'for %A in (path) do echo %~nxA',
            powershellCmd: 'Split-Path -Leaf',
            description: 'extract filename from path',
            worksOnWindows: false
        },
        {
            pattern: /^\s*dirname\s/i,
            linuxCmd: 'dirname',
            windowsCmd: 'for %A in (path) do echo %~dpA',
            powershellCmd: 'Split-Path -Parent',
            description: 'extract directory from path',
            worksOnWindows: false
        },
        {
            pattern: /^\s*ln\s+-s/i,
            linuxCmd: 'ln -s',
            windowsCmd: 'mklink',
            powershellCmd: 'New-Item -ItemType SymbolicLink',
            description: 'create symbolic link',
            worksOnWindows: false
        },
        {
            pattern: /^\s*export\s+\w+=.*/i,
            linuxCmd: 'export',
            windowsCmd: 'set',
            powershellCmd: '$env:VARIABLE = "value"',
            description: 'set environment variable',
            worksOnWindows: false
        },
        {
            pattern: /^\s*diff\s/i,
            linuxCmd: 'diff',
            windowsCmd: 'fc (file compare)',
            powershellCmd: 'Compare-Object',
            description: 'compare files',
            worksOnWindows: false
        }
    ];

    // Check if the command matches any incompatible Linux command pattern
    for (const mapping of incompatibleCommands) {
        if (mapping.pattern.test(command)) {
            // Block the command and suggest Windows alternative
            const response = {
                hookSpecificOutput: {
                    hookEventName: "PreToolUse",
                    permissionDecision: "deny",
                    permissionDecisionReason: `INCOMPATIBLE LINUX COMMAND ON WINDOWS

You are trying to use the Linux command "${mapping.linuxCmd}" which does not work natively on Windows.

Description: ${mapping.description}

Windows alternatives:
   • CMD:        ${mapping.windowsCmd}
   • PowerShell: ${mapping.powershellCmd}

Tip: On Windows, use CMD or PowerShell commands instead of Linux commands.

Blocked command: ${command}

Please reformulate your command using the appropriate Windows equivalent.`
                }
            };

            console.log(JSON.stringify(response));
            process.exit(0);
        }
    }

    // Check for pipe commands with Linux utilities
    if (/\|\s*(grep|awk|sed|cut|xargs)\s/i.test(command)) {
        const response = {
            hookSpecificOutput: {
                hookEventName: "PreToolUse",
                permissionDecision: "block",
                permissionDecisionReason: `LINUX PIPELINE DETECTED ON WINDOWS

Your command uses Linux utilities in a pipeline that don't work natively on Windows.

On Windows, consider:
   • Replace grep with findstr or Select-String
   • Use PowerShell for complex text processing
   • Use ForEach-Object, Where-Object, Select-Object, etc.

Blocked command: ${command}

Example PowerShell: Get-Content file.txt | Select-String "pattern" | ForEach-Object { $_.Line }
Example CMD: type file.txt | findstr "pattern"`
            }
        };

        console.log(JSON.stringify(response));
        process.exit(0);
    }

    // Check for common Linux-specific options that don't work on Windows
    // For example: ls with Linux-specific options
    if (/^\s*ls\s+.*(-[alhtSr]{2,}|--\w+)/i.test(command)) {
        const response = {
            hookSpecificOutput: {
                hookEventName: "PreToolUse",
                permissionDecision: "block",
                permissionDecisionReason: `LINUX OPTIONS DETECTED FOR 'ls'

While 'ls' works in PowerShell, the Linux-specific options you're using may not work.

On Windows:
   • Use 'dir' in CMD with Windows options
   • Use 'Get-ChildItem' (or 'ls') in PowerShell with PowerShell parameters
   • Example: Get-ChildItem -Recurse -Force

Blocked command: ${command}

Tip: In PowerShell, use 'Get-Help Get-ChildItem' to see available parameters.`
            }
        };

        console.log(JSON.stringify(response));
        process.exit(0);
    }

    // Check for absolute Unix paths (but not git commands, npm, node, URLs, etc.)
    if (/\s+(\/[a-z]+\/[^\s]+)/i.test(command) &&
        !/^(git|npm|npx|node|python|pip|curl|wget|http|https|ftp)/i.test(command.trim()) &&
        !/\/\w+\/\w+\//.test(command)) { // Exclude patterns like /c/d/ which might be valid
        const response = {
            hookSpecificOutput: {
                hookEventName: "PreToolUse",
                permissionDecision: "block",
                permissionDecisionReason: `UNIX PATH DETECTED ON WINDOWS

Your command appears to use Unix-style paths with forward slashes (/).

On Windows:
   • Use backslashes (\\) for paths: C:\\Users\\...
   • Or use PowerShell which accepts both formats
   • Or use relative paths without leading slash

Blocked command: ${command}

Example: cd C:\\Users\\Documents instead of cd /home/user/documents`
            }
        };

        console.log(JSON.stringify(response));
        process.exit(0);
    }

    process.exit(0);
    // // Allow the command
    // const response = {
    //     hookSpecificOutput: {
    //         hookEventName: "PreToolUse",
    //         permissionDecision: "allow",
    //     }
    // };
    // console.log(JSON.stringify(response));
    // process.exit(0);
});
