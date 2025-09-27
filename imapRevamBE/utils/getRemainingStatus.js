function getRemainingStatus(lastRow, fallBackRemainingStatus){
    if(lastRow){
        return JSON.stringify(lastRow.remaining_status || "[]")
    }
    else{
        return fallBackRemainingStatus || "[]"
    }
}

module.exports=getRemainingStatus