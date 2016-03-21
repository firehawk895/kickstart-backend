var config = require('../config.js');
var oio = require('orchestrate');
oio.ApiEndPoint = config.db.region;
var db = oio(config.db.key);
var dbUtils = require('../dbUtils')
var customUtils = require('../utils')
var constants = require('../constants')

var date = new Date();
var kew = require('kew');

function getLeadersJobseekers(leaderId) {
    dbUtils.getGraphResultsPromise('users', leaderId, cons)
}