// ---------------------------------------------------------------------
// To start the simulation publish an event with a list of assets, 
// a list of locations, a list of peers and a speed. The list of assets 
// will be moved from location.0/peer.0 -> location.1/peer.1 -> etc. 
// The rate of movement is the number of milliseconds indicated by the 
// speed parameter. Once the assets move through the list of locations 
// they are moved back in the opposite direction. The simulation will
// continue until you disable the service. In order to simulate 
// concurrently moving assets you can start more than one simulator
// instance running at once.
// -------------------------------------------------------------------

var assets    = [];
var locations = [];
var peers     = [];
var speed     = 20000;
var index     = 0;
var direction = 1;

service = {
    Start:           [startSimulation], 
    ServiceOffline:  [serviceOffline]
};

function startSimulation(event) {
    speed = parseInt(event["speed"]);

    if (isNaN(speed)) {
        speed = 20000;
    }

    for (var i = 0; event["asset." + i]; i++) {
        assets.push(event["asset." + i]);
    }

    for (var i = 0; event["location." + i]; i++) {
        locations.push(event["location." + i]);
    }

    for (var i = 0; event["peer." + i]; i++) {
        peers.push(event["peer." + i]);
    }

    if (assets.length == 0) {
        Log.info("ERROR: You must specify 1 or more assets to move");
        Exit();
    }

    if (locations.length == 0) {
        Log.info("ERROR: You must specify 1 or more locations to move");
        Exit();
    }

    if (locations.length != peers.length) {
        Log.info("ERROR: Each location must have a corresponding peer");
        Exit();
    }

    moveAssets();
}

function moveAssets() {
    var location = locations[index];
    var peer     = peers[index];
    var time     = new Date().getTime();
    var secs     = time / 1000;    
    for (var i = 0; i < assets.length; i++) {
        Log.info("MOVE: asset=" + assets[i] + ", location=" + location + ", peer=" + peer);
        Publish({peer: peer}, 
                {topic: "DeviceData", 
                 subtopic: location, 
                 params: {
                     tagId: assets[i], 
                     logicalDevice: location, 
                     readTimeSec: secs,                      
                 }});
    }

    index += direction;

    if (index >= locations.length) {
        index     = locations.length - 1;
        direction = -1;
    }
    else if (index < 0) {
        index     = 0;
        direction = 1;
    }

    ScheduleTimer(moveAssets, speed, sub.contextId);
}

function serviceOffline() {
    CancelTimer(sub.contextId);
    Exit();
}
