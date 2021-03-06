var express = require('express');
var app = express();
var reduxpress = require('../libs');
var port = process.env.PORT || 8100;
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var TestModel = require('./test.model');

mongoose.connect('mongodb://localhost/myapp', {}, function (err) {
    if (err) {
        console.log('Error connecting to database', err);
    } else {
        console.log('Connected to database');
    }
});


reduxpress.registerFilter('testFilter', function (redux, next) {
    redux.currentUser.name = 'TEST_USER_1';
    console.log('From Filter');
    next();
}, 'postValidation');


reduxpress.registerFilter('successFilter', function (data, next) {
    console.log('Data FROM FILTER', data);
    delete data.name;
    next();
}, 'preSendSuccess');


reduxpress.setOptions({
    saveTrace: true,
    debug: true,
    secret: 'SECRET_WHICH_SHOULD_BE_A_SECRET',
    extendIpData: true,
    errors: {
        437: 'This error will be sent. Handle it carefully. Its hot!!'
    },
    auth: {
        external: false
    },
    // authCallback: function (userData) {
    //     return new Promise(function (resolve, reject) {
    //         userData._id = 'adsad';
    //         resolve(userData);
    //     });
    // },
    onError: function (error, reduxInstance) {
        console.log('Error', error, reduxInstance);
    }
});

app.use(reduxpress.mount);
app.use(bodyParser.urlencoded({extended: false}));

// parse application/json
app.use(bodyParser.json());

app.get('/', function (req, res) {
    var redux = req.redux;
    redux.sendError(res, redux.generateError(437));
});


app.get('/raw', function (req, res) {
    var redux = req.redux;
    redux.sendJSON(res, {data: 'data'});
});

app.post('/attachData', function (req, res) {
    var redux = req.redux;

    redux
        .attachData([
            {path: 'ipAddress', data: '*model.ipAddress'},
            {path: 'method', data: '*model.method'}
        ])
        .attachData('cachedUser', '*currentUser')
        .attachData('version', '1.2.3')
        .bodyValidator(req, ['ipAddress', '^method', '^cachedUser', 'version'], 'body')
        .then(function (result) {
            redux.sendSuccess(res, result, 'Users');
        })
        .catch(function (err) {
            redux.sendError(res, err);
        })
});

app.post('/', function (req, res) {
    var redux = req.redux;
    var params = ["sso", "^email", "firstname", "phone"];

    redux.log({a: 'b'});
    redux.log([{a: 'b'}, {a: 'c'}, {a: 'd'}], 'data');
    redux.bodyValidator(req, params)
        .then(function (result) {
            redux.sendSuccess(res, result, 'body')
        })
        .catch(function (err) {
            redux.err(err);
            redux.printTrace();
            redux.sendError(res, err);
        })
});

app.get('/testAuthCallback', function (req, res) {
    var redux = req.redux;

    redux.generateToken({name: 'TEST USER'}, 300, 300, 'seconds')
        .then(function (token) {
            req.headers['x-access-token'] = token['x_access_token'];
            return redux.tokenValidator(req)
        })
        .then(function (data) {
            console.log(redux.currentUser);
            redux.sendSuccess(res, data);
        })
        .catch(function (err) {
            console.error(err);
            redux.sendError(res, err);
        });
});

app.get('/getToken', function (req, res) {
    var redux = req.redux;


    redux.generateToken({name: 'TEST USER'}, 24000, 300, 'seconds')
        .then(function (value) {
            redux.sendSuccess(res, value, 'token')
        })
        .catch(function (reason) {
            redux.sendError(res, reason)
        })
});

app.get('/verifyToken/:token', function (req, res) {
    var redux = req.redux;

    redux
        .filter('testFilter')
        .filter('successFilter')
        .paramsValidator(req, ['token'])
        .then(function (result) {
            return redux.tokenValidator(req, result.token);
        })
        .then(function (value) {
            console.log(value)
            redux.sendSuccess(res, value, 'tokenResult')
        })
        .catch(function (reason) {
            redux.sendError(res, reason)
        })
});


app.listen(port, function () {
        console.log('Example app listening on port ' + port + '!')
    }
);

module.exports = app;
