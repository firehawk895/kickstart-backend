var express = require('express');
var router = express.Router();

var passport = require('passport');
var request = require('request');

var multer = require('multer');
var customUtils = require('../utils')

// var Notifications = require('../notifications');
// var notify = new Notifications();

var config = require('../config.js');

var oio = require('orchestrate');
oio.ApiEndPoint = config.db.region;
var db = oio(config.db.key);

var now = new Date().getTime()

var Firebase = require("firebase");
var feedbackRefUrl = config.firebase.url + "/FeedbackUpdated"

var userRef = new Firebase(feedbackRefUrl, config.firebase.secret);

// var EventSystem = require('../notifications/dispatchers');
var dbUtils = require('../dbUtils')
var kew = require('kew')

router.get('/', [passport.authenticate('bearer', {session: false}), function (req, res) {
    var query = req.query.query || ""

    //http://stackoverflow.com/questions/4374822/javascript-regexp-remove-all-special-characters#
    //remove all special characters
    query = query.replace(/[^\w\s]/gi, '')
    console.log("sanitized query : " + query)

    //if the query has a space, escape it, because lucene behaves weirdly!
    //https://dismantledtech.wordpress.com/2011/05/15/handling-spaces-in-lucene-wild-card-searches/#comment-229
    /**
     * Excerpt :
     * I tried to get around the issue using quotes, but to no avail –
     * a search term like ‘”SFP YGF”*’ isn’t parsed in the way that you’d expect,
     * and doesn’t produce the desired effect.
     * Adding a backslash makes the query parser interpret
     * the space character as being part of the search term,
     * and so a search for something like ‘SFP\ YGF\:\ FGY’ will return
     * everything that beings with the string “SFP YGP: FGY”.
     */

    var spaceEscapedQuery = query.replace(/\s/g, '\\ ')
    console.log("space escaped query")
    console.log(spaceEscapedQuery)

    var vacancyQueries = [
        dbUtils.createFuzzyQuery("jobTitle", spaceEscapedQuery),
        dbUtils.createFuzzyQuery("company", spaceEscapedQuery),
        dbUtils.createFuzzyQuery("trade", spaceEscapedQuery),
        dbUtils.createFuzzyQuery("location_name", spaceEscapedQuery),
    ]
    var finalVacancyQuery = dbUtils.queryJoinerOr(vacancyQueries)

    var jobseekerQueries = [
        dbUtils.createFuzzyQuery("name", spaceEscapedQuery),
        dbUtils.createFuzzyQuery("preferredTrades", spaceEscapedQuery),
        dbUtils.createFuzzyQuery("location_name", spaceEscapedQuery),
        dbUtils.createFuzzyQuery("mobile", spaceEscapedQuery)
    ]
    var finalJobseekerQuery = dbUtils.queryJoinerOr(jobseekerQueries)
    console.log(finalJobseekerQuery)

    var promises = [
        db.newSearchBuilder()
            .collection('vacancies')
            .limit(10)
            .offset(0)
            .query(finalVacancyQuery),
        db.newSearchBuilder()
            .collection('jobseekers')
            .limit(10)
            .offset(0)
            .query(finalJobseekerQuery),
    ]

    kew.all(promises)
        .then(function(results) {
            var response = {
                "vacancies" : dbUtils.injectId(results[0]),
                "jobseekers" : dbUtils.injectId(results[1])
            }
            res.send(response)
            res.status(200)
        })
        .fail(function(err) {
            customUtils.sendErrors([err.body.message], 422, res)
        })
}])


module.exports = router