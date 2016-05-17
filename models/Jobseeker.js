var config = require('../config.js');
var oio = require('orchestrate');
oio.ApiEndPoint = config.db.region;
var db = oio(config.db.key);
var dbUtils = require('../dbUtils')
var constants = require('../constants')
var customUtils = require('../utils')
var kew = require('kew')

function create(leaderId, jobseekerPayload) {
    var createdJobSeekerPromise = kew.defer()
    db.post("jobseekers", jobseekerPayload)
        .then(function (result) {
            console.log("hey yo")
            var jobseekerId = dbUtils.getIdAfterPost(result)
            jobseekerPayload["id"] = jobseekerId
            console.log("las hey")
            return kew.all([
                dbUtils.createGraphRelationPromise('users', leaderId, 'jobseekers', jobseekerId, constants.graphsRelations.leader.myJobseekers),
                dbUtils.createGraphRelationPromise('jobseekers', jobseekerId, 'users', leaderId, constants.graphsRelations.jobseekers.myLeader)
            ])
        })
        .then(function (results) {
            createdJobSeekerPromise.resolve(jobseekerPayload)
        })
        .fail(function (err) {
            createdJobSeekerPromise.reject(err)
        })
    return createdJobSeekerPromise
}

function getTheLeader(jobseekerId) {
    var leaderId = kew.defer()
    db.get("jobseekers", jobseekerId)
        .then(function (jobseeker) {
            leaderId.resolve(jobseeker.body.leaderId)
        })
        .fail(function (err) {
            leaderId.reject(err)
        })
    return leaderId
}

function injectLeader(jobseekerResults) {
    var injectedJobseeker = kew.defer()
    var leaderIds = extractLeaderIds(jobseekerResults)

    dbUtils.getAllResultsFromList("users", leaderIds)
        .then(function (results) {
            var leaderMap = customUtils.createHashMap(results)
            jobseekerResults.body.results = jobseekerResults.body.results.map(function (anItem) {
                anItem.value["leader"] = leaderMap[anItem.value.leaderId]
                return anItem
            })
            injectedJobseeker.resolve(jobseekerResults)
        })
        .fail(function (err) {
            injectedJobseeker.reject(err)
        })
    return injectedJobseeker
}

function extractLeaderIds(results) {
    var leaderIds = []

    function pushUnique(item) {
        if (leaderIds.indexOf(item) > -1) {
            //dont push
        } else {
            leaderIds.push(item)
        }
    }

    results.body.results.forEach(function (item) {
        pushUnique(item.value.leaderId)
    })

    return leaderIds
}

function getUserByPhoneNumber(mobile) {
    return db.newSearchBuilder()
        .collection('jobseekers')
        .query('value.mobile:`' + mobile + '`')
}

function checkIfNewUser(mobile) {
    console.log("checkIfNewUser")
    var newUser = kew.defer()
    getUserByPhoneNumber(mobile)
        .then(function (result) {
            console.log("examine this")
            console.log(result.body)
            if (result.body.total_count == 0) {
                newUser.resolve("")
            } else {
                newUser.reject(new Error("The user already exists"))
            }
        })
        .fail(function (err) {
            console.log("how")
            console.log(err)
            newUser.reject(err)
        })
    return newUser
}

function incrementInterviews(jobseekerId) {
    return db.newPatchBuilder('jobseekers', jobseekerId)
        .inc('interview_count', 1)
        .apply()
}

function validatePostPromise(req) {
    console.log("validatePost")
    var validation = require('../validations/jobseeker')
    return customUtils.validateMePromise(req, validation, sanitizePostPayload)
}

function validatePatchPromise(req) {
    var patchSchema = require('../validations/jobseeker_patch')
    return customUtils.validateMePromise(req, patchSchema, sanitizePatchPayload)
}

/**
 * @param educationLevel
 * @returns {string}
 */
function createEducationQuery(educationLevel) {
    return dbUtils.createGreaterLevelQueries("educationLevel",constants.education, educationLevel)
}

function createCommunicationQuery(communicationLevel) {
    return dbUtils.createGreaterLevelQueries("communication",constants.communication, communicationLevel)
}

function createLicenseQuery(licenseLevel) {
    return dbUtils.createGreaterLevelQueries("license",constants.license, licenseLevel)
}

function createComputerQuery(computerLevel) {
    return dbUtils.createGreaterLevelQueries("computer",constants.computer, computerLevel)
}

