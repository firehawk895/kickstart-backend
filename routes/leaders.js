var express = require('express');
var router = express.Router();
var UserAuthModel = require('../models/UserAuth');
var customUtils = require('../utils')

router.post('/login', function (req, res) {
    //return the user data
    //if new create one, if old return the user
    //fire the OTP
    //TODO : throttle the OTP for the same number so that this API is not flooded
    var name = req.body.name
    var mobile = req.body.mobile
    var otp = req.body.otp

    UserAuthModel.loginLeaderApi(name, mobile, otp)
        .then(function (response) {
            res.send({
                data: response
            })
            res.status(200)
        })
        .fail(function (err) {
            customUtils.sendErrors(err, 422, res)
        })
})

router.get('/jobseekers', function(req, res) {

})