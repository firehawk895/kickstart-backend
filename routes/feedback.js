var express = require('express');
var router = express.Router();

var passport = require('passport');
var request = require('request');

var multer = require('multer');

var config = require('../config.js');
var customUtils = require('../utils.js');

var oio = require('orchestrate');
oio.ApiEndPoint = config.db.region;
var db = oio(config.db.key);

var now = new Date().getTime()

var Firebase = require("firebase");
var feedbackRefUrl = config.firebase.url + "/FeedbackUpdated"

var userRef = new Firebase(feedbackRefUrl, config.firebase.secret);

/**
 * Register a listener for a user
 */
userRef.on("child_added", function (snapshot) {
    var username = snapshot.key()
    var messageRef = new Firebase(feedbackRefUrl + "/" + username, config.firebase.secret)
    /**
     * Register a listener for a user's message
     * */
    messageRef.on("child_added", function (snapshot) {
        var messageObj = snapshot.val()
        /**
         * when the server starts, dispatch messages
         * of timestamp 1 minute before the current time
         * */
        if (messageObj.timestamp > (now - 60)) {
            /**
             * The Message from Pyoopil, or the slack channel
             * should not be resent back to the channel
             * */
            if (messageObj.displayName != "Pyoopil") {
                request.post(config.newSlack.feedbackHook, {
                    body: JSON.stringify({text: "*$" + username + " : " + messageObj.text + "*"})
                })
            }
        }
    })
})

router.post('/', multer(), function (req, res) {

    var messageFromSlack = req.body.text
    console.log(messageFromSlack)
    var alreadyPostedInSlack = messageFromSlack.match(/^\*/);
    console.log(alreadyPostedInSlack)

    if (!alreadyPostedInSlack) {
        console.log("accepted")
        var dollarMatcher = messageFromSlack.match(/\$([a-zA-Z0-9_-]+)\:(.*)/);
        //var everyone = messageFromSlack.match(/\$Everyone\:(.*)/);
        //var classroom = messageFromSlack.match(/\$Path-([A-Za-z0-9]+)\:(.*)/);

        if (dollarMatcher) {
            console.log("matched -- ready to fire")
            /**
             * Time to send it to firebase
             * */
            var username = dollarMatcher[1];
            var thisUsersRefUrl = feedbackRefUrl + "/" + username
            var thisUsersRef = new Firebase(thisUsersRefUrl, config.firebase.secret)

            var date = new Date()
            var time = date.getTime()
            var messageObj = {
                displayName: "Pyoopil",
                text: dollarMatcher[2],
                timestamp: time
            }

            thisUsersRef.push().set(messageObj, function (error) {
                var notifObj = {
                    "username": dollarMatcher[1],
                    "text": dollarMatcher[2],
                    "type": "singleUser"
                };
                notify.emit('feedbackResponse', notifObj);
            })
            res.json({"status": "ok"});
        } else if (msg != "Come on! Who will do the mention? Stupid.") {
            res.json({"text": "Baklol ho ka. mention karo!"});
        } else {
            res.json({"status": "ok"});
        }
    }
})
