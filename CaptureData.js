var database = "ORALocal";
service = {
    ServiceOnline: [serviceOnline],
    DeviceData:    [deviceData],
    DeviceLost: [deviceLost],    
    ServiceOffline: [serviceOffline]
};


function serviceOnline(){
    var now   = new Date();
    scheduleTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 30, 0, 0);    
    msecs = scheduleTime.getTime() - now.getTime();    
    //SchedulePublication(createTables, msecs, sub.contextId);    
    SchedulePublication(createTables, 10000, sub.contextId);    
}    

function createTables() {
    SQLOptions("dn", database);
    SQL("drop table devicedata_observation2");
    SQL(created, "create table devicedata_observation2 (" + 
        " tid varchar(128), " + 
        " tag varchar(64), " + 
        " location varchar(64), " + 
        " type varchar(64), " +
        " rssi number, " +
        " time number, " + 
        " primary key(tid))");
}

function created(event) {
    if (event.getTopic() == "DBSuccess")
    {
        Log.info(event);
        Subscribe({topic: "DeviceData", subtopic: "*", timeout: -1});   
        Subscribe({topic: "DeviceLost", subtopic: "*", timeout: -1});   
    }
    else 
    {
        Log.info(event);
        serviceOffline();
    }      
    ScheduleTimer(stopCapture, 60000, "CaptureDataTimer:"+sub.contextId);    
    //ScheduleTimer(stopCapture, 600000, "CaptureDataTimer:"+sub.contextId);    
}

function deviceData(event) {
    Log.debug("DeviceData is ready to insert"+event);
    mDUID = UniqueId();
    mDRSSI = event.rssi?event.rssi:0;
    mDTime = parseInt(((new Date()).getTime() / 1000).toFixed(0));
    SQL(insertedData, "insert into devicedata_observation2 values('?', '?', '?', '?', ?, ?)", mDUID, event.tagId, event.logicalDevice,event.getTopic(),mDRSSI, mDTime);
}

function insertedData(event) {
    if (event.getTopic() == "DBSuccess")
    {
        Log.info("DeviceData inserted");
    }
    else
    {
        Log.info(event);    
        Log.info("DeviceData insertion failed");
    }
}

function deviceLost(event) {
    Log.debug("DeviceLost is ready to insert"+event);  
    mLUID = UniqueId();
    mLRSSI = event.rssi?event.rssi:0;
    mLTime = mDTime = parseInt(((new Date()).getTime() / 1000).toFixed(0));
    SQL(insertedLost, "insert into devicedata_observation2 values('?', '?', '?', '?',?, ?)", mLUID, event.tagId, event.logicalDevice,event.getTopic(),mLRSSI, mLTime);
}

function insertedLost(event) {
    if (event.getTopic() == "DBSuccess")
    {
        Log.info("DeviceLost inserted");
    }
    else
    {
        Log.info(event);    
        Log.info("DeviceLost insertion failed");
    }
}

function stopCapture(){    
    Unsubscribe({topic: "DeviceData", subtopic: "*"});
    Unsubscribe({topic: "DeviceLost", subtopic: "*"});
    Publish("GetPingPong", "FindPingPong");        
    ScheduleTimer(serviceOnline, 20000, "CreateTables:"+sub.contextId);    
    //ScheduleTimer(serviceOnline, 3600000, "CreateTables:"+sub.contextId);    
    
}
function serviceOffline() {    
    Unsubscribe({topic: "DeviceData", subtopic: "*"});
    Unsubscribe({topic: "DeviceLost", subtopic: "*"});
    Exit();
}