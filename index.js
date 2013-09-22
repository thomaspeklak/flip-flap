"use strict";

var levelup = require("levelup");
var db = levelup("./mydb");
var Q = require("q");
var keyRange = require("./key-range");
var server = require("./server");
var qGet = Q.denodeify(db.get.bind(db));

function getNonExistingKeys(prefix, cb) {
    var keys = keyRange(prefix);
    var existingKeys = [];
    Q.allSettled(keys.map(function (key) {
        return qGet(key);
    })).then(function (data)  {
        for (var i = 0; i < keys.length; i++) {
            if (data[i].state !== "fulfilled") existingKeys.push(keys[i]);
        }
        cb(existingKeys);
    });
}

function startUp(prefix, keys) {
    keys.sort(function () {
        return Math.random() - 0.5;
    });
    server(prefix, keys, db).listen(process.argv[2] || 3000);
}

db.get("!!prefix", function (err, prefix) {
    if (err && err.name == "NotFoundError") {
        prefix = "";
    } else if (err) {
        throw err;
    }

    getNonExistingKeys(prefix, function (keys) {
        startUp(prefix, keys);
    });
});
