service = {    
    AMSToGVSSync: [getAMSClassDn],
    DataSync:[getData],
    DataSyncUpdate:[goToNext],
    ServiceOffline: [serviceOffline]
};

var mID = '';
var amsName = '';
var className = '';
var dnName = '';
var mHeaderSQL = '';
var nBodySQL = '';
var mBodySQL = '';
var mMapAMSClassDn;
var mMapAMSClassDnIndex = 0;
var mMapAMSClassDnSize = 0;
var mAMSClass = '';
var mColumnString = '';
var mTranscontext = '';
var mProcessing = 0;
var mEndSQL = "\nBEGIN\n"+
    "IMPORT_DIRECT_DN_DATA(V_AMS, V_CLASS, V_DATA);\n"+
    "END;\n"+
    "";

function getAMSClassDn(){
    mTranscontext = UniqueId();
    Subscribe("DataSync", mTranscontext, -1);
    Subscribe("DataSyncUpdate", mTranscontext, -1);
    mMapAMSClassDn = [];
    SQLOptions("dn", "AMSTOGVSDN");   
    SQL(getAMSClassDnResult, "SELECT a.NAME as AMSNAME, b.CLASS_NAME as CLASSNAME, c.val as DNNAME "+
        "from "+
        "AT_AMS a,"+ 
        "AT_DN_SYNC_TABLES b,"+
        "AT_SYNC_MODE_DETAILS c, "+
		"AT_AMS_SYNC_MODE d "+
        "where "+
        "a.id = b.ams_id "+
		"and a.id = c.ams_id "+
		"and a.id = d.ams_id "+
        "and d.sync_mode_id = 2 "+
        "and a.status = 1"+        
		"and d.status = 1"+
        "and c.property = 'DN_NAME'");
}

function getAMSClassDnResult(amsClassEventList) {
    mMapAMSClassDnSize = amsClassEventList.length;
    if(amsClassEventList.getTopic() == "DBFound") {        
        for(var index = 0; index < amsClassEventList.length; index++) 
        { 
            mMapAMSClassDn[index] = amsClassEventList[index].AMSNAME+","+amsClassEventList[index].CLASSNAME+","+amsClassEventList[index].DNNAME;
        }
        getAMSClassDnName();            
    }
    else {
        serviceOffline();    
    }       
}

function getAMSClassDnName(){
    mProcessing = 0;
    mAMSClass = mMapAMSClassDn[mMapAMSClassDnIndex];
    amsName = mAMSClass.substring(0,mAMSClass.indexOf(","));
    className = mAMSClass.substring(mAMSClass.indexOf(",")+1, mAMSClass.lastIndexOf(",")); 
    dnName = mAMSClass.substring(mAMSClass.lastIndexOf(",")+1, mAMSClass.length);    
    getColName();
}

function getColName() {
    SQL(getColNameResult, "select input_col_name from at_ams_sync_columns where ams_id IN (select id from at_ams where name = '"+amsName+"') and Class_name = '"+className+"' and input_col_name IS NOT NULL");
}

function getColNameResult(eventColNameList) {
    if(eventColNameList.getTopic() == "DBFound") {       
        for(var index = 0; index < eventColNameList.length; index++) 
        {
            if(mColumnString.length > 0) {
                mColumnString += ",";
            }
            mColumnString += "'"+eventColNameList[index].INPUT_COL_NAME+"'";            
        }  
        mHeaderSQL = "\nDECLARE\n"+
            "V_AMS VARCHAR2(128) := '"+amsName+"';\n"+
            "V_CLASS VARCHAR2(128) := '"+className+"';\n"+
            "V_DATA DIRECT_DN_DATA := DIRECT_DN_DATA(\n";
        mEvent = new Event("GetDataFromAMS","ATAMStoGVSDnSync2");
        mEvent.ams = amsName;
        mEvent.class = className;
        mEvent.dn = dnName;
        mEvent.mTranscontext = mTranscontext;
        Publish(mEvent);
    }
    else {
        mMapAMSClassDnIndex += 1;
        if (mMapAMSClassDnIndex == mMapAMSClassDnSize){
            serviceOffline();
        }
        else {            
            getAMSClassDnName();        
        }    
    }       
}

