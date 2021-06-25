service = {    
    GetDataFromAMS: [getDataFromAMS],
    UpdateAMSResult: [getResult],
    ServiceOffline: [serviceOffline]
};

function getDataFromAMS(event) {   
    eventData = event;
    SQLOptions("dn", eventData.dn);
    SQL(getData, "SELECT a.*, rownum rn FROM IMPORT_"+eventData.ams+"_"+eventData.class+" a WHERE STATUS = 'SPOOLED' and rownum <=50");
}

function getData(eventList) {
    eventList.setTopic("DataSync");
    eventList.setSubtopic(eventData.mTranscontext);
    Publish(eventList);
    serviceOffline();
}




function getResult (event){
    eventData = event;
    SQLOptions("dn", event.dn);
    if(event.status == "DBFailed") {
        SQL(goToNext, "UPDATE IMPORT_"+event.ams+"_"+event.class+" set status = 'FAILED' where ROW_ID IN ("+event.mID+");");
    }
    else {
        SQL(goToNext, "UPDATE IMPORT_"+event.ams+"_"+event.class+" set status = 'DONE' where ROW_ID IN ("+event.mID+");");
    }
}

function goToNext(event){
    event.setTopic("DataSyncUpdate");
    event.setSubtopic(eventData.mTranscontext);
    Publish(event);
    serviceOffline();
}

function serviceOffline() {    
    Exit();    
}
