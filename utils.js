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

function sendErrors(errorArray, statusCode, res) {
    /**
     * include validations if required
     * TODO: convert this to a mapped array of key : error
     * That seems to be a more standard way of doing it these days
     */
    var responseObj = {}
    responseObj["errors"] = errorArray;
    res.status(statusCode);
    res.json(responseObj);
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
    console.log("inside createhashMap")
    console.log(results)
    var injectedResults = dbUtils.injectId(results)
    console.log("injected")
    var theMap = {}
    injectedResults.forEach(function(result) {
        theMap[result.id] = result
    })
    return theMap
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
    if (theString == "true") {
        return true;
    } else {
        return false;
    }
}

module.exports = {
    insertDistance : insertDistance,
    sendErrors : sendErrors,
    sendSms : sendSms,
    generateToken : generateToken,
    createHashMap : createHashMap,
    upload : upload,
    stringToBoolean : stringToBoolean
}