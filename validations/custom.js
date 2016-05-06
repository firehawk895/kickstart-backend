var validator = require('validator')
var UserAuthModel = require('../models/UserAuth')
module.exports = {
    customValidators: {
        isLatLong: function (latOrLong) {
            var regex = /^-?([1-8]?[1-9]|[1-9]0)\.{1}\d{1,6}/
            return latOrLong.match(regex) ? true : false
        },
        isImage: function (mimetype) {
            return mimetype.match(/^image/)
        },
        isValidInterviewDate: function (value) {
            var result = true
            //expected value has more than 1 interview date
            //and is an array
            if (Array.isArray(value)) {
                value.forEach(function (aValue) {
                    if (!validator.isInt(aValue)) {
                        console.log("not an int")
                        result = false
                    }
                })
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
        }
    }
}