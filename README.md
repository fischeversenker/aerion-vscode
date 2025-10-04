# Aerion VSCode Extension

This extension adds time tracking from aerion.app to VSCode. Requires the Aerion CLI to be installed and functional. See [Requirements](#requirements).

## Features

- Show the state and duration of your currently active task

  Idle:\
  ![idle status bar item](images/status_bar_idle.png)

  Active:\
  ![active status bar item](images/status_bar_active.png)

- Change your active task

  ![project selection for new task](images/quick_pick.png)

## Requirements

To run this, you need to have the Aerion CLI installed. Get it from here: https://github.com/fischeversenker/aerion-cli.
You need to be logged in using the CLI and you can only use tasks from projects for which you have set up an alias using `aerion-cli projects alias`. See the Aerion CLI repository for more details.
