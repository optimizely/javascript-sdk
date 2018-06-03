var ExceptionSpot = require("./exception_spot");

function FaultInjectionManager() {
    var activeInspectionSpot = ExceptionSpot.none;
    var isFaultInjectionEnabled = true;
    var isTreatmentEnabled = true;

    this.injectFault = function (spot) {
        if(isFaultInjectionEnabled && spot === activeInspectionSpot) {
            throw error("injectedFault");
        }
    };
    
    this.throwExceptionIfTreatmentDisabled = function () {
        if(!isTreatmentEnabled) {
            throw error("injectedFault");
        }
    };
    
    this.getAllExceptionSpots = function () {
        var spots = [];
        var spotObj = ExceptionSpot;
        for( var key in spotObj) {
            if(spotObj.hasOwnProperty(key)) {
                spots.push(spotObj[key]);
            }
        }
        return spots;
    };

    this.setActiveInjectionSpot = function (spot) {
        activeInspectionSpot = spot;
    }
}

var instance = new FaultInjectionManager();

module.exports = instance;