var express = require('express');
var router = express.Router();
var UserAuthModel = require('../models/UserAuth');
var LeaderModel = require('../models/Leader');
var customUtils = require('../utils')
var config = require('../config')
var passport = require('passport')
var dbUtils = require('../dbUtils')
var oio = require('orchestrate');
oio.ApiEndPoint = config.db.region;
var db = oio(config.db.key);

router.post('/login', function (req, res) {
    //return the user data
    //if new create one, if old return the user
    //fire the OTP
    //TODO : throttle the OTP for the same number so that this API is not flooded
    var otp = req.body.otp

    var validations = LeaderModel.validatePostLogin(req)
    var errors = validations.errors
    var leaderPayload = validations.req.body

    console.log("otp alert --- " + otp)
    if (errors) {
        customUtils.sendErrors(errors, res)
    } else {
        UserAuthModel.loginLeaderApi(leaderPayload.name, leaderPayload.mobile, otp, req.body.location_name, req.body.lat, req.body.lat)
            .then(function (response) {
                res.send({
                    data: response
                })
                res.status(200)
            })
            .fail(function (err) {
                customUtils.sendErrors(err, res)
            })
    }
})

router.post('/', [passport.authenticate('bearer', {session: false}), function (req, res) {
    LeaderModel.validatePostLeaderPromise(req)
        .then(function (validations) {
            var errors = validations.errors
            var leaderPayload = validations.req.body
            console.log("checking life out")
            console.log(leaderPayload)

            console.log("inside then of validatePostLeaderPromise")
            if (errors) {
                customUtils.sendErrors(errors, res)
            } else {
                UserAuthModel.signUpLeader(leaderPayload.name, leaderPayload.mobile, leaderPayload.location_name, leaderPayload.lat, leaderPayload.long)
                    .then(function (response) {
                        res.send({
                            data: response
                        })
                        res.status(200)
                    })
                    .fail(function (err) {
                        customUtils.sendErrors(err, res)
                    })
            }
        })
        .fail(function (err) {
            console.log("limbo")
            console.log(err)
        })
}])

router.patch('/', [passport.authenticate('bearer', {session: false}), function (req, res) {
    LeaderModel.validatePatchLeaderPromise(req)
        .then(function (validations) {
            var errors = validations.errors
            var sanitizedPayload = validations.req.body

            if (errors) {
                customUtils.sendErrors(errors, res)
            } else {
                if(req.body.isVerified && req.body.isVerified == false) {
                    console.log("time to delete user " + req.query.id + "'s tokens")
                    LeaderModel.deleteAllTokens(req.query.id)
                }
                db.merge('users', req.query.id, sanitizedPayload)
                    .then(function (result) {
                        return db.get("users", req.query.id)
                    })
                    .then(function (result) {
                        console.log("whats up here")
                        var theLeader = result.body
                        theLeader["id"] = req.query.id

                        res.send({
                            data: [theLeader]
                        })
                        res.status(201)
                    })
                    .fail(function (err) {
                        customUtils.send(err, res)
                    })
            }
        })
        .fail(function (err) {
            console.log("limbo")
            console.log(err)
        })
}])

router.get('/', [passport.authenticate('bearer', {session: false}), function (req, res) {
    var limit = req.query.limit || 100
    var page = req.query.page || 1
    var offset = limit * (page - 1)

    console.log(limit)
    console.log(offset)

    var responseObj = {}
    var queries = []

    queries.push("value.isAdmin:false")
    if (req.query.id) {
        console.log("we have a specific leader's id query")
        queries.push(dbUtils.createSearchByIdQuery(req.query.id))
    }

    var theFinalQuery = dbUtils.queryJoiner(queries)

    db.newSearchBuilder()
        .collection("users")
        .limit(limit)
        .offset(offset)
        //.sort('location', 'distance:asc')
        .sortBy('@path.reftime:desc')
        .query(theFinalQuery)
        .then(function (results) {
            responseObj["total_count"] = results.body.total_count
            responseObj["data"] = dbUtils.injectId(results)
            res.status(200)
            res.json(responseObj)
        })
        .fail(function (err) {
            customUtils.sendErrors(err, res)
        })
}])

router.delete('/', [passport.authenticate('bearer', {session: false}), function (req, res) {
    var id = req.query.id

    db.remove('users', id, true)
        .then(function (result) {
            res.status(200);
            res.json({data: {}, msg: "Delete successful"});
        })
        .fail(function (err) {
            console.log("Error")
            console.log(err)
            customUtils.sendErrors(err, res)
        })
}])

//moved to jobseeker API
//router.get('/jobseekers', [passport.authenticate('bearer', {session: false}), function (req, res) {
//    var leaderId = req.user.results[0].value.id;
//
//
//    LeaderModel.getLeadersJobseekers(leaderId)
//        .then(function (response) {
//            res.send({
//                data: response
//            })
//        })
//        .fail(function (err) {
//            customUtils.sendErrors(err, 422, res)
//        })
//}])

module.exports = router