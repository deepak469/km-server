var express = require('express');
var path = require("path");
var bodyParser = require('body-parser');
var saml = require('express-saml2');
var session = require('client-sessions');
var cluster = require('cluster');
var winston = require('winston');
require('winston-daily-rotate-file');
var helmet = require('helmet');
var request = require("request");
var https = require('https');
var fs = require('fs');
var app = express();
var CryptoJS = require("crypto-js");
var moment = require("moment-timezone");

var env = 'stage';
var config = require('./environment.json')[env];
//var envType = process.argv[4] || "INT"; // To decide on which SSL certificate to use for SSL port


var port = 8888;

//Client sessions test
app.use(session({
    cookieName: 'session',
    secret: config.cookieSecret,
    duration: 30 * 60 * 1000, // in milliseconds
    activeDuration: 5 * 60 * 1000, // in milliseconds
    cookie: {
      path: '/', // cookie will only be sent to requests under '/'
      maxAge: null, // duration of the cookie in milliseconds, defaults to duration above
      ephemeral: true, // when true, cookie expires when the browser closes
      httpOnly: true, // when true, cookie is not accessible from javascript
      secure: false, // when true, cookie will only be sent over SSL.
      proxySecure: false //set active when ready for https
    }
  }));
  app.set('trust proxy', true);
  app.use(helmet());
  app.use(bodyParser.json({limit : '25mb'}));
  app.use(bodyParser.urlencoded({ extended: false },{limit : '25mb'}));

  
app.use("/", express.static(__dirname + '/app'));

// SAML Processing of Ping Federation
var ServiceProvider = saml.ServiceProvider;
var IdentityProvider = saml.IdentityProvider;

var spFileName = config.spfile;
var idpFileName = config.idpfile;

var sp = ServiceProvider(__dirname + spFileName);
var idp = IdentityProvider(__dirname + idpFileName);

app.get("/km/getUserData", function (req, res) {
    console.info('session user data '+req.session.userData);
    if (req.session === undefined || req.session.userData === undefined || req.session.userData.userId === '') {
      console.info('No userdata set already to return');
      res.redirect(config.pingIDPUrl);
      res.end();
    } else {
      console.info('Returning data from session...' + JSON.stringify(req.session.userData));
      res.json(JSON.stringify(req.session.userData));
    }
  });


app.get("/login", function(req, res){
    if (req.session === undefined || req.session.userData === undefined || req.session.userData.userId === '') {
        console.info('/km login redirecting to W3 sso saml...');
        res.redirect(config.pingIDPUrl);
        res.end();
      }else{
        res.sendFile(__dirname + '/app/index.html');
      }
});


app.get("/test", function(req, res){
    var userData = {
        userId: 'test@test.com',
        firstName: 'fTest',
        lastName: 'lTest',
        fullName: 'fName',
        emailAddress: 'email'
    }
    req.session.userData = userData;
    res.sendFile(__dirname + '/app/index.html');
});

app.post("/login", function(req, res){
    console.info("inside login post:");
      console.info("before sp");
      sp.parseLoginResponse(idp, 'post', req, function (parseResult) {
        // Set the values from Ping Federation after parsed
        console.log("parseResult");
        console.log(parseResult);
        var userData = {
            userId: parseResult.extract.attribute.uid,
            firstName: parseResult.extract.attribute.firstName,
            lastName: parseResult.extract.attribute.lastName,
            fullName: parseResult.extract.attribute.cn,
            emailAddress: parseResult.extract.attribute.emailaddress
        }
        req.session.userData = userData;
        console.info('KM W3 sso user info ' + JSON.stringify(req.session.userData));
      });      

    res.sendFile(__dirname + '/app/index.html');
});

app.listen(port, function(){
    console.log('server started on port'+ port)
})