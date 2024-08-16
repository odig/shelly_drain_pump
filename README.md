# Shelly Drain Pump

This script allows you to control a Shelly device with an adjustable timer based on power consumption. The timer settings and thresholds are configurable.

## Goals

- Script for a Shelly device which set a switch to on on an adjustable timer base. 
- The timer is adjusted dependand on how long the las run was.
- The switch should be turned off if the power consumption is under a configurable limit.
- The timer has a configurable maximmum. 
- The timer schould be increased if the last run was under x seconds and decresed if the last run was over y seconds.


## Installation

1. Clone the repository.
2. Upload `timer_control.js` and `manifest.json` to your Shelly device.
3. Configure the script parameters using the Shelly web interface or via the API.

## Configuration

The following parameters are configurable:

- `power_threshold`: Power threshold in watts.
- `max_timer`: Maximum timer duration in seconds.
- `min_timer`: Minimum timer duration in seconds.
- `initial_timer`: Initial timer duration in seconds.
- `increase_threshold`: Last run time threshold for increasing the timer in seconds.
- `decrease_threshold`: Last run time threshold for decreasing the timer in seconds.
- `timer_increase_step`: Amount to increase the timer by in seconds.
- `timer_decrease_step`: Amount to decrease the timer by in seconds.

## Usage

The script will automatically adjust the timer based on the device's power consumption. If the power consumption is below the threshold, the switch will be turned off.
