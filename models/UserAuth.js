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
var bcrypt = require('bcryptjs');

/**
 * The model method to signup/login a leader
 * @param name
 * @param mobile
 * @param otp
 * @returns {!Promise}
 */
function loginLeaderApi(name, mobile, otp) {
    var leaderPayloadPromise = kew.defer()
    var leaderPayload
    var message = "Your OTP : " + otp

    kew.all([getLeaderByPhoneNumber(mobile), customUtils.sendSms(message, mobile)])
        .then(function (results) {
            if (results[0].body.total_count === 0) {
                console.log("a new signUp is happening")
                return signUpLeader(name, mobile)
            } else {
                console.log("existing leader")
                return getLeaderByMobile(name, mobile)
            }
        })
        .then(function (results) {
            console.log("fir?")
            leaderPayload = results
            return createAuthToken(leaderPayload["id"])
        })
        .then(function (token) {
            leaderPayload["access_token"] = token
            leaderPayloadPromise.resolve(leaderPayload)
        })
        .fail(function (err) {
            leaderPayloadPromise.reject(err)
        })
    return leaderPayloadPromise
}

/**
 * model method to sign up an admin
 * @param name
 * @param mobile
 * @param password
 * @returns {!Promise}
 */
function signUpAdmin(name, mobile, password) {
    var signedUpUser = kew.defer()
    var theUser

    checkIfNewUser(mobile)
        .then(function (isNewUser) {
            console.log("abbey")
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
            theUser = user
            theUser.password = undefined
            return db.post("users", user)
        })
        .then(function (result) {
            theUser["id"] = dbUtils.getIdAfterPost(result)
        })
        .then(function (token) {
            theUser["access_taken"] = token
            signedUpUser.resolve(theUser)
        })
        .fail(function (err) {
            console.log("insta fail")
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
            user["id"] = dbUtils.getIdAfterPost(result)
            console.log(user)
            //user["id"] = dbUtils.getIdAfterPost(result)
            newLeader.resolve(user)
        })
        .fail(function (err) {
            console.log("post user failed")
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
        .query('value.mobile:`' + mobile + '`')
}

function getLeaderByPhoneNumber(mobile) {
    return db.newSearchBuilder()
        .collection('users')
        .query('value.mobile:`' + mobile + '` AND value.isAdmin:`false`')
}

function checkIfNewUser(mobile) {
    console.log("ya")
    var newUser = kew.defer()
    getUserByPhoneNumber(mobile)
        .then(function (result) {
            console.log("the result")
            if (result.body.total_count === 0) {
                console.log("no ways")
                newUser.resolve("")
            } else {
                console.log("yes ways")
                newUser.reject("The user already exists")
            }
        })
        .fail(function (err) {
            console.log("how")
            console.log(err)
            newUser.reject(err)
        })
    return newUser
}

function createAuthToken(userId) {
    var accessToken = customUtils.generateToken();
    var returnToken = kew.defer()
    db.put('tokens', accessToken, {
        "user": userId
    })
        .then(function (r) {
            return dbUtils.createGraphRelationPromise('tokens', accessToken, 'users', userId, 'hasUser')
        })
        .then(function (r) {
            returnToken.resolve(accessToken)
        })
        .fail(function (err) {
            console.log("failed here")
            returnToken.reject(err)
        })
    return returnToken
}

module.exports = {
    loginLeaderApi: loginLeaderApi,
    signUpAdmin: signUpAdmin
}