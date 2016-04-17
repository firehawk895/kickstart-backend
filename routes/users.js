var express = require('express');
var router = express.Router();
var UserAuthModel = require('../models/UserAuth');
var customUtils = require('../utils')

router.post('/signup', function (req, res, next) {
    var name = req.body.name
    var mobile = req.body.mobile
    var password = req.body.password
    
    console.log(password)

    UserAuthModel.signUpAdmin(name, mobile, password)
        .then(function(response) {
            res.send({
                data: response
            })
            res.status(200)
        })
        .fail(function(err) {
            customUtils.sendErrors(err, 422, res)
        })
})

router.post('/login', function (req, res, next) {
    var mobile = req.body.mobile
    var password = req.body.password

    UserAuthModel.loginAdmin(mobile, password)
        .then(function(response) {
            res.send({
                data: response
            })
            res.status(200)
        })
        .fail(function(err) {
            customUtils.sendErrors(err, res)
        })
})

module.exports = router