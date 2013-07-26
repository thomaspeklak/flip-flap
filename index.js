"use strict";

var http    = require("http");
var levelup = require('levelup');
var db      = levelup('./mydb');
var Q       = require("q");
var fs      = require("fs");

var dbGet = Q.nbind(db.get, db);
var dbBatch = Q.nbind(db.batch, db);

var lastKey;

var keyPrefix = function (key) {
    return key.replace(/\..*/, '');
};

db.createKeyStream({
    start: "zzzzzzzz",
    end: "a",
    limit: 1
})
    .on('data', function (key) {
        lastKey = determineLastKey(key);
        startUp();
    })
    .on('end', function (data) {
        if (!lastKey) {
            lastKey = "zz";
            startUp();
        };
    })
    .on("error", function (err) {
        console.error(err);
        process.exit();
    });

var startUp = function () {
    http.createServer(function (req, res) {
        console.dir(req);
        console.dir(req.url);
        if (req.method == "POST") {
            return req.pipe(shortenUrl()).pipe(res);
        }

        if (req.url == '/') {
            res.writeHead("Content-type", "text/html");
            return fs.createReadStream('./index.html').pipe(res);
        }



    }).listen(3000);
    console.log("Listening on port 3000");
};
