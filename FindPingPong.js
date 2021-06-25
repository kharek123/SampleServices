service = {
    GetPingPong: [getPingPong],
    ServiceOffline: [serviceOffline]    
};

var previousTag = "";
var previousLocation = "";
var currentTag = "";
var currentLocation = "";
var mPingPong = false;
var mReaderMessage = "";
var mBodyMessage = "";
var mMsg = "";
    

function getPingPong() {    
    SQLOptions("dn", "ORALocal");
    SQL(getTag, "select tag, location, count(*) from devicedata_observation2 group by tag, location order by tag desc");    
}

function getTag(eventList){    
    for(var index = 0; index < eventList.length; index++) 
    {      
        if (index ==0)
        {
            previousTag = eventList[index].TAG;
            previousLocation = eventList[index].LOCATION;            
        }
        else{            
            currentTag = eventList[index].TAG;
            currentLocation = eventList[index].LOCATION;
            if (previousTag == currentTag) {
                mPingPong = true;
                mReaderMessage += previousLocation+" : \r\n";
                if (index == eventList.length -1){
                    mReaderMessage += currentLocation+" : "+"DRM ["+"-----"+"] DRM Group ["+"-----"+"]\r\n";
                    mBodyMessage += "\r\nDRM Readpoint Activity Warning: Tag ID = "+previousTag+ "\r\n ----------------------------------------------------------------------\r\n"+mReaderMessage;
                    mReaderMessage = "";
                }
            }
            else {                
                if (mPingPong == true){
                    mReaderMessage += previousLocation+" : "+"DRM ["+"-----"+"] DRM Group ["+"-----"+"]\r\n";
                    mBodyMessage += "\r\nDRM Readpoint Activity Warning: Tag ID = "+previousTag+"\r\n ----------------------------------------------------------------------\r\n"+mReaderMessage;
                    mReaderMessage = "";
                }
                mPingPong = false;                              
            }
            previousTag = currentTag;
            previousLocation = currentLocation;            
        }         
    }    
    sendEmail(mBodyMessage);          
    serviceOffline();	    
}

function sendEmail(msg){
    mMsg = msg;
    peerId          = GetPeerId();    
    var d   = new Date();
    var datestring = ("0"+(d.getMonth()+1)).slice(-2) + "-" +("0" + d.getDate()).slice(-2)+"-"+d.getFullYear() + " [" + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2)+"]";    
    if (mMsg.indexOf("Tag") !== -1){
        Email(sub.to, sub.from, "Readpoint Activity Notification for "+peerId,
              "Dear Sir, \r\n\r\n" +
              "RSSI and Dense Reader Activity Analysis:"+datestring+"\r\n\r\n" +              
              "\r\n" + msg+
              "\r\n >> Recommend Enabling DRM on above readpoints and putting them in the same DRM Group." +
              "\r\n" +
              "\r\n" +
              "Yours sincerely,\r\n" + 
              "Omnitrol TaaS Administrator\r\n" +
              "admin_omnitrol@raytheon.com\r\n");        
    }
    else {
        Email(sub.to, sub.from, "Readpoint Activity Notification for "+peerId,
              "Dear Sir, \r\n\r\n" +
              "RSSI and Dense Reader Activity Analysis:"+datestring+"\r\n\r\n" +              
              "\r\n" +
              "\r\n >> There is no Ping Pong on this EVS. So no need to do anything." +
              "\r\n" +
              "\r\n" +
              "Yours sincerely,\r\n" + 
              "Omnitrol TaaS Administrator\r\n" +
              "admin_omnitrol@raytheon.com\r\n");
    }
    
}

function serviceOffline () {
    Exit();
    
}