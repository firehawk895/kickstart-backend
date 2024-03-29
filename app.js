var express = require('express');
var path = require('path');
var fs = require('fs')
var morgan = require('morgan');
var bodyParser = require('body-parser');
var cors = require('cors');
var request = require('request')
var expressValidator = require('express-validator')

var passport = require('passport');
var BearerStrategy = require('passport-http-bearer').Strategy;

var config = require('./config.js');
var customValidations = require('./validations/custom')
//----------------------------- Start Extended Validators --------------------------------------
var validator = require('validator');

//TODO : lets move to schema validation
//validator.extend('isValidLatLong', function (latOrLong) {
//    var regex = /^-?([1-8]?[1-9]|[1-9]0)\.{1}\d{1,6}/
//    return latOrLong.match(regex) ? true : false
//})
//
//validator.extend('isImage', function (mimetype) {
//    return mimetype.match(/^image/)
//})
////---------------------------- End Extended Validators -----------------------------------------
var oio = require('orchestrate');
oio.ApiEndPoint = config.db.region;
var db = oio(config.db.key);

var app = express();

function failure() {
    return false;
}

// create a write stream (in append mode)
var accessLogStream = fs.createWriteStream(__dirname + '/access.log', {flags: 'a'})
var corsOptions = {
    origin: '*',
    credentials: true
};

app.use(morgan(':remote-addr - [:date[clf]] - :method :url :status - :response-time ms', {stream: accessLogStream}))
app.use(morgan('dev'))
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(expressValidator({
    errorFormatter : function (param, msg, value) {
        return msg
    },
    customValidators : customValidations.customValidators
}));
app.use('/csv', express.static('csv'));

app.use(passport.initialize());

/**
 * update package.json to its latest version:
 * http://stackoverflow.com/a/22849716/1881812
 * npm install -g npm-check-updates
 * npm-check-updates -u
 * npm install
 */
/**
 * TODO : use schema validation
 */

/**
 * TODO : Its better to use JWT (JSON Web Token), migrate to json web token
 * so as to save these extra calls to the database
 * caching queries above the layer of orchestrate would be
 * the awesome way to go.
 */
passport.use(new BearerStrategy({},
    function (token, done) {
        //
        db.newGraphReader()
            .get()
            .from('tokens', token)
            .related('hasUser')
            .then(function (result) {
                var user = result.body;
                if (user.count === 1) {
                    return done(null, user);
                } else {
                    console.log("token has no user");
                    return done(null, false);
                }
                //console.log(result);
            })
            .fail(function (err) {
                console.log("Token invalid or expired");
                return done(null, false);
            });
    }
));

// view engine setup
//app.set('views', path.join(__dirname, 'views'));
//app.set('view engine', 'jade');
//app.use('/public', express.static(path.join(__dirname, 'public')));
var users = require('./routes/users')
var jobseekers = require('./routes/jobseekers')
var leaders = require('./routes/leaders')
var interviews = require('./routes/interviews')
var vacancies = require('./routes/vacancies')
var feedback = require('./routes/feedback')
var trades = require('./routes/trades')
var search = require('./routes/search')

app.use('/users', users);
app.use('/jobseekers', jobseekers);
app.use('/leaders', leaders);
app.use('/interviews', interviews);
app.use('/vacancies', vacancies);
app.use('/trades', trades);
app.use('/feedback', feedback);
app.use('/search', search);

app.all('/ping', function (req, res) {
    res.send('Pong')
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});


app.use(function (err, req, res, next) {
    console.log(err)
    res.status(err.status || 500);
    res.json({
        errors: [err.message],
        errorObj: err
    });
});

app.use(expressValidator());

module.exports = app;