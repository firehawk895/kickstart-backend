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
    var name = req.body.name
    var mobile = req.body.mobile
    var otp = req.body.otp

    console.log("the request body")
    console.log(mobile)

    UserAuthModel.loginLeaderApi(name, mobile, otp)
        .then(function (response) {
            res.send({
                data: response
            })
            res.status(200)
        })
        .fail(function (err) {
            console.log("login leader error")
            console.log(err)
            customUtils.sendErrors(err, 422, res)
        })
})

router.patch('/', [passport.authenticate('bearer', {session: false}), function (req, res) {
    var sanitizedPayload = {
        name : req.body.name,
        mobile : req.body.mobile
    }
    
    var responseObj = {}
    db.merge('users', req.query.id, sanitizedPayload)
        .then(function (result) {
            sanitizedPayload["id"] = result.headers.location.match(/[0-9a-z]{16}/)[0];
            responseObj["data"] = sanitizedPayload
            res.status(201);
            res.json(responseObj);
        })
        .fail(function (err) {
            customUtils.send(err, res)
        })
}])

router.get('/', [passport.authenticate('bearer', {session: false}), function (req, res) {
    console.log("get facilities")
    var limit = req.query.limit || 100
    var page =  req.query.page || 1
    var offset = limit * (page - 1)

    console.log(limit)
    console.log(offset)

    var responseObj = {}
    var queries = []

    queries.push("value.isAdmin:false")
    if (req.query.id) {
        console.log("we have a specific facilityId query")
        queries.push(dbUtils.createSearchByIdQuery(req.query.id))
    }

    var theFinalQuery = dbUtils.queryJoiner(queries)

    db.newSearchBuilder()
        .collection("users")
        .limit(limit)
        .offset(offset)
        //.sort('location', 'distance:asc')
        .query(theFinalQuery)
        .then(function (results) {
            responseObj["total_count"] = results.body.total_count
            responseObj["data"] = dbUtils.injectId(results)
            res.status(200)
            res.json(responseObj)
        })
        .fail(function (err) {
            responseObj["errors"] = [err.body.message]
            res.status(503)
            res.json(responseObj)
        })
}])

router.delete('/', [passport.authenticate('bearer', {session: false}), function (req, res) {
    var id = req.query.id

    db.remove('users', id, true)
        .then(function(result) {
            res.status(200);
            res.json({data:{}, msg : "Delete successful"});
        })
        .fail(function(err) {
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