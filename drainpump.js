// Script for a Shelly device which set a switch to on on an adjustable timer base. 
// The timer is adjusted dependand on how long the las run was.
// The switch should be turned off if the power consumption is under a configurable limit.
// The timer has a configurable maximmum. 
// The timer schould be increased if the last run was under 15 seconds and decresed if the last run was over 20 seconds.

// Load or set default configuration parameters
let config = {
    power_threshold: Shelly.getComponentConfig("relay0", "power_threshold") || 5.0,           // Power threshold in watts
    max_timer: Shelly.getComponentConfig("relay0", "max_timer") || 300,                       // Maximum timer duration in seconds
    min_timer: Shelly.getComponentConfig("relay0", "min_timer") || 10,                        // Minimum timer duration in seconds
    initial_timer: Shelly.getComponentConfig("relay0", "initial_timer") || 30,                // Initial timer duration in seconds
    increase_threshold: Shelly.getComponentConfig("relay0", "increase_threshold") || 15,      // Last run time threshold for increasing the timer
    decrease_threshold: Shelly.getComponentConfig("relay0", "decrease_threshold") || 20,      // Last run time threshold for decreasing the timer
    timer_increase_step: Shelly.getComponentConfig("relay0", "timer_increase_step") || 10,    // Amount to increase the timer by
    timer_decrease_step: Shelly.getComponentConfig("relay0", "timer_decrease_step") || 5      // Amount to decrease the timer by
};

// Variables to store state
let last_run_time = 0;
let current_timer = config.initial_timer;
let tmr = null;  // Timer handle

// Function to adjust the timer
function adjustTimer(last_run_time) {
    if (last_run_time < config.increase_threshold) {
        current_timer = Math.min(config.max_timer, current_timer + config.timer_increase_step);
    } else if (last_run_time > config.decrease_threshold) {
        current_timer = Math.max(config.min_timer, current_timer - config.timer_decrease_step);
    }
}

// Function to handle switch turning on
function switchOn() {
    // Turn on the switch
    Shelly.call("Switch.Set", { id: 0, on: true });

    // Start the timer
    tmr = Timer.set(current_timer * 1000, false, function() {
        // Check power consumption
        Shelly.call("Switch.GetStatus", { id: 0 }, function(result) {
            let power = result.aenergy.power;
            if (power < config.power_threshold) {
                // Turn off the switch
                Shelly.call("Switch.Set", { id: 0, on: false });
            }
        });
    });
}

// Function to handle switch turning off and record the run time
function switchOff() {
    // Record the last run time
    last_run_time = Timer.now() - tmr_start_time;

    // Adjust the timer based on the last run time
    adjustTimer(last_run_time);
}

// Event handler for switch status change
Shelly.addEventHandler(function(event, user_data) {
    if (event.component == "switch0") {
        if (event.info.state) {
            // Switch turned on
            tmr_start_time = Timer.now();
        } else {
            // Switch turned off
            switchOff();
        }
    }
}, null);

// Initial switch on
switchOn();
