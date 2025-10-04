import { exec, execSync } from 'child_process';
import * as vscode from 'vscode';

const outputChannel = vscode.window.createOutputChannel('Aerion');
const statusBarItem = vscode.window.createStatusBarItem(
  vscode.StatusBarAlignment.Right,
  100
);
let updateTimer: NodeJS.Timeout | undefined;

export function activate(context: vscode.ExtensionContext) {
  const aerionCliCommand = 'aerion-cli';

  // first figure out if the aerion-cli is installed
  try {
    execSync(`${aerionCliCommand} version`);
    outputChannel.appendLine('aerion is now active!');
  } catch (error) {
    outputChannel.appendLine('aerion CLI is not installed!');

    statusBarItem.dispose();

    vscode.window
      .showErrorMessage(
        'It looks like the aerion CLI is not installed!',
        'Visit aerion CLI on GitHub'
      )
      .then((selection) => {
        if (!selection) {
          return;
        }

        vscode.env.openExternal(
          vscode.Uri.parse('https://github.com/fischeversenker/aerion-cli')
        );
      });
  }

  function update() {
    exec(`${aerionCliCommand} today`, (error, stdout, stderr) => {
      if (error) {
        outputChannel.appendLine(
          `exec error while running 'today': "${error}"`
        );
        return;
      }
      if (stderr) {
        outputChannel.appendLine(`stderr while running 'today': "${stderr}"`);
      }

      outputChannel.appendLine(
        `Result of 'today':\n--------\n${stdout}--------\n`
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

  const switchTasksCommandId = 'aerion.switchTasks';

  const switchTaskCommand = vscode.commands.registerCommand(
    switchTasksCommandId,
    () => {
      exec(`${aerionCliCommand} projects alias`, (error, stdout, stderr) => {
        if (error) {
          outputChannel.appendLine(
            `exec error while running 'projects alias': "${error}"`
          );
          return;
        }
        if (stderr) {
          outputChannel.appendLine(
            `stderr while running 'projects alias': "${stderr}"`
          );
        }
        outputChannel.appendLine(`Result of "projects alias":\n${stdout}`);

        const lines = stdout.split('\n');
        const projectOptions = lines
          .map((line) => {
            const parts = line.match(/^(\S+)\s+(.*?)\s+\(ID:\s*(\d+)\)$/);
            return parts ? `${parts[2]} (alias: ${parts[1]})` : undefined;
          })
          .filter(Boolean) as string[];
        const theNoOption = "Don't start anything new. Stop the current task.";
        projectOptions.push(theNoOption);

        vscode.window
          .showQuickPick(projectOptions, {
            title: 'Which project do you want to start/resume?',
            placeHolder:
              '(select the active project if you just want to add a new comment)',
          })
          .then((seletedProjectOption) => {
            if (!seletedProjectOption) {
              return;
            }

            if (seletedProjectOption === theNoOption) {
              vscode.commands.executeCommand('aerion.stop');
              return;
            }

            const alias = seletedProjectOption.match(/\(alias: (.*?)\)$/)?.[1];

            vscode.window
              .showInputBox({
                prompt: 'Comment',
                placeHolder: '(leave empty to skip)',
              })
              .then((comment) => {
                if (comment === undefined) {
                  return;
                }
                let command = `${aerionCliCommand} start ${alias}`;
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
                      { detail: `Error: "${stderr}"` }
                    );
                    return;
                  }

                  update();
                });
                vscode.window.showInformationMessage(
                  `Started/resumed project "${alias}"${
                    comment ? ', working on "' + comment + '"' : ''
                  }`
                );
              });
          });
      });
    }
  );

  const stopCommandId = 'aerion.stop';

  const stopCommand = vscode.commands.registerCommand(stopCommandId, () => {
    exec(`${aerionCliCommand} stop`, (error, stdout, stderr) => {
      if (error) {
        outputChannel.appendLine(`exec error while running 'stop': "${error}"`);
        vscode.window.showErrorMessage(`Failed to stop the current task!`, {
          detail: `Error: "${error}"`,
        });
        return;
      }

      if (stderr) {
        outputChannel.appendLine(`stderr while running 'stop': "${stderr}"`);
        vscode.window.showErrorMessage(`Failed to stop the current task!`, {
          detail: `Error: "${stderr}"`,
        });
        return;
      }

      update();
      vscode.window.showInformationMessage(`Stopped task succesfully.`);
    });
  });

  statusBarItem.name = 'aerion';
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
