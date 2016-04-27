var config = require('./config.js');
var oio = require('orchestrate');
oio.ApiEndPoint = config.db.region;
var db = oio(config.db.key);
var kew = require('kew');
var msg91 = require("msg91")(config.msg91.authkey, config.msg91.senderId, config.msg91.routeNumber);
var crypto = require('crypto');
var date = new Date()
var dbUtils = require('./dbUtils')
var fs = require('fs'),
    S3FS = require('s3fs'),
    s3fsImpl = new S3FS(config.s3.bucket, {
        accessKeyId: config.s3.access,
        secretAccessKey: config.s3.secret
    });
var request = require('request')
/**
 * calculate direct distance between two coordinates
 * Note: we are using direct distance not motorable distance
 * http://stackoverflow.com/questions/18883601/function-to-calculate-distance-between-two-coordinates-shows-wrong
 * @param lat1
 * @param lon1
 * @param lat2
 * @param lon2
 * @returns {number}
 */
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);  // deg2rad below
    var dLon = deg2rad(lon2 - lon1);
    var a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180)
}

// function sendErrors(errorArray, statusCode, res) {
//     /**
//      * include validations if required
//      * TODO: convert this to a mapped array of key : error
//      * That seems to be a more standard way of doing it these days
//      */
//     var responseObj = {}
//     responseObj["errors"] = errorArray;
//     res.status(statusCode);
//     res.json(responseObj);
// }

/**
 * Error response handler,
 * handles:
 *      new Error()
 *      orchestrate error
 *      quickblox error
 * @param err
 * @param res
 */
function getErrors(err) {
    var statusCode = 422
    var errorsArray = ["An unexpected error occured"]

    try {
        //some well thought out javascript here
        //err.body.message means undefined.message which throws an exception
        //but checking it in this manner (and knowing that "and" evaluations will ignore the rest 
        //if the first condition is false
        //this is as close to programming unagi you can get.

        //if already given an array
        // console.log("this is the error ----------")
        // console.log(err)
        // console.log("this is the error ----------")
        if (err.constructor === Array) {
            errorsArray = err
        } else if (err.body && err.body.message) {
            console.log("orchestrate error")
            //orchestrate new Error
            errorsArray = [err.body.message]
            console.log("bosdiwala orchestrate")
            console.log(err.statusCode)
            statusCode = err.statusCode
        } else if (err.detail) {
            //quickblox error
            /**
             * "obj": {
                "code": 403,
                "status": "403 Forbidden",
                "message": {
                  "errors": [
                    "You don't have appropriate permissions to perform this operation"
                  ]
                },
                "detail": [
                  "You don't have appropriate permissions to perform this operation"
                ]
                }
             */
            //TODO : stupid quickblox error that breaks this by have detail = null
            /**
             * {
              "errors": [
                {
                  "code": null,
                  "message": "Resource not found"
                }
              ],
              "obj": {
                "code": 404,
                "status": "404 Not Found",
                "message": {
                  "code": null,
                  "message": "Resource not found"
                },
                "detail": null
              }
            }
             */
            console.log("quickblox error")
            statusCode = err.code
            errorsArray = err.detail
        } else if (err.message) {
            console.log("javascript error")
            //javascript new Error
            errorsArray = [err.message]
        }
    } catch (e) {
        console.log("koi nae, non standard error hai")
    } finally {
        return {
            errorsArray : errorsArray,
            err : err,
            statusCode : statusCode
        }
    }
}

function sendErrors(err, res) {
    var responseObj = {}
    var data = getErrors(err)
    responseObj["errors"] = data.errorsArray
    responseObj["obj"] = data.err
    res.status(data.statusCode)
    res.json(responseObj)
}

function sendSms(message, phoneNumber) {
    var sentStatus = kew.defer()
    msg91.send(phoneNumber, message, function (err, response) {
        if (err) {
            sentStatus.reject(err)
        } else {
            sentStatus.resolve(response)
        }
    });
    return sentStatus
}