function getData(eventList) {
    //Log.debug(eventList);
    if(eventList.getTopic() == "DBFound" || eventList.length>0) {
        mProcessing += eventList.length;        
        for(var index = 0; index < eventList.length; index++) 
        { 
            if(mID.length > 0) {
                mID += ",";
            }
            mID += "'"+getFilterValue(eventList[index].ROW_ID)+"'";
            nBodySQL = '';
            for(key in eventList[index]) {
                if (mColumnString.indexOf(key) !== -1){                    
                    var value = eventList[index][key];                    
                    if(nBodySQL.length > 0) {
                        nBodySQL += ", ";
                    }                    
                    nBodySQL += "DIRECT_DN_CELL('"+key+"','"+value+"')";                           
                }
                else {
                    //Log.debug("----ADDITIONAL ATTRIBUTE-----"+key);                         
                    //Log.debug("----ADDITIONAL VALUE-----"+value);                      
                }                
            }
            mBodySQL +="DIRECT_DN_ROW( "+nBodySQL+")"
                //Log.debug("----FINAL BODY SQL -----"+mBodySQL);                                      
                if (index == eventList.length -1){
                    mBodySQL += ");";           
                }
            else {
                mBodySQL += ",\n";
            }        
        }
        insertDataIntoGVS();        
    }
    else {
        if (mProcessing>0){			
            var sql = "BEGIN EXECUTE_PS('"+amsName+"','"+className+"',"+2+"); END;";
            Log.debug("PS Procedure SQL1 = "+sql);		
            SQL(refreshMV, sql);
        }	
        mMapAMSClassDnIndex += 1;
        if (mMapAMSClassDnIndex == mMapAMSClassDnSize){
            serviceOffline();
        }
        else {            
            getAMSClassDnName();        
        }        
    }
}

function refreshMV(event){
    if(event.getTopic() == "DBFailed") {
        Log.debug("EXECUTE_PS PROCESS EXECUTION FAILED");		
        Log.debug("EVENT="+event);
    }
    else {
        Log.debug("EXECUTE_PS PROCESS EXECUTION SUCCESS");		
		var sql = "BEGIN REFRESH_ASSET_SKU_PROP('"+className+"'); END;";
        Log.debug("ASSET REFRESH MV="+sql);
        SQL(refreshMVResp, sql);
    }    	
}

function refreshMVResp(event){
    if(event.getTopic() == "DBFailed") {
        Log.debug("ASSET SKU MV REFRESH FAILED");
        Log.debug("EVENT="+event);
    }
    else {
        Log.debug("ASSET SKU MV REFRESH SUCCESS");
    }
}

function insertDataIntoGVS (){    
    finalSQL = mHeaderSQL+mBodySQL+mEndSQL;
    SQL(getResult, finalSQL);   
}

function getResult (event){
    mUpdateEvent = new Event("UpdateAMSResult","ATAMStoGVSDNSync2");
    mUpdateEvent.ams = amsName;
    mUpdateEvent.class = className;
    mUpdateEvent.dn = dnName;
    mUpdateEvent.mID = mID;
    mUpdateEvent.status = event.getTopic();
    mUpdateEvent.mTranscontext = mTranscontext;
    Publish(mUpdateEvent);
}

function goToNext(event){
    if(mProcessing >= 1000){		
        var sql = "BEGIN EXECUTE_PS('"+amsName+"','"+className+"',"+2+"); END;";
        Log.debug("PS Procedure SQL2 = "+sql);		
        SQL(refreshMV, sql);
        mProcessing = 1;
    }
    mID = '';
    mBodySQL = '';
    Publish(mEvent);    
}

function getFilterValue(value) {
    if(!value)
        return "";
    else if(value == "undefined")
        return "";
    else 
        return value;
}

function serviceOffline() {    
    Publish("StartAMSToGVSDNSync", "ATDNSyncScheduler");
    Unsubscribe("DataSync", mTranscontext);
    Unsubscribe("DataSyncUpdate", mTranscontext);
    mMapAMSClassDn = [];
    mID = '';
    amsName = '';
    className = '';
    dnName = '';
    mHeaderSQL = '';
    mBodySQL = '';
    mMapAMSClassDn;
    mMapAMSClassDnIndex = 0;
    mMapAMSClassDnSize = 0;
    mProcessing = 0;
    mAMSClass = '';
    mEndSQL = '';
    Exit();    
}