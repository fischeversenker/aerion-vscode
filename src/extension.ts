import { exec } from 'child_process';
import * as vscode from 'vscode';

const outputChannel = vscode.window.createOutputChannel('CoffeeCup');
const statusBarItem = vscode.window.createStatusBarItem(
  vscode.StatusBarAlignment.Right,
  100
);
let updateTimer: NodeJS.Timeout | undefined;
const commentPlaceholders = [
  "Debug the debugger's debugger",
  'Perfect the art of the pixel push',
  'Create a loading spinner that entertains',
  "Rename 'div' tags for fun",
  'Build a toggle switch that lies',
  'Add a fake feature to the roadmap',
  'Use more emojis in comments',
  'Optimize the "404 - Page not found" experience',
  'Introduce a CSS class named "invisible"',
  'Plan an unnecessary framework discussion',
];

export function activate(context: vscode.ExtensionContext) {
  outputChannel.appendLine('CoffeeCup is now active!');

  exec('coffeecup version', (error, stdout, stderr) => {
    if (error) {
      outputChannel.appendLine(
        `exec error while running 'coffeecup version': "${error}"`
      );

      statusBarItem.dispose();
      if (error.message.includes('is not a valid command')) {
        outputChannel.appendLine(
          `CoffeeCup CLI version is outdated: "${stdout}"`
        );

        statusBarItem.dispose();

        vscode.window
          .showErrorMessage(
            `Your CoffeeCup CLI is outdated!`,
            'Visit CoffeeCup CLI on GitHub to update'
          )
          .then((selection) => {
            if (!selection) {
              return;
            }

            vscode.env.openExternal(
              vscode.Uri.parse(
                'https://github.com/fischeversenker/coffeecup-cli'
              )
            );
          });
      } else {
        vscode.window
          .showErrorMessage(
            `It looks like the CoffeeCup CLI is not installed!`,
            'Visit CoffeeCup CLI on GitHub'
          )
          .then((selection) => {
            if (!selection) {
              return;
            }

            vscode.env.openExternal(
              vscode.Uri.parse(
                'https://github.com/fischeversenker/coffeecup-cli'
              )
            );
          });
      }
    }

    if (stderr) {
      outputChannel.appendLine(
        `stderr while running 'coffeecup version': "${stderr}"`
      );
    }

    const versionParts = stdout.split('.');
    const patchVersion = Number(versionParts.at(-1) ?? '0');
    if (patchVersion < 6) {
      outputChannel.appendLine(
        `CoffeeCup CLI version is outdated: "${stdout}"`
      );

      statusBarItem.dispose();

      vscode.window
        .showErrorMessage(
          `Your CoffeeCup CLI is outdated!`,
          'Visit CoffeeCup CLI on GitHub to update'
        )
        .then((selection) => {
          if (!selection) {
            return;
          }

          vscode.env.openExternal(
            vscode.Uri.parse('https://github.com/fischeversenker/coffeecup-cli')
          );
        });
    }
  });

  function update() {
    exec('coffeecup today', (error, stdout, stderr) => {
      if (error) {
        outputChannel.appendLine(
          `exec error while running 'coffeecup today': "${error}"`
        );
        return;
      }
      if (stderr) {
        outputChannel.appendLine(
          `stderr while running 'coffeecup today': "${stderr}"`
        );
      }

      outputChannel.appendLine(
        `Result of 'coffeecup today':\n--------\n${stdout}--------\n`
      );

      const lines = stdout.split('\n');
      const activeLine = lines.find((line) => line.includes('⌛'));
      if (activeLine) {
        const project = activeLine.split('|')[0].trim();
        const duration = activeLine.split('|')[1].replace('⌛', '').trim();
        statusBarItem.text = '🍵' + project + ' ' + duration;
      } else {
        statusBarItem.text = '🍵 Idle';
      }
    });
  }

  const switchTasksCommandId = 'coffeecup.switchTasks';

  const switchTaskCommand = vscode.commands.registerCommand(
    switchTasksCommandId,
    () => {
      exec('coffeecup projects alias', (error, stdout, stderr) => {
        if (error) {
          outputChannel.appendLine(
            `exec error while running 'coffeecup projects alias': "${error}"`
          );
          return;
        }
        if (stderr) {
          outputChannel.appendLine(
            `stderr while running 'coffeecup projects alias': "${stderr}"`
          );
        }
        outputChannel.appendLine(
          `Result of "coffeecup projects alias":\n${stdout}`
        );

        const lines = stdout.split('\n');
        const aliases = lines
          .map((line) => {
            const parts = line.match(/^(\S+)\s+(.*?)\s+\(ID:\s*(\d+)\)$/);
            return parts ? parts[1] : undefined;
          })
          .filter(Boolean) as string[];
        const theNoOption = "Don't start anything new. Stop the current task.";
        aliases.push(theNoOption);

        vscode.window
          .showQuickPick(aliases, {
            title: 'Which project do you want to start/resume?',
            placeHolder:
              '(select the active project if you just want to add a new comment)',
          })
          .then((alias) => {
            if (!alias) {
              return;
            }

            if (alias === theNoOption) {
              vscode.commands.executeCommand('coffeecup.stop');
              return;
            }

            vscode.window
              .showInputBox({
                prompt: 'Comment',
                placeHolder: commentPlaceholders.at(
                  Math.floor(Math.random() * commentPlaceholders.length)
                ),
              })
              .then((comment) => {
                if (comment === undefined) {
                  return;
                }
                let command = `coffeecup start ${alias}`;
                if (comment) {
                  command += ` "${comment}"`;
                }

                exec(command, (error, stdout, stderr) => {
                  if (error) {
                    outputChannel.appendLine(
                      `exec error while running '${command}': "${error}"`
                    );
                    vscode.window.showErrorMessage(
                      `Failed to start "${alias}"!`,
                      { detail: `Error: "${error}"` }
                    );
                    return;
                  }
                  if (stderr) {
                    outputChannel.appendLine(
                      `stderr while running '${command}': "${stderr}"`
                    );
                    vscode.window.showErrorMessage(
                      `Failed to start "${alias}"!`,
                      { detail: `Error: "${error}"` }
                    );
                    return;
                  }

                  update();
                });
                vscode.window.showInformationMessage(
                  `Started/resumed project "${alias}".`,
                  {
                    detail: comment
                      ? 'Working on "' + comment + '".'
                      : undefined,
                  }
                );
              });
          });
      });
    }
  );

  const stopCommandId = 'coffeecup.stop';

  const stopCommand = vscode.commands.registerCommand(stopCommandId, () => {
    exec('coffeecup stop', (error, stdout, stderr) => {
      outputChannel.appendLine(
        `exec error while running 'coffeecup stop': "${error}"`
      );

      if (stderr) {
        outputChannel.appendLine(
          `stderr while running 'coffeecup stop': "${stderr}"`
        );
      }
      update();
      vscode.window.showInformationMessage(`Stopped task succesfully.`);
    });
  });

  statusBarItem.name = 'coffeecup';
  statusBarItem.command = switchTasksCommandId;
  statusBarItem.tooltip = 'Click to switch tasks';
  statusBarItem.show();

  update();

  // Update status bar every minute
  updateTimer = setInterval(update, 1000 * 60);

  context.subscriptions.push(statusBarItem);
  context.subscriptions.push(switchTaskCommand);
  context.subscriptions.push(stopCommand);
  context.subscriptions.push(outputChannel);
}

export function deactivate() {
  if (updateTimer) {
    clearInterval(updateTimer);
  }
}
