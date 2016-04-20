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

router.post('/', [passport.authenticate('bearer', {session: false}), function (req, res, next) {
    var trade = req.body.trade
    var payload = {
        name: req.body.trade
    }

    db.post("trades", payload)
        .then(function (result) {
            res.send({
                data: payload
            })
            res.status(200)
        })
        .fail(function (err) {
            customUtils.sendErrors([err.body.message], 422, res)
        })

}])

router.get('/', [passport.authenticate('bearer', {session: false}), function (req, res, next) {
    db.list("trades")
        .then(function (results) {
            res.send({
                data: {
                    trades : dbUtils.injectId(results),
                    education : Object.keys(constants.education),
                    communication : constants.communication,
                    license : constants.license,
                    computer : constants.computer
                }
            })
            res.status(200)
        })
        .fail(function (err) {
            customUtils.sendErrors([err.body.message], 422, res)
        })
}])

router.patch('/', [passport.authenticate('bearer', {session: false}), function (req, res, next) {
    var tradeId = req.query.id
    var payload = {
        name: req.body.trade
    }

    //TODO: validation - if exists

    db.merge("trades", tradeId, payload)
        .then(function (result) {
            res.send({
                data: payload
            })
            res.status(200)
        })
        .fail(function (err) {
            customUtils.sendErrors([err.body.message], 422, res)
        })
}])

router.delete('/', [passport.authenticate('bearer', {session: false}), function (req, res, next) {
    var tradeId = req.query.id

    db.remove('trades', tradeId, true)
        .then(function (result) {
            res.send({
                data: {}
            })
            res.status(200)
        })
        .fail(function (err) {
            customUtils.sendErrors([err.body.message], 422, res)
        })
}])

module.exports = router