function createHasSmartPhoneQuery(hasSmartphone) {
    return "value.hasSmartphone:" + hasSmartphone
}

function createHasBikeQuery(hasBike) {
    return "value.hasBike:" + hasBike
}

function createTradeQuery(trade) {
    return dbUtils.createFieldQuery("trade", trade)
}

var sanitizePostPayload = function (reqBody) {
    var hasSelectedTrades = false
    var jobSeekerPayload = {
        name: reqBody.name,
        mobile: reqBody.mobile,
        educationLevel: reqBody.educationLevel,
        mobileVerified: false,
        interview_count: 0,
        location_name: reqBody.location_name,
        location: {
            lat: customUtils.myParseFloat(reqBody.lat),
            long: customUtils.myParseFloat(reqBody.long)
        },
        gender: reqBody.gender,
        hasSelectedTrades: false,
        dateOfBirth: customUtils.myParseInt(reqBody.dateOfBirth),
        lastSalary: customUtils.myParseInt(reqBody.lastSalary),
        communication: reqBody.communication,
        hasBike: customUtils.stringToBoolean(reqBody.hasBike),
        license: reqBody.license,
        hasSmartphone: customUtils.stringToBoolean(reqBody.hasSmartphone),
        computer: reqBody.computer,
        trades: {},
        comments: reqBody.comments,
        leaderId: reqBody.leaderId, //denormalized for easy search, but graph relationships included
        // avatar: ((theImageInS3) ? theImageInS3.url : ""),
        // avatarThumb: ((theImageInS3) ? theImageInS3.urlThumb : "")
    }

    constants.trades.forEach(function (trade) {
        if (reqBody[trade]) {
            hasSelectedTrades = true
            jobSeekerPayload["trades"][trade] = reqBody[trade]
        }
    })

    jobSeekerPayload["hasSelectedTrades"] = hasSelectedTrades
    return jobSeekerPayload
}

var sanitizePatchPayload = function (reqBody) {
    var jobSeekerPayload = {
        name: reqBody.name,
        mobile: reqBody.mobile,
        educationLevel: reqBody.educationLevel,
        mobileVerified: customUtils.stringToBoolean(reqBody.mobileVerified),
        // interview_count: 0, --> this will be auto updated now
        location_name: reqBody.location_name,
        location: {
            lat: customUtils.myParseFloat(reqBody.lat),
            long: customUtils.myParseFloat(reqBody.long)
        },
        gender: reqBody.gender,
        // hasSelectedTrades: false, --> will always be true
        dateOfBirth: customUtils.myParseInt(reqBody.dateOfBirth),
        lastSalary: customUtils.myParseInt(reqBody.lastSalary),
        communication: reqBody.communication,
        hasBike: customUtils.stringToBoolean(reqBody.hasBike),
        license: reqBody.license,
        hasSmartphone: customUtils.stringToBoolean(reqBody.hasSmartphone),
        computer: reqBody.computer,
        trades: {},
        comments: reqBody.comments,
        leaderId: reqBody.leaderId, //denormalized for easy search, but graph relationships included
        // avatar: ((theImageInS3) ? theImageInS3.url : ""),
        // avatarThumb: ((theImageInS3) ? theImageInS3.urlThumb : "")
    }

    constants.trades.forEach(function (trade) {
        if (reqBody[trade]) {
            jobSeekerPayload["trades"][trade] = reqBody[trade]
        }
        else
            jobSeekerPayload["trades"][trade] = null //ensures an old key is deleted
        // (not required, expect front end to send all trades again)
    })
    return jobSeekerPayload
}


function createTradeQuery(trade) {
    return dbUtils.createExistsQuery("value.trades." + trade)
}

module.exports = {
    create: create,
    incrementInterviews: incrementInterviews,
    getTheLeader: getTheLeader,
    injectLeader: injectLeader,
    checkIfNewUser: checkIfNewUser,
    createTradeQuery: createTradeQuery,
    validatePostPromise: validatePostPromise,
    validatePatchPromise: validatePatchPromise,
    createEducationQuery : createEducationQuery,
    createCommunicationQuery : createCommunicationQuery,
    createLicenseQuery : createLicenseQuery,
    createComputerQuery : createComputerQuery,
    createHasSmartPhoneQuery : createHasSmartPhoneQuery,
    createHasBikeQuery : createHasBikeQuery,
    createTradeQuery : createTradeQuery
}