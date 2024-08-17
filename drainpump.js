// Script for a Shelly device which set a switch to on on an adjustable timer base. 
// The timer is adjusted dependand on how long the las run was.
// The switch should be turned off if the power consumption is under a configurable limit.
// The timer has a configurable maximmum. 
// The timer schould be increased if the last run was under 15 seconds and decresed if the last run was over 20 seconds.

// Load default configuration parameter
function getComponentConfig(parameter) {
    configObject = Shelly.getComponentConfig(parameter)
    if (configObject == null) {
        return null;
    }

    return configObject[parameter];
}

let CONFIG = {
    power_threshold: getComponentConfig("power_threshold") || 5.0,                     // Power threshold in watts
    max_intervall_timer: getComponentConfig("max_intervall_timer") || 300,             // Maximum timer duration in seconds
    min_intervall_timer: getComponentConfig("min_intervall_timer") || 10,              // Minimum timer duration in seconds
    initial_intervall_timer: getComponentConfig("initial_intervall_timer") || 30,      // Initial timer duration in seconds
    increase_threshold: getComponentConfig("increase_threshold") || 15,                // Last run time threshold for increasing the timer
    decrease_threshold: getComponentConfig("decrease_threshold") || 20,                // Last run time threshold for decreasing the timer
    timer_increase_step: getComponentConfig("timer_increase_step") || 10,              // Amount to increase the timer by
    timer_decrease_step: getComponentConfig("timer_decrease_step") || 5,               // Amount to decrease the timer by
    max_pump_run_time: getComponentConfig("max_pump_run_time") || 60,                  // Maximum pump run time in seconds
    pump_runup_time: getComponentConfig("pump_runup_time") || 5                        // Time to wait for pump to start in seconds
};

// Variables to store state
let last_run_duration = 0;
let current_timer = CONFIG.initial_intervall_timer;
let intervall_timer = null;  // Timer handle
let power_watch_timer = null;  // Timer handle
let tmr_start_time = Date.now();

// Function to adjust the timer
function adjustTimer(last_run_duration) {
    print("last_run_duration =", last_run_duration+"s");

    let new_timer = current_timer;

    // check for max run time reached and adjust timer to minimum
    if (last_run_duration > CONFIG.max_pump_run_time) {
        new_timer = CONFIG.initial_intervall_timer;
    } else  if (last_run_duration < CONFIG.increase_threshold) {
        new_timer = Math.min(CONFIG.max_intervall_timer, current_timer + CONFIG.timer_increase_step);
    } else if (last_run_duration > CONFIG.decrease_threshold) {
        new_timer = Math.max(CONFIG.min_intervall_timer, current_timer - CONFIG.timer_decrease_step);
    }

    if (new_timer != current_timer) {
        current_timer = new_timer;
        print("new current_timer =", current_timer+"s");
    }
}


// Function to check power consumption
function checkPower() {
    Shelly.call("Switch.GetStatus", { id: 0 }, function (result) {
        let run_duration =  Math.floor((Date.now() - tmr_start_time)/1000);
        let power = result.apower;
        print("run_duration =", run_duration+"s", ";", "power =", power+"W" );
        
        // If the power is below the threshold or the timer has run out, turn off the switch
        // The timer has a minimum of CONFIG.pump_runup_time seconds to give pump time to start
        // The timer has a maximum of CONFIG.max_pump_run_time seconds to prevent pump from running too long
        if (run_duration>CONFIG.pump_runup_time && (power < CONFIG.power_threshold || run_duration > CONFIG.max_pump_run_time) ) {
            // Stop the power watch timer
            Timer.clear(power_watch_timer);
            power_watch_timer = null;

            // Turn off the switch            
            Shelly.call("Switch.Set", { id: 0, on: false });
        }
    });
}

// Function to handle switch turning on
function switchOn() {
    // Stop timer
    if (intervall_timer != null) {
        Timer.clear(intervall_timer);
        intervall_timer = null;
    }

    // Turn on the switch
    Shelly.call("Switch.Set", { id: 0, on: true });

    // Check power consumption
    power_watch_timer = Timer.set(1000, true, checkPower);
}

// Function to handle switch turning off and record the run time
function switchOff() {
    if (intervall_timer != null) {
        Timer.clear(intervall_timer);
        intervall_timer = null;
    }

    // Record the last run time
    let last_run_duration = Math.floor((Date.now() - tmr_start_time)/1000);

    // Adjust the timer based on the last run time
    adjustTimer(last_run_duration);

    // Start the timer
    intervall_timer = Timer.set(current_timer * 1000, false, switchOn);
}

// Function to handle switch turning on and record the start time
function switchTurnedOn() {
    print("on")
    tmr_start_time = Date.now();
}


// Function to handle switch turning off and record the run time
function switchTurnedOff() {
    print("off")

    if (intervall_timer != null) {
        Timer.clear(intervall_timer);
        intervall_timer = null;
    }

    // Record the last run time
    let last_run_duration = Math.floor((Date.now() - tmr_start_time)/1000);

    // Adjust the timer based on the last run time
    adjustTimer(last_run_duration);

    // Start the timer
    intervall_timer = Timer.set(current_timer * 1000, false, switchOn);
}

//
// Setup
//

// Event handler for switch status change
Shelly.addEventHandler(function (event, user_data) {
    if (event.component == "switch:0") {
        //print("event =", event);
        switch (event.info.event) {
            case "toggle":
                if (event.info.state) {
                    // Switch turned on
                    switchTurnedOn();
                } else {
                    // Switch turned off
                    switchTurnedOff();
                }
                break;
            case "power_update":
                checkPower();
                break;
        }
    }
}, null);

// Initial switch on
switchOn();
