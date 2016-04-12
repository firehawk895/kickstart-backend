var express = require('express');
var router = express.Router();
var UserAuthModel = require('../models/UserAuth');
var LeaderModel = require('../models/Leader');
var customUtils = require('../utils')
var passport = require('passport')

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