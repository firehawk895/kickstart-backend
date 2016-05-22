var validator = require('validator')
var UserAuthModel = require('../models/UserAuth')
var JobseekerModel = require('../models/Jobseeker')
module.exports = {
    customValidators: {
        isLat : function (lat) {
            var valid = false
            if(validator.isDecimal(lat)) {
                var latNumber = parseFloat(lat)
                if(latNumber >= -90 && latNumber <= 90)
                    valid = true
            }
            return valid
        },
        isLong : function (long) {
            var valid = false
            if(validator.isDecimal(long)) {
                var longNumber = parseFloat(long)
                if(longNumber >= -180 && longNumber <= 180)
                    valid = true
            }
            return valid
        },
        isImage: function (file) {
            return file.mimetype.match(/^image/)
        },
        isValidInterviewDate: function (value) {
            function hasDuplicates(array) {
                return (new Set(array)).size !== array.length;
            }
            
            var result = true
            //expected value has more than 1 interview date
            //and is an array
            if (Array.isArray(value)) {
                if(hasDuplicates(value))
                    return false
                else {
                    value.forEach(function (aValue) {
                        if (!validator.isInt(aValue)) {
                            console.log("not an int")
                            result = false
                        }
                    })
                }
            } else {
                //expected input has 1 value from request body
                //and is not an array
                result = validator.isInt(value)
            }
            return result
        },
        isNewUser : function(mobile) {
            console.log("isNewUser time")
            return new Promise(function (resolve, reject) {
                UserAuthModel.checkIfNewUser(mobile)
                    .then(function (results) {
                        console.log("resolved and fucekd")
                        resolve(results)
                    })
                    .fail(function(err) {
                        console.log("rejected and proceeds")
                        reject(err)
                    })
            })
        },
        isNewJobseeker : function(mobile) {
            console.log("custom validation : isNewJobseeker")
            return new Promise(function (resolve, reject) {
                JobseekerModel.checkIfNewUser(mobile)
                    .then(function (results) {
                        console.log("resolved and fucekd")
                        resolve(results)
                    })
                    .fail(function(err) {
                        console.log("rejected and proceeds")
                        reject(err)
                    })
            })
        },
    }
}