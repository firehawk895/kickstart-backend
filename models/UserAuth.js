/**
 * There are 2 choices here:
 * let the methods handle the cases such as duplicate users etc.
 * or let the validation handle it.
 *
 * whats the call?
 * I'm choosing method encapsulation
 */
var config = require('../config.js');
var oio = require('orchestrate');
oio.ApiEndPoint = config.db.region;
var db = oio(config.db.key);
var dbUtils = require('../dbUtils')
var customUtils = require('../utils')

var date = new Date();
var kew = require('kew');

/**
 * The model method to signup/login a leader
 * @param name
 * @param mobile
 * @param otp
 * @returns {!Promise}
 */
function loginLeaderApi(name, mobile, otp) {
    var leaderPayload = kew.defer()
    var theLeaderData

    getUserByPhoneNumber
        .then(function (result) {
            var message = "Your OTP : " + otp
            var promises = [customUtils.sendSms(message, mobile)]
            if (result.body.total_count === 0) {
                promises.push(signUpLeader(name, mobile))
            } else {
                promises.push(getLeaderByMobile(name, mobile))
            }
            return kew.all(promises)
        })
        .then(function (results) {
            //results[0] - sms status
            //results[1] - leaderData
            theLeaderData = results[1]
            return createAuthToken()
            //return results[2]
        })
        .then(function (token) {
            theLeaderData["access_token"] = token
            leaderPayload.resolve(theLeaderData)
        })
        .fail(function (err) {
            leaderPayload.reject(err)
        })
    return leaderPayload
}

/**
 * model method to sign up an admin
 * @param name
 * @param mobile
 * @param password
 * @returns {!Promise}
 */
function  signUpAdmin(name, mobile, password) {
    var signedUpUser = kew.defer()

    var theUser
    checkIfNewUser
        .then(function (result) {
            var hashedPassword = bcrypt.hashSync(password, 8);
            var user = {
                "name": name,
                "mobile": mobile,
                "password": hashedPassword,
                "mobileVerified": false,
                "isVerified": false, //is he a verified admin user
                "last_seen": date.getTime(),
                "created": date.getTime(),
                isLeader: false,
                isAdmin: true
            };
            return db.post("users", user)
        })
        .then(function (result) {
            result["id"] = dbUtils.getIdAfterPost(result)
            theUser = result
        })
        .then(function(token) {
            theUser["access_taken"] = token
            signedUpUser.resolve(theUser)
        })
        .fail(function (err) {
            signedUpUser.reject(err)
        })
    return signedUpUser
}

function signUpLeader(name, mobile) {
    var newLeader = kew.defer()
    var user = {
        name: name,
        mobile: mobile,
        mobileVerified: false,
        isVerified: false, //is he a verified leader --> verification by kickstart team
        last_seen: date.getTime(),
        created: date.getTime(),
        isLeader: true,
        isAdmin: false
    };
    db.post("users", user)
        .then(function (result) {
            result["id"] = dbUtils.getIdAfterPost(result)
            newLeader.resolve(result)
        })
        .fail(function (err) {
            newLeader.reject(err)
        })
    return newLeader
}

function getLeaderByMobile(mobile) {
    return db.newSearchBuilder()
        .query(dbUtils.createFieldQuery("mobile", mobile))
        .limit(1)
        .then(function (results) {
            var theResults = dbUtils.injectId(results)
            return theResults[0]
        })
}

function getUserByPhoneNumber(mobile) {
    return db.newSearchBuilder()
        .collection('users')
        .query('mobile:`' + mobile + '`')
}

function checkIfNewUser(mobile) {
    return getUserByPhoneNumber
        .then(function (result) {
            if (result.body.total_count === 0)
                return kew.reject(new Error("User with that mobile number already exists"))
            else
                return kew.resolve("")
        })
}

function createAuthToken(userId) {
    var accessToken = customUtils.generateToken();
    var returnToken = kew.defer()
    db.put('tokens', accessToken, {
        "user": userId
    })
        .then(function (r) {
            return dbUtils.createGraphRelationPromise('tokens', accessToken, 'users', 'hasUser')
        })
        .then(function (r) {
            returnToken.resolve(accessToken)
        })
        .fail(function (err) {
            returnToken.reject(err)
        })
    return returnToken
}

module.exports = {
    loginLeaderApi: loginLeaderApi,
    signUpAdmin: signUpAdmin
}