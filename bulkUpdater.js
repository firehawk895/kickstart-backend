var express = require('express');
var router = express.Router();
var fs = require('fs')
var dbUtils = require('./dbUtils')
var constants = require('./constants')

var config = require('./config.js');
var oio = require('orchestrate');
oio.ApiEndPoint = config.db.region;
var db = oio(config.db.key);
var kew = require('kew');
var multer = require('multer');

console.log("when")
db.list("vacancies", {limit: 100})
    .then(function(results) {
        console.log("what")
        var vacancyIds = dbUtils.injectId(results).map(function(result) {
            return result.id
        })
        vacancyIds.forEach(function(id) {
            db.merge("vacancies", id, {
                interview_dates: [
                    "1464015600000",
                    "1464102000000",
                    "1464188400000",
                    "1464274800000",
                    "1464361200000"
                ]
            })
                .then(function(result) {
                    console.log("sahi hai")
                })
                .fail(function(err) {
                    console.log(err)
                })
        })
    })
    .fail(function(err) {
        console.log(err)
    })