var express = require('express');
var router = express.Router();

var config = require('../config.js');
var oio = require('orchestrate');
oio.ApiEndPoint = config.db.region;
var db = oio(config.db.key);
var customUtils = require('../utils')
var passport = require('passport');
var dbUtils = require('../dbUtils')
var constants = require('../constants')

router.get('/', [passport.authenticate('bearer', {session: false}), function (req, res, next) {
    res.send({
        data: {
            trades: constants.trades,
            education: Object.keys(constants.education),
            communication: Object.keys(constants.communication),
            license: Object.keys(constants.license),
            computer: Object.keys(constants.computer),
            interviewStatus: Object.keys(constants.interviewStatus)
        }
    })
    res.status(200)
}])

module.exports = router