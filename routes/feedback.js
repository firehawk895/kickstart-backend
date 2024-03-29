var express = require('express');
var router = express.Router();

var passport = require('passport');
var request = require('request');

var multer = require('multer');

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

/**
 * Register a listener for a user
 */
userRef.on("child_added", function (snapshot) {
    var username = snapshot.key()
    var displayName = snapshot.valueOf("displayName")
    
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
             * The Message from Kickstart, or the slack channel
             * should not be resent back to the channel
             * */
            if (messageObj.displayName != "Kickstart") {
                console.log("time to post")
                request.post(config.newSlack.feedbackHook, {
                    body: JSON.stringify({text: "*$" + username + "(" + displayName + ") : " + messageObj.text + "*"})
                })
            }
        }
    })
})

router.post('/', function (req, res) {
    var messageFromSlack = req.body.text
    console.log(messageFromSlack)
    var alreadyPostedInSlack = messageFromSlack.match(/^\*/);
    console.log(alreadyPostedInSlack)

    if (!alreadyPostedInSlack) {
        console.log("accepted")
        var dollarMatcher = messageFromSlack.match(/\$([a-zA-Z0-9_-]+)\:(.*)/);

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
                displayName: "Kickstart",
                text: dollarMatcher[2],
                timestamp: time
            }

            thisUsersRef.push().set(messageObj, function (error) {
                // EventSystem.feedback(username, messageFromSlack)
                // var notifObj = {
                //     "username": dollarMatcher[1],
                //     "text": dollarMatcher[2],
                //     "type": "singleUser"
                // };
                // notify.emit('feedbackResponse', notifObj);
            })
            res.json({"status": "ok"});
        }
        else if (msg != "Come on! Who will do the mention? Stupid.") {
            res.json({"text": "Baklol ho ka. mention karo!"});
        } else {
            res.json({"status": "ok"});
        }
    }
})

//slack url working
router.get('/test', multer(), function (req, res) {
    console.log("slack hook")
    request.post(config.newSlack.feedbackHook, {
        body: JSON.stringify({text: "test slack hook"})
    })
})

//firebase to slack test working
// router.post('/test', function (req, res) {
//     console.log("what")
//     myFirebaseRef = new Firebase(config.firebase.url + "/FeedbackUpdated/7b9e93742e133d97", config.firebase.secret);
//     var newPostRef = myFirebaseRef.push();
//     var now = new Date().getTime()
//     newPostRef.set({
//         displayName: "Batman",
//         text: "Announcing COBOL, a New Programming Language",
//         timestamp: now
//     });
// })

module.exports = router;