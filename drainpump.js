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
let STATE = {
    current_timer: CONFIG.initial_intervall_timer,
    intervall_timer: null,  // Timer handle
    power_watch_timer: null,  // Timer handle
    tmr_start_time: Date.now()
};

// Function to get the run duration
function getRunDuration() {
    return Math.floor((Date.now() - STATE.tmr_start_time) / 1000);
}

// Function to handle switch turning on
function switchOn() {
    // Turn on the switch
    Shelly.call("Switch.Set", { id: 0, on: true });
}

// Function to handle switch turning off and record the run time
function switchOff() {
    // Turn off the switch
    Shelly.call("Switch.Set", { id: 0, on: false });
}

// Function to start the power watch timer
function startPowerWatchTimer() {
    STATE.power_watch_timer = Timer.set(1000, true, checkPower);
}

// Function to stop the power watch timer
function stopPowerWatchTimer() {
    if (STATE.power_watch_timer != null) {
        Timer.clear(STATE.power_watch_timer);
        STATE.power_watch_timer = null;
    }
}

// Function to start the interval timer
function startIntervalTimer() {
    STATE.intervall_timer = Timer.set(STATE.current_timer * 1000, false, switchOn);
}

// Function to stop the interval timer
function stopIntervalTimer() {
    if (STATE.intervall_timer != null) {
        Timer.clear(STATE.intervall_timer);
        STATE.intervall_timer = null;
    }
}

// Function to adjust the timer
function adjustTimer(last_run_duration) {
    print("last_run_duration =", last_run_duration+"s");

    let new_timer = STATE.current_timer;

    // check for max run time reached and adjust timer to minimum
    if (last_run_duration > CONFIG.max_pump_run_time) {
        new_timer = CONFIG.initial_intervall_timer;
    } else  if (last_run_duration < CONFIG.increase_threshold) {
        new_timer = Math.min(CONFIG.max_intervall_timer, STATE.current_timer + CONFIG.timer_increase_step);
    } else if (last_run_duration > CONFIG.decrease_threshold) {
        new_timer = Math.max(CONFIG.min_intervall_timer, STATE.current_timer - CONFIG.timer_decrease_step);
    }

    if (new_timer != STATE.current_timer) {
        STATE.current_timer = new_timer;
        print("new current_timer =", STATE.current_timer+"s");
    }
}


// Function to check power consumption
function checkPower() {
    Shelly.call("Switch.GetStatus", { id: 0 }, function (result) {
        let run_duration =  getRunDuration();
        let power = result.apower;
        print("run_duration =", run_duration+"s", ";", "power =", power+"W" );
        
        // If the power is below the threshold or the timer has run out, turn off the switch
        // The timer has a minimum of CONFIG.pump_runup_time seconds to give pump time to start
        // The timer has a maximum of CONFIG.max_pump_run_time seconds to prevent pump from running too long
        if (run_duration>CONFIG.pump_runup_time && (power < CONFIG.power_threshold || run_duration > CONFIG.max_pump_run_time) ) {
            // Turn off the switch            
           switchOff();
        }
    });
}

// Function to handle switch turning on and record the start time
function switchTurnedOn() {
    print("on")

    // Stop intervall timer
    stopIntervalTimer();

    // Record the start time
    STATE.tmr_start_time = Date.now();

    // Check power consumption
    startPowerWatchTimer();
}


// Function to handle switch turning off and record the run time
function switchTurnedOff() {
    print("off")

    // Stop the power watch timer
    stopPowerWatchTimer();

    // Record the last run time
    let last_run_duration = getRunDuration();

    // Adjust the timer based on the last run time
    adjustTimer(last_run_duration);

    // Start the timer
    startIntervalTimer();
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
