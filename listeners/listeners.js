/**
 * This factory class handles the underlying implementation
 * of dispatching notifications
 * @type {*|exports}
 */
var config = require('../config.js');
var constants = require('../constants.js');
var kew = require('kew')
var clone = require('clone')
var date = new Date()
var dbUtils = require('../dbUtils')
var notificationFactory = require('../notifications/NotificationFactory')

var commonNofObj = {
    "is_clicked": false,
    "is_read": false
}

var dispatch = function (type, data) {
    switch (type) {
        case constants.events.newVacancy:
            dispatchNewVacancy(data)
            break;
        default:
        //limbo
    }
}

var dispatchNewVacancy = function (data) {
    console.log("hello")
    var nofObj = clone(commonNofObj)
    nofObj["title"] = "Naya Vacancy!"
    nofObj["redirect"] = constants.notifications.redirect.vacancies
    nofObj["text"] = "A new vacancy has been added! Dekho Dekho!"
    nofObj["id"] = data.id
    nofObj["created"] = date.getTime()
    //basically means all users
    dbUtils.getAllItems("users", "@path.kind:item")
        .then(function (results) {
            var gcmIds = results.map(function (result) {
                return result.gcmId
            })
            var inAppIds = results.map(function (result) {
                return result.id
            })
            notificationFactory.send(nofObj, constants.notifications.type.both, gcmIds, inAppIds)
        })
        .fail(function (err) {
            console.log("Error getting all users")
            console.log(err)
        })

}

module.exports = {
    dispatch: dispatch
}