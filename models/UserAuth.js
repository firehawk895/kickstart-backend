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
                console.log("sign up time")
                return signUpLeader(name, mobile)
            } else {
                console.log("getLeaderTime")
                return getLeaderByMobile(mobile)
            }
        })
        .then(function (results) {
            console.log("fir?")
            leaderPayload = results
            console.log(leaderPayload)
            return createAuthToken(leaderPayload["id"])
        })
        .then(function (token) {
            leaderPayload["access_token"] = token
            leaderPayloadPromise.resolve(leaderPayload)
            updateLastSeen(leaderPayload["id"])
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
            console.log("ssup")
            console.log(isNewUser)
            console.log("abbey")
            console.log(password)
            var hashedPassword = bcrypt.hashSync(password, 8);
            console.log("abbey2")
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
            // console.log("user payload being posted")
            // console.log(user)
            return db.post("users", theUser)
            console.log("here1")
        })
        .then(function (result) {
            console.log("here2")
            theUser["id"] = dbUtils.getIdAfterPost(result)
        })
        .then(function (token) {
            console.log("here3")
            theUser["access_token"] = token
            theUser["password"] = undefined
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
    console.log("the mobile being searched for " + mobile)
    var leader = kew.defer()
    db.newSearchBuilder()
        .query(dbUtils.createFieldQuery("mobile", mobile))
        .then(function (results) {
            console.log("inisde newSearchBuilder")
            console.log(results.body)
            var theResults = dbUtils.injectId(results)
            leader.resolve(theResults[0])
        })
        .fail(function (err) {
            leader.reject(err)
        })
    return leader
}

function loginAdmin(mobile, password) {
    console.log("the mobile being searched for " + mobile)
    var admin = kew.defer()
    db.newSearchBuilder()
        .query(dbUtils.createFieldQuery("mobile", mobile))
        .then(function (results) {
            if (results.body.count == 1) {
                var theResults = dbUtils.injectId(results)
                
                if (theResults[0].isAdmin) {
                    var hash = theResults[0].password;
                    if (bcrypt.compareSync(password, hash)) {
                        createAuthToken(theResults[0].id)
                            .then(function (result) {
                                var theAdmin = theResults[0]
                                theAdmin.password = undefined
                                theAdmin["access_token"] = result
                                admin.resolve(theAdmin)
                            })
                            .fail(function (err) {
                                admin.reject(err)
                            })
                    }
                    else admin.reject(new Error("Incorrect password"))
                } else {
                    admin.reject(new Error("The registered user is not an admin"))
                }
            } else {
                admin.reject(new Error("user not found"))
            }
        })
        .fail(function (err) {
            admin.reject(err)
        })
    return admin
}

function getUserByPhoneNumber(mobile) {
    return db.newSearchBuilder()
        .collection('users')
        .query('value.mobile:`' + mobile + '`')
}

function getLeaderByPhoneNumber(mobile) {
    console.log("getLeaderByPhoneNumber")
    console.log("mobile : " + mobile)
    // return db.newSearchBuilder()
    //     .collection('users')
    //     .query('value.mobile:`' + mobile + '` AND value.isAdmin:`false`')
    return db.newSearchBuilder()
        .collection('users')
        .query('value.mobile:`' + mobile)
}

function checkIfNewUser(mobile) {
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

function updateLastSeen(userId) {
    db.newPatchBuilder("users", userId)
        .replace("value.last_seen", date.getTime())
        .then(function (results) {
            console.log("last seen updated")
        })
        .fail(function (err) {
            console.log("last seen update failed")
        })
}

module.exports = {
    loginLeaderApi: loginLeaderApi,
    signUpAdmin: signUpAdmin,
    loginAdmin: loginAdmin
}