/**
 * Generate an access token for login
 * refer http://stackoverflow.com/questions/8855687/secure-random-token-in-node-js
 * can update to base64 if needed
 * @returns {string|*} access token
 * TODO : I think crypto is deprecated, upgrade it.
 * or just WTH, replace is with JsonWebToken
 */
function generateToken(length) {
    if (length)
        return crypto.randomBytes(length).toString('hex');
    else
        return crypto.randomBytes(16).toString('hex');
}

/**
 * Get a unix timestamp
 * (the standard is seconds btw)
 * and convert it to human readable format
 * @param unix_timestamp
 * @returns {string}
 */
function getFormattedDate(unix_timestamp) {
    var date = new Date(unix_timestamp * 1000);
    
// Hours part from the timestamp
    var hours = date.getHours();
// Minutes part from the timestamp
    var minutes = "0" + date.getMinutes();
// Seconds part from the timestamp
    var seconds = "0" + date.getSeconds();

// Will display time in 10:30:23 format
    var formattedTime = date.getDate() + "/" + date.getMonth() + "/" + date.getFullYear() + ", " +  hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
    return formattedTime
}

/**
 * inject the distance between the item and the user in km
 * @param results orchestrate response of matches
 * @param usersLat lat coordinates of the user
 * @param usersLong long coordinates of the user
 */
var insertDistance = function (results, usersLat, usersLong) {
    var newResults = results.body.results.map(function (aResult) {
        aResult["value"]["distance"] = getDistanceFromLatLonInKm(
            aResult["value"]["location"]["lat"],
            aResult["value"]["location"]["long"],
            usersLat,
            usersLong
        )
        return aResult;
    })
    results.body.results = newResults
    return results
}

var createHashMap = function(results) {
    var theMap = {}
    try {
        console.log("inside createhashMap")
        console.log(results)
        var injectedResults = dbUtils.injectId(results)
        console.log("injected")
        injectedResults.forEach(function(result) {
            theMap[result.id] = result
        })
        return theMap
    } catch(e) {
        request.post(config.newSlack.feedbackHook, {
            body: JSON.stringify({text: "*$" + e + "*"})
        })
        return theMap
    }
}

/**
 * Uploads file to S3
 * @param {file} file
 * @param {function} callback
 */
function upload(file, callback) {
    console.log(file)
    if (file != undefined) {
        var stream = fs.createReadStream(file.path);
        var randomString = generateToken(3)
        var originalname = file.originalname.replace(/[^\w.]/g, '_')
        var extension = originalname.match(/(\.[^.]+$)/)[0]
        var fileNameOnly = originalname.replace(/(\.[^.]+$)/, '')
        var filename = fileNameOnly + '_' + randomString + extension
        var thumb_filename = fileNameOnly + '_' + randomString + '.png'
        s3fsImpl.writeFile(filename, stream).then(function (data) {
            fs.unlink(file.path, function (err) {
                if (err) {
                    callback(err);
                }
                var info = {
                    url: "https://s3.amazonaws.com/" + config.s3.bucket + "/" + filename,
                    urlThumb: "https://s3.amazonaws.com/" + config.s3.bucket + "resized/resized-" + thumb_filename
                }
                callback(info);
            });
        });
    } else {
        callback(undefined);
    }
}

function stringToBoolean(theString) {
    if(theString === undefined)
        return undefined
    if (theString == "true")
        return true
    else
        return false
}

function myParseInt(string) {
    if(string===undefined)
        return undefined
    else
        return parseInt(string)
}

function myParseFloat(string) {
    if(string===undefined)
        return undefined
    else
        return parseFloat(string)
}

module.exports = {
    insertDistance : insertDistance,
    sendErrors : sendErrors,
    getErrors : getErrors,
    sendSms : sendSms,
    generateToken : generateToken,
    createHashMap : createHashMap,
    upload : upload,
    stringToBoolean : stringToBoolean,
    getFormattedDate : getFormattedDate,
    myParseInt : myParseInt,
    myParseFloat : myParseFloat
}